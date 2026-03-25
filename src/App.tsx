import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  GAME_LEVELS,
  getLevelMetersForProgress,
  getConsecutivePlayDays,
  getResolvedLevelRecord,
  getUnlockedLevels,
  isSuperPlayer,
  isTeacherPlayer,
  isLevelUnlocked,
  LEVELS_TOTAL,
} from './euskeraLearning';
import type { GameLevel } from './euskeraLearning';
import type { MainScreen } from './components/app/appChrome';
import { AppRouterView } from './components/app/AppRouterView';
import { ConfirmModal } from './components/ConfirmModal';
import { AppShell } from './components/shared/AppShell';
import { AppTopBar } from './components/shared/AppTopBar';
import { BottomActionBar, BottomActionButton, BottomTabBar, BottomTabButton } from './components/shared/AppBottomDock';
import { useAppAuth } from './hooks/useAppAuth';
import { useDailyGame } from './hooks/useDailyGame';
import { useAppScreenModel } from './hooks/useAppScreenModel';
import { useSynonymBank } from './hooks/useSynonymBank';
import { useSynonymGame } from './hooks/useSynonymGame';
import { getAvatarForPlayer } from './lib/avatars';

const App = () => {
  const GRAMMAR_PROGRESS_KEY = 'grammar-map-progress-v1';
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [mainScreen, setMainScreen] = useState<MainScreen>('daily');
  const [isDailyExitWarningOpen, setIsDailyExitWarningOpen] = useState(false);
  const [studyLevel, setStudyLevel] = useState<GameLevel | null>(null);
  const [activeGrammarLessonSlug, setActiveGrammarLessonSlug] = useState<string | null>(null);
  const [grammarCompletedStops, setGrammarCompletedStops] = useState(0);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const readGrammarProgress = useCallback((playerId: string | null | undefined) => {
    if (typeof window === 'undefined' || !playerId) return 0;

    try {
      const raw = window.localStorage.getItem(`${GRAMMAR_PROGRESS_KEY}:${playerId}`);
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }, []);

  const writeGrammarProgress = useCallback((playerId: string | null | undefined, value: number) => {
    if (typeof window === 'undefined' || !playerId) return;

    try {
      window.localStorage.setItem(`${GRAMMAR_PROGRESS_KEY}:${playerId}`, String(Math.max(0, value)));
    } catch {
      // Ignore storage failures and keep in-memory progress.
    }
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setMainScreen('daily');
  }, []);

  const handleLogoutSuccess = useCallback(() => {
    setMainScreen('daily');
    setUiMessage(null);
  }, []);

  const {
    activePlayer,
    progress,
    setProgress,
    isSessionLoading,
    accessCode,
    setAccessCode,
    accessPassword,
    setAccessPassword,
    accessMessage,
    isPasswordVisible,
    togglePasswordVisibility,
    isSubmittingAccess,
    submitAccess,
    logoutPlayer,
  } = useAppAuth({
    onLoginSuccess: handleLoginSuccess,
    onLogoutSuccess: handleLogoutSuccess,
    setUiMessage,
  });

  const { bankState, refreshBank } = useSynonymBank(activePlayer?.userId, isSessionLoading);

  const {
    dayKey,
    gameWords,
    orthographyExercises,
    hieroglyphs,
    dailySession,
    dailyResult,
    ranking,
    weeklyRanking,
    weekHistory,
    myRankEntry,
    myWeekRankEntry,
    elapsedSeconds,
    isLoadingData,
    startDailyGame,
    startOrthographyPractice,
    answerDailyQuestion,
    solveDailyQuestion,
    advanceDailyQuestion,
    abandonDailyGame,
  } = useDailyGame({ activePlayer, synonymEntries: bankState.entries });

  const {
    quiz,
    summary,
    startLevel,
    leaveGame,
    answerCurrentQuestion,
    advanceQuiz,
  } = useSynonymGame({
    progress,
    setProgress,
    bankState,
    activePlayer,
    setUiMessage,
    setMainScreen,
  });

  const openMainScreen = useCallback((screen: MainScreen) => {
    setMainScreen(screen);
    shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollTop = useCallback(() => {
    shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goHome = useCallback(() => openMainScreen('daily'), [openMainScreen]);
  const goLearn = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('learn');
  }, [leaveGame, openMainScreen]);
  const goSynonyms = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('synonyms');
  }, [leaveGame, openMainScreen]);
  const goGrammar = useCallback(() => {
    if (!isSuperPlayer(activePlayer)) {
      return;
    }
    leaveGame();
    setStudyLevel(null);
    setActiveGrammarLessonSlug(null);
    openMainScreen('grammar');
  }, [activePlayer, leaveGame, openMainScreen]);
  const openGrammarLesson = useCallback((slug?: string | null) => {
    if (!isSuperPlayer(activePlayer)) {
      return;
    }
    leaveGame();
    setStudyLevel(null);
    setActiveGrammarLessonSlug(slug ?? null);
    openMainScreen('grammar-lesson');
  }, [activePlayer, leaveGame, openMainScreen]);
  const completeGrammarStop = useCallback(() => {
    if (!activePlayer?.userId) return;

    setGrammarCompletedStops((current) => {
      const next = Math.min(current + 1, 10);
      writeGrammarProgress(activePlayer.userId, next);
      return next;
    });
  }, [activePlayer?.userId, writeGrammarProgress]);
  const goVocabulary = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('vocabulary');
  }, [leaveGame, openMainScreen]);
  const goVerbs = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('verbs');
  }, [leaveGame, openMainScreen]);
  const goOrthographyPractice = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('learn');
    startOrthographyPractice();
  }, [leaveGame, openMainScreen, startOrthographyPractice]);
  const goStats = useCallback(() => openMainScreen('stats'), [openMainScreen]);
  const goAdmin = useCallback(() => openMainScreen('admin'), [openMainScreen]);
  const goProfile = useCallback(() => openMainScreen('profile'), [openMainScreen]);
  const handleLogout = logoutPlayer;
  const handleBackFromSynonymsGame = useCallback(() => {
    leaveGame();
    setMainScreen('synonyms');
    shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [leaveGame]);
  const handleTopBarBack = useCallback(() => {
    if (dailySession) {
      if (dailySession.mode === 'orthography_practice') {
        abandonDailyGame();
        return;
      }

      setIsDailyExitWarningOpen(true);
      return;
    }

    if (mainScreen === 'grammar-lesson') {
      setMainScreen('grammar');
      return;
    }

    handleBackFromSynonymsGame();
  }, [abandonDailyGame, dailySession, handleBackFromSynonymsGame, mainScreen]);
  const confirmDailyExit = useCallback(() => {
    setIsDailyExitWarningOpen(false);
    abandonDailyGame();
  }, [abandonDailyGame]);

  const resolvedLevelRecords = useMemo(
    () => GAME_LEVELS.map((level) => ({ level, record: getResolvedLevelRecord(progress, bankState.entries, level) })),
    [progress, bankState.entries]
  );
  const completedLevels = useMemo(
    () => resolvedLevelRecords.filter((item) => item.record?.isCompleted).length,
    [resolvedLevelRecords]
  );
  const unlockedLevels = useMemo(
    () => getUnlockedLevels(progress, bankState.entries),
    [progress, bankState.entries]
  );
  const isDemoMode = useMemo(() => bankState.message.toLowerCase().includes('demo'), [bankState.message]);
  const currentQuestion = quiz ? quiz.questions[quiz.currentIndex] : null;
  const currentAnswer = quiz ? (quiz.answers[quiz.currentIndex] ?? null) : null;
  const currentCorrectCount = quiz ? quiz.answers.filter((answer) => answer.isCorrect).length : 0;
  const currentSessionMeters = quiz ? getLevelMetersForProgress(quiz.level, currentCorrectCount, quiz.levelTotalQuestions) : 0;
  const quizAdvanceLabel = quiz ? (quiz.currentIndex === quiz.questions.length - 1 ? 'Amaitu' : 'Hurrengoa') : 'Hurrengoa';
  const quizProgress = quiz ? `${quiz.currentIndex + 1}/${quiz.questions.length}` : null;
  const currentTargetLevel = unlockedLevels.at(-1)?.index ?? 1;
  const canStartDailyGame = bankState.entries.length >= 5 && gameWords.length >= 3 && orthographyExercises.length >= 2 && hieroglyphs.length >= 2;
  const dailySessionProgress = dailySession ? `${dailySession.currentIndex + 1}/${dailySession.questions.length}` : null;
  const dailyElapsedLabel = dailySession
    ? (() => {
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;
      })()
    : null;
  const consecutivePlayDays = getConsecutivePlayDays(progress);
  const streakTone =
    consecutivePlayDays >= 7
      ? 'streak-4'
      : consecutivePlayDays >= 5
        ? 'streak-3'
        : consecutivePlayDays >= 3
          ? 'streak-2'
          : consecutivePlayDays >= 1
            ? 'streak-1'
            : 'streak-0';
  const homeNotice = uiMessage ?? (isDemoMode ? 'Demoko hitzak erabiltzen ari dira.' : null);
  const summaryErrors = useMemo(
    () => (summary ? summary.answers.filter((answer) => !answer.isCorrect) : []),
    [summary]
  );
  const nextLevel = summary && summary.level.index < LEVELS_TOTAL ? GAME_LEVELS[summary.level.index] : null;
  const nextLevelUnlocked = nextLevel ? isLevelUnlocked(progress, nextLevel.index, bankState.entries) : false;
  const isTeacher = isTeacherPlayer(activePlayer);
  const isSuperUser = isSuperPlayer(activePlayer);
  const topBarAvatar = useMemo(() => (activePlayer ? getAvatarForPlayer(activePlayer) : null), [activePlayer]);

  useEffect(() => {
    if (!isSuperUser && (mainScreen === 'grammar' || mainScreen === 'grammar-lesson')) {
      setMainScreen('learn');
    }
  }, [isSuperUser, mainScreen]);

  useEffect(() => {
    if (!activePlayer?.userId) {
      setGrammarCompletedStops(0);
      return;
    }

    setGrammarCompletedStops(readGrammarProgress(activePlayer.userId));
  }, [activePlayer?.userId, readGrammarProgress]);

  const screenModel = useAppScreenModel({
    activePlayer,
    mainScreen,
    isSessionLoading,
    dailySessionProgress,
    dailyElapsed: dailyElapsedLabel,
    quizProgress,
    accessCode,
    setAccessCode,
    accessPassword,
    setAccessPassword,
    accessMessage,
    isPasswordVisible,
    togglePasswordVisibility,
    isSubmittingAccess,
    submitAccess,
    dayKey,
    dailySession,
    dailyResult,
    canStartDailyGame,
    ranking,
    weeklyRanking,
    weekHistory,
    myRankEntry,
    myWeekRankEntry,
    elapsedSeconds,
    isLoadingData,
    bankState,
    progress,
    currentTargetLevel,
    homeNotice,
    isDemoMode,
    uiMessage,
    isTeacher,
    isSuperUser,
    activeGrammarLessonSlug,
    grammarCompletedStops,
    quiz,
    currentQuestion,
    currentAnswer,
    quizAdvanceLabel,
    summary,
    summaryErrors,
    completedLevels,
    totalLevels: LEVELS_TOTAL,
    consecutivePlayDays,
    streakTone,
    currentSessionMeters,
    nextLevel,
    nextLevelUnlocked,
      startDailyGame,
      startOrthographyPractice: goOrthographyPractice,
      answerDailyQuestion,
    solveDailyQuestion,
    advanceDailyQuestion,
    startLevel,
    refreshBank,
    scrollTop,
    logoutPlayer: handleLogout,
    answerCurrentQuestion,
    advanceQuiz,
    goHome,
    goLearn,
    goSynonyms,
    goGrammar,
    openGrammarLesson,
    completeGrammarStop,
    goVocabulary,
    goVerbs,
    goStats,
    goAdmin,
    goProfile,
  });
  const bottomBarMode: 'tabs' | 'actions' | null =
    activePlayer
      ? screenModel.dock.actions.length > 0
        ? 'actions'
        : screenModel.dock.tabs.length > 0
          ? 'tabs'
          : null
      : null;

  return (
    <div className="app-frame grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      {activePlayer && (
        <AppTopBar
          title={screenModel.topBar.title}
          subtitle={screenModel.topBar.subtitle}
          showBackButton={screenModel.topBar.showBackButton}
          onBack={handleTopBarBack}
          metric={screenModel.topBar.metric}
          secondaryMetric={screenModel.topBar.secondaryMetric}
          backIcon={<ChevronLeft />}
          avatarSrc={topBarAvatar?.src ?? null}
          avatarAlt={topBarAvatar?.label}
        />
      )}

      <AppShell shellRef={shellRef} isLocked={Boolean(quiz || dailySession)} bottomBarMode={bottomBarMode}>
        <AppRouterView
          isSessionLoading={screenModel.isSessionLoading}
          activePlayer={activePlayer}
          access={screenModel.access}
          mainScreen={mainScreen}
          main={screenModel.main}
          dailyGame={screenModel.dailyGame}
          synonymGame={screenModel.synonymGame}
          studyLevel={studyLevel}
          onStudyLevel={setStudyLevel}
          onCloseStudy={() => setStudyLevel(null)}
        />
      </AppShell>

      {bottomBarMode === 'tabs' ? (
        <BottomTabBar>
          {screenModel.dock.tabs.map((item) => {
            const Icon = item.icon;
            return (
              <span key={item.id} className="contents">
                <BottomTabButton
                  label={item.label}
                  icon={<Icon />}
                  onClick={() => screenModel.dock.onItemClick(item.action)}
                  active={item.active}
                />
              </span>
            );
          })}
        </BottomTabBar>
      ) : null}

      {bottomBarMode === 'actions' ? (
        <BottomActionBar>
          {screenModel.dock.actions.map((item) => {
            const Icon = item.icon;
            return (
              <span key={item.id} className="contents">
                <BottomActionButton
                  label={item.label}
                  icon={<Icon />}
                  onClick={() => screenModel.dock.onItemClick(item.action)}
                  variant={item.variant}
                />
              </span>
            );
          })}
        </BottomActionBar>
      ) : null}

      <ConfirmModal
        isOpen={isDailyExitWarningOpen}
        title="Kontuz"
        message="Orain irteten bazara, gaurko partida jokatutakotzat emango da eta ez duzu punturik lortuko."
        confirmLabel="Irten"
        cancelLabel="Jarraitu"
        onConfirm={confirmDailyExit}
        onCancel={() => setIsDailyExitWarningOpen(false)}
      />
    </div>
  );
};

export default App;
