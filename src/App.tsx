import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Mountain } from 'lucide-react';
import {
  GAME_LEVELS,
  getLevelMetersForProgress,
  getConsecutivePlayDays,
  getResolvedLevelRecord,
  getUnlockedLevels,
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
import { AppBottomDock, DockButton } from './components/shared/AppBottomDock';
import { useAppAuth } from './hooks/useAppAuth';
import { useDailyGame } from './hooks/useDailyGame';
import { useAppScreenModel } from './hooks/useAppScreenModel';
import { useSynonymBank } from './hooks/useSynonymBank';
import { useSynonymGame } from './hooks/useSynonymGame';
import { getAvatarForPlayer } from './lib/avatars';

const App = () => {
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [mainScreen, setMainScreen] = useState<MainScreen>('daily');
  const [isDailyExitWarningOpen, setIsDailyExitWarningOpen] = useState(false);
  const [studyLevel, setStudyLevel] = useState<GameLevel | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

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
  const goSynonyms = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('synonyms');
  }, [leaveGame, openMainScreen]);
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
      setIsDailyExitWarningOpen(true);
      return;
    }

    handleBackFromSynonymsGame();
  }, [dailySession, handleBackFromSynonymsGame]);
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
  const canStartDailyGame = bankState.entries.length >= 5 && gameWords.length >= 5 && hieroglyphs.length >= 2;
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
  const topBarAvatar = useMemo(() => (activePlayer ? getAvatarForPlayer(activePlayer) : null), [activePlayer]);
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
    goSynonyms,
    goStats,
    goAdmin,
    goProfile,
  });

  return (
    <div className="h-[100dvh] grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
      {activePlayer && (
        <AppTopBar
          title={screenModel.topBar.title}
          subtitle={screenModel.topBar.subtitle}
          completedLevels={completedLevels}
          totalLevels={LEVELS_TOTAL}
          showBackButton={screenModel.topBar.showBackButton}
          onBack={handleTopBarBack}
          metric={screenModel.topBar.metric}
          secondaryMetric={screenModel.topBar.secondaryMetric}
          backIcon={<ChevronLeft />}
          progressIcon={<Mountain />}
          avatarSrc={topBarAvatar?.src ?? null}
          avatarAlt={topBarAvatar?.label}
        />
      )}

      <AppShell shellRef={shellRef} isLocked={Boolean(quiz || dailySession)}>
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

      {activePlayer && screenModel.dock.items.length > 0 && (
        <AppBottomDock>
          {screenModel.dock.items.map((item) => {
            const Icon = item.icon;
            return (
              <span key={item.id} className="contents">
                <DockButton
                  label={item.label}
                  icon={<Icon />}
                  onClick={() => screenModel.dock.onItemClick(item.action)}
                  active={item.active}
                  tone={item.tone}
                  wide={item.wide}
                />
              </span>
            );
          })}
        </AppBottomDock>
      )}

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
