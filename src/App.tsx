import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  CheckCircle2,
  ChevronLeft,
  CirclePlay,
  CircleUserRound,
  Flame,
  House,
  Mountain,
  RefreshCw,
  Shield,
  Trophy,
} from 'lucide-react';
import {
  accessPlayer,
  buildLevelChallenge,
  createInitialProgress,
  GAME_LEVELS,
  getLevelMetersForProgress,
  getConsecutivePlayDays,
  getResolvedLevelRecord,
  getLevelUnlockTargetCount,
  getUnlockedLevels,
  isTeacherPlayer,
  isLevelUnlocked,
  LEVELS_TOTAL,
  loadPlayerSessionState,
  loadSynonymBank,
  recordLevelResult,
  savePlayerProgress,
  signOutPlayer,
} from './euskeraLearning';
import type { GameLevel, GameProgress, PlayerIdentity } from './euskeraLearning';
import type { ActiveQuiz, BankState, LevelSummary, SessionAnswer } from './appTypes';
import { formatMeters, formatPercentage } from './formatters';
import { AccessScreen } from './panels/AccessScreen';
const AdminPanel = lazy(() => import('./panels/AdminPanel'));
import { DailyHomeView } from './panels/DailyHomeView';
import { useDailyGame } from './hooks/useDailyGame';

type MainScreen = 'daily' | 'synonyms' | 'stats' | 'profile' | 'admin';

const initialBankState: BankState = {
  isLoading: true,
  isReady: false,
  entries: [],
  message: 'Supabasera konektatzen...',
};

const Page = ({ children, pageKey }: { children: ReactNode; pageKey: string }) => (
  <motion.section
    key={pageKey}
    initial={{ opacity: 0, y: 16, scale: 0.985 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -16, scale: 0.985 }}
    transition={{ duration: 0.24, ease: 'easeOut' }}
    className="page-shell"
  >
    {children}
  </motion.section>
);

const lazyNamed = <TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  key: keyof TModule
) => lazy(async () => ({ default: (await loader())[key] as never }));

const DailyGameRunner = lazyNamed(() => import('./panels/DailyGameRunner'), 'DailyGameRunner');
const LevelsView = lazyNamed(() => import('./panels/LevelsView'), 'LevelsView');
const ProfileView = lazyNamed(() => import('./panels/ProfileView'), 'ProfileView');
const QuizView = lazyNamed(() => import('./panels/QuizView'), 'QuizView');
const StatsView = lazyNamed(() => import('./panels/StatsView'), 'StatsView');
const SummaryView = lazyNamed(() => import('./panels/SummaryView'), 'SummaryView');

const DockButton = ({
  label,
  icon,
  onClick,
  disabled = false,
  tone = 'neutral',
  wide = false,
  active = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'primary';
  wide?: boolean;
  active?: boolean;
}) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.94 }}
    className={clsx('dock-button', `dock-button-${tone}`, {
      'dock-button-wide': wide,
      'dock-button-active': active,
    })}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
  >
    <span className="dock-button-shell">
      <span className="dock-button-icon">{icon}</span>
      <span className="dock-button-label">{label}</span>
    </span>
  </motion.button>
);

const App = () => {
  const [activePlayer, setActivePlayer] = useState<PlayerIdentity | null>(null);
  const [progress, setProgress] = useState<GameProgress>(createInitialProgress());
  const [bankState, setBankState] = useState<BankState>(initialBankState);
  const [quiz, setQuiz] = useState<ActiveQuiz | null>(null);
  const [summary, setSummary] = useState<LevelSummary | null>(null);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [mainScreen, setMainScreen] = useState<MainScreen>('daily');
  const [accessCode, setAccessCode] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmittingAccess, setIsSubmittingAccess] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const {
    dayKey,
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
    advanceDailyQuestion,
    abandonDailyGame,
  } = useDailyGame({ activePlayer, synonymEntries: bankState.entries });

  const refreshBank = useCallback(async () => {
    setBankState((current) => ({
      ...current,
      isLoading: true,
      message: current.entries.length > 0 ? current.message : 'Supabasera konektatzen...',
    }));

    const result = await loadSynonymBank();

    setBankState({
      isLoading: false,
      isReady: result.ok,
      entries: result.entries,
      message: result.message,
    });
  }, []);

  useEffect(() => {
    void refreshBank();
  }, [refreshBank]);

  // Intentionally tracks only userId — re-fetch bank on player switch, not on every render
  useEffect(() => {
    if (!activePlayer) return;
    void refreshBank();
  }, [activePlayer?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const hydrateSession = async () => {
      setIsSessionLoading(true);
      const sessionState = await loadPlayerSessionState();
      setActivePlayer(sessionState.player);
      setProgress(sessionState.progress);
      setUiMessage(sessionState.message);
      setMainScreen('daily');
      setIsSessionLoading(false);
    };

    void hydrateSession();
  }, []);

  const startLevel = useCallback((level: GameLevel) => {
    if (!isLevelUnlocked(progress, level.index, bankState.entries)) return;

    const levelRecord = getResolvedLevelRecord(progress, bankState.entries, level);
    const result = buildLevelChallenge(bankState.entries, level, levelRecord);
    if (!result.ok) {
      setUiMessage(result.message);
      return;
    }

    setUiMessage(null);
    setSummary(null);
    setMainScreen('daily');
    setQuiz({
      level,
      levelTotalQuestions: result.totalAvailableQuestions,
      questions: result.questions.map((question) => ({
        id: question.id,
        word: question.word,
        correctAnswer: question.correctAnswer,
        options: question.options,
      })),
      currentIndex: 0,
      answers: [],
    });
  }, [progress, bankState.entries]);

  const leaveGame = useCallback(() => {
    setQuiz(null);
    setSummary(null);
  }, []);

  const answerCurrentQuestion = useCallback((selectedAnswer: string) => {
    setQuiz((current) => {
      if (!current) return current;
      if (current.answers[current.currentIndex]) return current;

      const question = current.questions[current.currentIndex];
      const nextAnswer: SessionAnswer = {
        questionId: question.id,
        word: question.word,
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: selectedAnswer === question.correctAnswer,
      };

      return { ...current, answers: [...current.answers, nextAnswer] };
    });
  }, []);

  const finishLevel = useCallback(() => {
    if (!quiz) return;

    const correctCount = quiz.answers.filter((answer) => answer.isCorrect).length;
    const totalQuestions = quiz.questions.length;
    const sessionPercentage = Math.round((correctCount / totalQuestions) * 100);
    const correctQuestionIds = quiz.answers.filter((a) => a.isCorrect).map((a) => a.questionId);
    const incorrectQuestionIds = quiz.answers.filter((a) => !a.isCorrect).map((a) => a.questionId);
    const nextProgress = recordLevelResult(
      progress,
      quiz.level,
      sessionPercentage,
      correctCount,
      totalQuestions,
      quiz.levelTotalQuestions,
      correctQuestionIds,
      incorrectQuestionIds
    );
    const nextRecord = getResolvedLevelRecord(nextProgress, bankState.entries, quiz.level);
    const progressPercentage = nextRecord?.bestScore ?? 0;
    const masteredCount = nextRecord?.bestCorrectCount ?? 0;
    const unlockTargetCount = getLevelUnlockTargetCount(quiz.levelTotalQuestions);

    setProgress(nextProgress);
    setSummary({
      level: quiz.level,
      answers: quiz.answers,
      correctCount,
      totalQuestions,
      percentage: sessionPercentage,
      progressPercentage,
      masteredCount,
      levelTotalQuestions: quiz.levelTotalQuestions,
      unlockTargetCount,
    });
    setQuiz(null);

    if (activePlayer) {
      void savePlayerProgress(activePlayer, nextProgress).then((result) => {
        if (!result.ok && result.message) setUiMessage(result.message);
      });
    }
  }, [quiz, progress, bankState.entries, activePlayer]);

  const advanceQuiz = useCallback(() => {
    if (!quiz) return;
    if (!quiz.answers[quiz.currentIndex]) return;

    if (quiz.currentIndex === quiz.questions.length - 1) {
      finishLevel();
      return;
    }

    setQuiz((current) => (current ? { ...current, currentIndex: current.currentIndex + 1 } : current));
  }, [quiz, finishLevel]);

  const submitAccess = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    setIsSubmittingAccess(true);
    let result: Awaited<ReturnType<typeof accessPlayer>>;
    try {
      result = await accessPlayer(accessCode, accessPassword);
    } finally {
      setIsSubmittingAccess(false);
    }

    if (!result.ok) {
      setAccessMessage(result.message);
      return;
    }

    setActivePlayer(result.player);
    setProgress(result.progress);
    await refreshBank();
    setQuiz(null);
    setSummary(null);
    setMainScreen('daily');
    setAccessCode('');
    setAccessPassword('');
    setAccessMessage(null);
    setIsPasswordVisible(false);
    setUiMessage(result.message);
  }, [accessCode, accessPassword, refreshBank]);

  const logoutPlayer = useCallback(async () => {
    await signOutPlayer();
    setActivePlayer(null);
    setProgress(createInitialProgress());
    setQuiz(null);
    setSummary(null);
    setMainScreen('daily');
    setUiMessage(null);
    setAccessMessage(null);
    setAccessPassword('');
    setIsPasswordVisible(false);
  }, []);

  const openMainScreen = useCallback((screen: MainScreen) => {
    setMainScreen(screen);
    shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollTop = useCallback(() => {
    shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goHome = useCallback(() => openMainScreen('daily'), [openMainScreen]);
  const goSynonyms = useCallback(() => openMainScreen('synonyms'), [openMainScreen]);
  const goStats = useCallback(() => openMainScreen('stats'), [openMainScreen]);
  const goAdmin = useCallback(() => openMainScreen('admin'), [openMainScreen]);
  const goProfile = useCallback(() => openMainScreen('profile'), [openMainScreen]);
  const togglePasswordVisibility = useCallback(() => setIsPasswordVisible((v) => !v), []);
  const handleLogout = useCallback(() => void logoutPlayer(), [logoutPlayer]);

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
  const currentTargetLevel = unlockedLevels.at(-1)?.index ?? 1;
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
  const summaryErrors = summary ? summary.answers.filter((answer) => !answer.isCorrect) : [];
  const nextLevel = summary && summary.level.index < LEVELS_TOTAL ? GAME_LEVELS[summary.level.index] : null;
  const nextLevelUnlocked = nextLevel ? isLevelUnlocked(progress, nextLevel.index, bankState.entries) : false;
  const isTeacher = isTeacherPlayer(activePlayer);
  const topBarTitle = activePlayer?.code ?? 'Elio';
  const topBarSubtitle = dailySession
    ? 'Eguneko jokoa'
    : quiz
      ? quiz.level.name
      : summary
        ? `${summary.level.name} emaitza`
        : mainScreen === 'admin'
          ? 'Kudeaketa'
          : mainScreen === 'synonyms'
            ? 'Sinonimoak'
            : null;

  return (
    <div className="app-root">
      {activePlayer && (
        <div className="app-fixed app-fixed-top">
          <div className="app-topbar">
            <div className="app-topbar-side">
              {dailySession && (
                <button className="app-topbar-button" type="button" onClick={abandonDailyGame}>
                  <ChevronLeft className="app-topbar-button-icon" />
                  <span>Itzuli</span>
                </button>
              )}

              {!dailySession && quiz && (
                <button className="app-topbar-button" type="button" onClick={leaveGame}>
                  <ChevronLeft className="app-topbar-button-icon" />
                  <span>Itzuli</span>
                </button>
              )}

              {!dailySession && !quiz && summary && (
                <button className="app-topbar-button" type="button" onClick={leaveGame}>
                  <ChevronLeft className="app-topbar-button-icon" />
                  <span>Itzuli</span>
                </button>
              )}

              {!dailySession && !quiz && !summary && (
                <div className="app-topbar-chip">
                  <Mountain className="app-topbar-chip-icon" />
                  <span>
                    {completedLevels}/{LEVELS_TOTAL}
                  </span>
                </div>
              )}
            </div>

            <div className="app-topbar-center">
              <strong>{topBarTitle}</strong>
              {topBarSubtitle && <span>{topBarSubtitle}</span>}
            </div>

            <div className="app-topbar-side app-topbar-side-end">
              {!dailySession && !quiz && !summary && (
                <div className={clsx('app-topbar-chip', 'app-topbar-chip-streak', `app-topbar-chip-${streakTone}`)}>
                  <Flame className="app-topbar-chip-icon" />
                  <span>{consecutivePlayDays} egun</span>
                </div>
              )}

              {!dailySession && quiz && (
                <div className="app-topbar-chip app-topbar-chip-success">
                  <Mountain className="app-topbar-chip-icon" />
                  <span>{formatMeters(currentSessionMeters)}</span>
                </div>
              )}

              {!dailySession && !quiz && summary && (
                <div className="app-topbar-chip app-topbar-chip-success">
                  <CheckCircle2 className="app-topbar-chip-icon" />
                  <span>{formatPercentage(summary.progressPercentage)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div ref={shellRef} className={clsx('app-shell', { 'app-shell-locked': Boolean(quiz) || Boolean(dailySession) })}>
        <div className="ambient-glow ambient-glow-a" />
        <div className="ambient-glow ambient-glow-b" />

        <AnimatePresence mode="wait">
          {isSessionLoading && (
            <Page pageKey="session-loading">
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className="access-view"
              >
                <div className="access-band">
                  <strong>Elio</strong>
                </div>
                <div className="access-card access-card-loading">
                  <div className="access-heading">
                    <h1>Saioa kargatzen</h1>
                  </div>
                </div>
              </motion.section>
            </Page>
          )}

          {!isSessionLoading && !activePlayer && (
            <Page pageKey="access">
              <AccessScreen
                accessCode={accessCode}
                accessPassword={accessPassword}
                accessMessage={accessMessage}
                isPasswordVisible={isPasswordVisible}
                isSubmittingAccess={isSubmittingAccess}
                onCodeChange={setAccessCode}
                onPasswordChange={setAccessPassword}
                onPasswordVisibilityToggle={togglePasswordVisibility}
                onSubmit={(e) => void submitAccess(e)}
              />
            </Page>
          )}

          {!isSessionLoading && activePlayer && !dailySession && !quiz && !summary && (
            <Page pageKey={`main-${mainScreen}`}>
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className={clsx('main-view', { 'main-view-home': mainScreen === 'daily' })}
              >
                {mainScreen === 'daily' && (
                  <DailyHomeView
                    dayKey={dayKey}
                    dailyResult={dailyResult}
                    weekHistory={weekHistory}
                    ranking={ranking}
                    weeklyRanking={weeklyRanking}
                    myRankEntry={myRankEntry}
                    myWeekRankEntry={myWeekRankEntry}
                    isLoadingData={isLoadingData}
                    canStartGame={bankState.entries.length > 0}
                    onStartGame={startDailyGame}
                    onGoSynonyms={goSynonyms}
                  />
                )}

                {mainScreen === 'synonyms' && (
                  <Suspense fallback={<div className="panel-loading-placeholder" />}>
                    <LevelsView
                      progress={progress}
                      entries={bankState.entries}
                      isLoading={bankState.isLoading}
                      isError={!bankState.isLoading && !bankState.isReady && bankState.entries.length === 0}
                      currentTargetLevel={currentTargetLevel}
                      onStartLevel={startLevel}
                      onRetry={refreshBank}
                    />
                  </Suspense>
                )}

                {mainScreen === 'stats' && (
                  <Suspense fallback={<div className="panel-loading-placeholder" />}>
                    <StatsView
                      progress={progress}
                      entries={bankState.entries}
                      currentTargetLevel={currentTargetLevel}
                      homeNotice={homeNotice}
                      isDemoMode={isDemoMode}
                      uiMessage={uiMessage}
                    />
                  </Suspense>
                )}

                {mainScreen === 'admin' && isTeacher && (
                  <Suspense fallback={<div className="admin-loading-placeholder" />}>
                    <AdminPanel
                      bankState={bankState}
                      activePlayer={activePlayer}
                      onScrollTop={scrollTop}
                      onRefreshBank={refreshBank}
                    />
                  </Suspense>
                )}

                {mainScreen === 'profile' && (
                  <Suspense fallback={<div className="panel-loading-placeholder" />}>
                    <ProfileView
                      activePlayer={activePlayer}
                      bankState={bankState}
                      weekHistory={weekHistory}
                      isLoadingData={isLoadingData}
                      onLogout={handleLogout}
                    />
                  </Suspense>
                )}
              </motion.section>
            </Page>
          )}

          {!isSessionLoading && activePlayer && dailySession && (
            <Page pageKey="daily-game">
              <Suspense fallback={<div className="panel-loading-placeholder panel-loading-placeholder-tall" />}>
                <DailyGameRunner
                  session={dailySession}
                  elapsedSeconds={elapsedSeconds}
                  onAnswer={answerDailyQuestion}
                  onAdvance={advanceDailyQuestion}
                />
              </Suspense>
            </Page>
          )}

          {!isSessionLoading && activePlayer && !dailySession && quiz && currentQuestion && (
            <Page pageKey={`quiz-${quiz.level.id}`}>
              <Suspense fallback={<div className="panel-loading-placeholder panel-loading-placeholder-tall" />}>
                <QuizView
                  quiz={quiz}
                  currentQuestion={currentQuestion}
                  currentAnswer={currentAnswer}
                  quizAdvanceLabel={quizAdvanceLabel}
                  onAnswer={answerCurrentQuestion}
                  onAdvance={advanceQuiz}
                />
              </Suspense>
            </Page>
          )}

          {!isSessionLoading && activePlayer && !dailySession && summary && !quiz && (
            <Page pageKey={`summary-${summary.level.id}`}>
              <Suspense fallback={<div className="panel-loading-placeholder panel-loading-placeholder-tall" />}>
                <SummaryView summary={summary} summaryErrors={summaryErrors} />
              </Suspense>
            </Page>
          )}
        </AnimatePresence>
      </div>

      {activePlayer && (
        <div className="app-fixed app-fixed-bottom">
          <nav className="app-dock" aria-label="Ekintza nagusiak">
            {!dailySession && !quiz && !summary && (
              <>
                <DockButton
                  label="Hasiera"
                  icon={<House className="dock-svg" />}
                  onClick={goHome}
                  active={mainScreen === 'daily'}
                />
                {isTeacher ? (
                  <>
                    <DockButton
                      label="Kudeaketa"
                      icon={<Shield className="dock-svg" />}
                      onClick={goAdmin}
                      active={mainScreen === 'admin'}
                    />
                    <DockButton
                      label="Profila"
                      icon={<CircleUserRound className="dock-svg" />}
                      onClick={goProfile}
                      active={mainScreen === 'profile'}
                    />
                  </>
                ) : (
                  <>
                    <DockButton
                      label="Sailkapen"
                      icon={<Trophy className="dock-svg" />}
                      onClick={goStats}
                      active={mainScreen === 'stats'}
                    />
                    <DockButton
                      label="Profila"
                      icon={<CircleUserRound className="dock-svg" />}
                      onClick={goProfile}
                      active={mainScreen === 'profile'}
                    />
                  </>
                )}
              </>
            )}

            {!dailySession && summary && (
              <>
                <DockButton label="Berriz" icon={<RefreshCw className="dock-svg" />} onClick={() => startLevel(summary.level)} />
                {nextLevel && nextLevelUnlocked && (
                  <DockButton
                    label="Hurrengoa"
                    icon={<CirclePlay className="dock-svg" />}
                    onClick={() => startLevel(nextLevel)}
                    tone="primary"
                    wide
                  />
                )}
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
};

export default App;
