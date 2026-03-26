import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  GAME_LEVELS,
  LEVELS_TOTAL,
} from './lib/constants';
import { isSuperPlayer, isTeacherPlayer } from './lib/auth';
import { getResolvedLevelRecord, getUnlockedLevels } from './lib/progress';
import { getLevelMetersForProgress, getConsecutivePlayDays } from './lib/stats';
import type { GameLevel } from './lib/types';
import { AppRouterView } from './components/app/AppRouterView';
import { ConfirmModal } from './components/ConfirmModal';
import { AppShell } from './components/shared/AppShell';
import { AppTopBar } from './components/shared/AppTopBar';
import { BottomActionBar, BottomActionButton, BottomTabBar, BottomTabButton } from './components/shared/AppBottomDock';
import { useAppAuth } from './hooks/useAppAuth';
import { useAppDock } from './hooks/useAppDock';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useDailyGame } from './hooks/useDailyGame';
import { useAppTopBar } from './hooks/useAppTopBar';
import { useSynonymBank } from './hooks/useSynonymBank';
import { useSynonymGame } from './hooks/useSynonymGame';
import { getAvatarForPlayer } from './lib/avatars';
import { readGrammarProgress } from './lib/grammarProgress';
import { useAppUiStore } from './stores/useAppUiStore';
import type { DailyHomeViewModel, ProfileViewModel, StatsViewModel } from './components/app/appScreenModelTypes';

const App = () => {
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const mainScreen = useAppUiStore((state) => state.mainScreen);
  const studyLevel = useAppUiStore((state) => state.studyLevel);
  const isDailyExitWarningOpen = useAppUiStore((state) => state.isDailyExitWarningOpen);
  const activeGrammarLessonSlug = useAppUiStore((state) => state.activeGrammarLessonSlug);
  const grammarCompletedStops = useAppUiStore((state) => state.grammarCompletedStops);
  const setMainScreen = useAppUiStore((state) => state.setMainScreen);
  const setStudyLevel = useAppUiStore((state) => state.setStudyLevel);
  const setDailyExitWarningOpen = useAppUiStore((state) => state.setDailyExitWarningOpen);
  const setActiveGrammarLessonSlug = useAppUiStore((state) => state.setActiveGrammarLessonSlug);
  const setGrammarCompletedStops = useAppUiStore((state) => state.setGrammarCompletedStops);
  const resetNavigationState = useAppUiStore((state) => state.resetNavigationState);

  const handleLoginSuccess = useCallback(() => {
    setMainScreen('daily');
    setStudyLevel(null);
    setActiveGrammarLessonSlug(null);
    setDailyExitWarningOpen(false);
  }, [setActiveGrammarLessonSlug, setDailyExitWarningOpen, setMainScreen, setStudyLevel]);

  const handleLogoutSuccess = useCallback(() => {
    resetNavigationState();
    setUiMessage(null);
  }, [resetNavigationState]);

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
    dailySynonymCount,
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
  } = useDailyGame({ activePlayer });

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
  const {
    scrollTop,
    goHome,
    goLearn,
    goSynonyms,
    goGrammar,
    openGrammarLesson,
    completeGrammarStop,
    goVocabulary,
    goTopics,
    goVerbs,
    goOrthographyPractice,
    goStats,
    goAdmin,
    goProfile,
    handleTopBarBack,
    confirmDailyExit,
  } = useAppNavigation({
    shellRef,
    activePlayer,
    dailySession,
    grammarCompletedStops,
    leaveGame,
    startOrthographyPractice,
    abandonDailyGame,
  });
  const handleLogout = logoutPlayer;

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
  const canStartDailyGame =
    dailySynonymCount >= 5 && gameWords.length >= 3 && orthographyExercises.length >= 2 && hieroglyphs.length >= 2;
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
  const homeNotice =
    uiMessage ??
    (!bankState.isLoading && !bankState.isReady
      ? bankState.message
      : isDemoMode
        ? 'Demoko hitzak erabiltzen ari dira.'
        : null);
  const summaryErrors = useMemo(
    () => (summary ? summary.answers.filter((answer) => !answer.isCorrect) : []),
    [summary]
  );
  const isTeacher = isTeacherPlayer(activePlayer);
  const isSuperUser = isSuperPlayer(activePlayer);
  const topBarAvatar = useMemo(() => (activePlayer ? getAvatarForPlayer(activePlayer) : null), [activePlayer]);

  useEffect(() => {
    if (!activePlayer?.userId) {
      setGrammarCompletedStops(0);
      return;
    }

    setGrammarCompletedStops(readGrammarProgress(activePlayer.userId));
  }, [activePlayer?.userId, setGrammarCompletedStops]);

  const topBar = useAppTopBar({
    playerCode: activePlayer?.code,
    mainScreen,
    dailySessionMode: dailySession?.mode ?? (dailySession ? 'daily' : null),
    dailySessionProgress,
    dailyElapsed: dailyElapsedLabel,
    quiz,
    quizProgress,
    summary,
    completedLevels,
    totalLevels: LEVELS_TOTAL,
    consecutivePlayDays,
    streakTone,
    currentSessionMeters,
  });

  const dock = useAppDock({
    isTeacher,
    mainScreen,
    dailySession: Boolean(dailySession),
    quiz,
    summary,
    onLearn: goLearn,
    onHome: goHome,
    onStats: goStats,
    onAdmin: goAdmin,
    onProfile: goProfile,
    onRetryLevel: () => {
      if (summary) startLevel(summary.level);
    },
  });

  const accessViewModel = useMemo(
    () => ({
      code: accessCode,
      password: accessPassword,
      message: accessMessage,
      isPasswordVisible,
      isSubmitting: isSubmittingAccess,
      onCodeChange: setAccessCode,
      onPasswordChange: setAccessPassword,
      onPasswordVisibilityToggle: togglePasswordVisibility,
      onSubmit: submitAccess,
    }),
    [
      accessCode,
      accessPassword,
      accessMessage,
      isPasswordVisible,
      isSubmittingAccess,
      setAccessCode,
      setAccessPassword,
      togglePasswordVisibility,
      submitAccess,
    ]
  );

  const mainViewModel = useMemo(
    () => ({
      bankState,
      progress,
      currentTargetLevel,
      isTeacher,
      isSuperUser,
      activeGrammarLessonSlug,
      grammarCompletedStops,
      onStartOrthographyPractice: goOrthographyPractice,
      onGoSynonyms: goSynonyms,
      onGoGrammar: goGrammar,
      onOpenGrammarLesson: openGrammarLesson,
      onCompleteGrammarStop: completeGrammarStop,
      onGoVocabulary: goVocabulary,
      onGoTopics: goTopics,
      onGoVerbs: goVerbs,
      onStartLevel: startLevel,
      onRefreshBank: refreshBank,
      onScrollTop: scrollTop,
      onLogout: handleLogout,
    }),
    [
      bankState,
      progress,
      currentTargetLevel,
      isTeacher,
      isSuperUser,
      activeGrammarLessonSlug,
      grammarCompletedStops,
      goOrthographyPractice,
      goSynonyms,
      goGrammar,
      openGrammarLesson,
      completeGrammarStop,
      goVocabulary,
      goTopics,
      goVerbs,
      startLevel,
      refreshBank,
      scrollTop,
      handleLogout,
    ]
  );

  const dailyHomeViewModel = useMemo<DailyHomeViewModel>(
    () => ({
      dayKey,
      dailyResult,
      weekHistory,
      ranking,
      weeklyRanking,
      myRankEntry,
      myWeekRankEntry,
      isLoadingData,
      canStartGame: canStartDailyGame,
      onStartGame: startDailyGame,
      onGoLearn: goLearn,
      onGoSynonyms: goSynonyms,
      onGoGrammar: goGrammar,
      onGoVocabulary: goVocabulary,
      onGoVerbs: goVerbs,
    }),
    [
      dayKey,
      dailyResult,
      weekHistory,
      ranking,
      weeklyRanking,
      myRankEntry,
      myWeekRankEntry,
      isLoadingData,
      canStartDailyGame,
      startDailyGame,
      goLearn,
      goSynonyms,
      goGrammar,
      goVocabulary,
      goVerbs,
    ]
  );

  const statsViewModel = useMemo<StatsViewModel>(
    () => ({
      progress,
      entries: bankState.entries,
      currentTargetLevel,
      homeNotice,
      isDemoMode,
      uiMessage,
    }),
    [progress, bankState.entries, currentTargetLevel, homeNotice, isDemoMode, uiMessage]
  );

  const profileViewModel = useMemo<ProfileViewModel>(
    () => ({
      weekHistory,
      isLoadingData,
      progress,
      entries: bankState.entries,
      onLogout: handleLogout,
    }),
    [weekHistory, isLoadingData, progress, bankState.entries, handleLogout]
  );

  const dailyGameViewModel = useMemo(
    () => ({
      session: dailySession,
      elapsedSeconds,
      onAnswer: answerDailyQuestion,
      onSolve: solveDailyQuestion,
      onAdvance: advanceDailyQuestion,
    }),
    [dailySession, elapsedSeconds, answerDailyQuestion, solveDailyQuestion, advanceDailyQuestion]
  );

  const synonymGameViewModel = useMemo(
    () => ({
      quiz,
      currentQuestion,
      currentAnswer,
      quizAdvanceLabel,
      summary,
      summaryErrors,
      onAnswer: answerCurrentQuestion,
      onAdvance: advanceQuiz,
    }),
    [quiz, currentQuestion, currentAnswer, quizAdvanceLabel, summary, summaryErrors, answerCurrentQuestion, advanceQuiz]
  );

  const bottomBarMode: 'tabs' | 'actions' | null =
    activePlayer
      ? dock.actions.length > 0
        ? 'actions'
        : dock.tabs.length > 0
          ? 'tabs'
          : null
      : null;

  return (
    <div className="app-frame grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      {activePlayer && (
        <AppTopBar
          title={topBar.title}
          subtitle={topBar.subtitle}
          showBackButton={topBar.showBackButton}
          onBack={handleTopBarBack}
          metric={topBar.metric}
          secondaryMetric={topBar.secondaryMetric}
          backIcon={<ChevronLeft />}
          avatarSrc={topBarAvatar?.src ?? null}
          avatarAlt={topBarAvatar?.label}
        />
      )}

      <AppShell shellRef={shellRef} isLocked={Boolean(quiz || dailySession)} bottomBarMode={bottomBarMode}>
        <AppRouterView
          isSessionLoading={isSessionLoading}
          activePlayer={activePlayer}
          access={accessViewModel}
          mainScreen={mainScreen}
          dailyHome={dailyHomeViewModel}
          stats={statsViewModel}
          profile={profileViewModel}
          main={mainViewModel}
          dailyGame={dailyGameViewModel}
          synonymGame={synonymGameViewModel}
          studyLevel={studyLevel}
          onStudyLevel={setStudyLevel}
          onCloseStudy={() => setStudyLevel(null)}
        />
      </AppShell>

      {bottomBarMode === 'tabs' ? (
        <BottomTabBar>
          {dock.tabs.map((item) => {
            const Icon = item.icon;
            return (
              <span key={item.id} className="contents">
                <BottomTabButton
                  label={item.label}
                  icon={<Icon />}
                  onClick={() => dock.onItemClick(item.action)}
                  active={item.active}
                />
              </span>
            );
          })}
        </BottomTabBar>
      ) : null}

      {bottomBarMode === 'actions' ? (
        <BottomActionBar>
          {dock.actions.map((item) => {
            const Icon = item.icon;
            return (
              <span key={item.id} className="contents">
                <BottomActionButton
                  label={item.label}
                  icon={<Icon />}
                  onClick={() => dock.onItemClick(item.action)}
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
        onCancel={() => setDailyExitWarningOpen(false)}
      />
    </div>
  );
};

export default App;
