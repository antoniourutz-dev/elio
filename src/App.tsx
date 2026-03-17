import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  BookOpen,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  CheckCircle2,
  ChevronLeft,
  CirclePlay,
  CircleUserRound,
  Flame,
  House,
  Lock,
  Mountain,
  PencilLine,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  ADMIN_PLAYER_CODE,
  accessPlayer,
  buildLevelChallenge,
  createPlayerByTeacher,
  createInitialProgress,
  createTeacherWord,
  deletePlayerByTeacher,
  GAME_LEVELS,
  getLevelMetersForProgress,
  getConsecutivePlayDays,
  getLevelQuestionCount,
  getResolvedLevelRecord,
  getLevelUnlockTargetCount,
  getTodayGamesPlayed,
  getUnlockedLevels,
  isTeacherPlayer,
  isLevelUnlocked,
  LEVELS_TOTAL,
  loadPlayerSessionState,
  loadSynonymBank,
  loadTeacherPlayers,
  recordLevelResult,
  resetPlayerProgressByTeacher,
  savePlayerProgress,
  setPlayerForcedUnlockLevels,
  signOutPlayer,
  updateTeacherPlayerAccess,
  updateTeacherWord,
} from './euskeraLearning';
import type { GameLevel, GameProgress, PlayerIdentity, SynonymEntry, TeacherPlayerOverview } from './euskeraLearning';

interface BankState {
  isLoading: boolean;
  isReady: boolean;
  entries: SynonymEntry[];
  message: string;
}

interface SessionAnswer {
  questionId: string;
  word: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

interface ActiveQuiz {
  level: GameLevel;
  levelTotalQuestions: number;
  questions: {
    id: string;
    word: string;
    correctAnswer: string;
    options: string[];
  }[];
  currentIndex: number;
  answers: SessionAnswer[];
}

interface LevelSummary {
  level: GameLevel;
  answers: SessionAnswer[];
  correctCount: number;
  totalQuestions: number;
  percentage: number;
  progressPercentage: number;
  masteredCount: number;
  levelTotalQuestions: number;
  unlockTargetCount: number;
}

type MainScreen = 'home' | 'stats' | 'profile' | 'admin';
type AdminSection = 'players' | 'words';
type AdminPlayersView = 'list' | 'detail' | 'create';

interface TeacherWordFormState {
  word: string;
  synonyms: string;
  levelOrder: number;
}

interface TeacherPlayerDraftState {
  playerCode: string;
  password: string;
}

const initialBankState: BankState = {
  isLoading: true,
  isReady: false,
  entries: [],
  message: 'Supabasera konektatzen...',
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
const emptyTeacherWordForm: TeacherWordFormState = {
  word: '',
  synonyms: '',
  levelOrder: 1,
};

const emptyTeacherPlayerDraft: TeacherPlayerDraftState = {
  playerCode: '',
  password: '',
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

const DockButton = ({
  label,
  icon,
  onClick,
  disabled = false,
  tone = 'neutral',
  wide = false,
  active = false,
  showLabel = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'primary';
  wide?: boolean;
  active?: boolean;
  showLabel?: boolean;
}) => {
  const isLabelVisible = active || showLabel;

  return (
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.97 }}
      className={clsx('dock-button', `dock-button-${tone}`, {
        'dock-button-wide': wide,
        'dock-button-active': active,
      })}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <motion.span layout className="dock-button-shell">
        <motion.span
          className="dock-button-icon"
          animate={{ y: isLabelVisible ? -1 : 0, scale: isLabelVisible ? 1.06 : 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {icon}
        </motion.span>
        <AnimatePresence initial={false}>
          {isLabelVisible && (
            <motion.span
              layout
              initial={{ opacity: 0, y: 4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="dock-button-label"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </motion.button>
  );
};

const SegmentBar = ({
  total,
  answers,
  currentIndex,
  filledCount,
}: {
  total: number;
  answers?: SessionAnswer[];
  currentIndex?: number;
  filledCount?: number;
}) => (
  <div className="segment-track" aria-hidden="true">
    {Array.from({ length: total }, (_, index) => {
      const answer = answers?.[index];
      const className = clsx('segment', {
        'segment-success': answer?.isCorrect || (typeof filledCount === 'number' && index < filledCount),
        'segment-error': answer && !answer.isCorrect,
        'segment-current': !answer && typeof currentIndex === 'number' && index === currentIndex,
      });

      return <span key={`segment-${index + 1}`} className={className} />;
    })}
  </div>
);

const formatAdminDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('eu-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

const formatPercentage = (value: number): string => `% ${Math.max(0, Math.round(value))}`;
const formatMeters = (value: number): string => `${Math.max(0, Math.round(value))} m`;
const formatMeterProgress = (currentMeters: number, totalMeters: number): string =>
  `${Math.max(0, Math.round(currentMeters))}/${Math.max(0, Math.round(totalMeters))} m`;

const App = () => {
  const [activePlayer, setActivePlayer] = useState<PlayerIdentity | null>(null);
  const [progress, setProgress] = useState<GameProgress>(createInitialProgress());
  const [bankState, setBankState] = useState<BankState>(initialBankState);
  const [quiz, setQuiz] = useState<ActiveQuiz | null>(null);
  const [summary, setSummary] = useState<LevelSummary | null>(null);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [mainScreen, setMainScreen] = useState<MainScreen>('home');
  const [accessCode, setAccessCode] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmittingAccess, setIsSubmittingAccess] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [adminSection, setAdminSection] = useState<AdminSection>('words');
  const [teacherPlayers, setTeacherPlayers] = useState<TeacherPlayerOverview[]>([]);
  const [isTeacherPlayersLoading, setIsTeacherPlayersLoading] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null);
  const [newPlayerCode, setNewPlayerCode] = useState('');
  const [newPlayerPassword, setNewPlayerPassword] = useState('');
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [adminPlayersView, setAdminPlayersView] = useState<AdminPlayersView>('list');
  const [selectedTeacherPlayerId, setSelectedTeacherPlayerId] = useState<string | null>(null);
  const [teacherPlayerDraft, setTeacherPlayerDraft] = useState<TeacherPlayerDraftState>(emptyTeacherPlayerDraft);
  const [isSavingTeacherPlayer, setIsSavingTeacherPlayer] = useState(false);
  const [isDeletingTeacherPlayer, setIsDeletingTeacherPlayer] = useState(false);
  const [isSavingPlayerUnlocks, setIsSavingPlayerUnlocks] = useState<string | null>(null);
  const [teacherWordForm, setTeacherWordForm] = useState<TeacherWordFormState>(emptyTeacherWordForm);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [teacherWordSearch, setTeacherWordSearch] = useState('');
  const [isSavingWord, setIsSavingWord] = useState(false);
  const [unlockDrafts, setUnlockDrafts] = useState<Record<string, number[]>>({});
  const shellRef = useRef<HTMLDivElement | null>(null);

  const refreshBank = async () => {
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
  };

  const refreshTeacherPlayers = async (entries: SynonymEntry[]) => {
    setIsTeacherPlayersLoading(true);
    const result = await loadTeacherPlayers(entries);
    setIsTeacherPlayersLoading(false);

    if (!result.ok) {
      setTeacherPlayers([]);
      setTeacherMessage(result.message);
      return;
    }

    setTeacherPlayers(result.players);
    setUnlockDrafts(
      result.players.reduce<Record<string, number[]>>((accumulator, player) => {
        accumulator[player.ownerId] = [...player.forcedUnlockLevels];
        return accumulator;
      }, {})
    );
  };

  useEffect(() => {
    void refreshBank();
  }, []);

  useEffect(() => {
    if (!activePlayer) return;
    void refreshBank();
  }, [activePlayer?.userId]);

  useEffect(() => {
    const hydrateSession = async () => {
      setIsSessionLoading(true);
      const sessionState = await loadPlayerSessionState();
      setActivePlayer(sessionState.player);
      setProgress(sessionState.progress);
      setUiMessage(sessionState.message);
      setMainScreen('home');
      setIsSessionLoading(false);
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    if (!activePlayer || !isTeacherPlayer(activePlayer)) {
      setTeacherPlayers([]);
      setUnlockDrafts({});
      return;
    }

    void refreshTeacherPlayers(bankState.entries);
  }, [activePlayer?.userId, bankState.entries]);

  useEffect(() => {
    if (!activePlayer || !isTeacherPlayer(activePlayer) || adminSection !== 'players') return;
    void refreshTeacherPlayers(bankState.entries);
  }, [activePlayer?.userId, adminSection]);

  useEffect(() => {
    if (!activePlayer || !isTeacherPlayer(activePlayer) || adminSection !== 'players') return;

    const handleFocus = () => {
      void refreshTeacherPlayers(bankState.entries);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activePlayer?.userId, adminSection, bankState.entries]);

  useEffect(() => {
    if (teacherPlayers.length === 0) {
      setSelectedTeacherPlayerId(null);
      setTeacherPlayerDraft(emptyTeacherPlayerDraft);
      setAdminPlayersView('list');
      return;
    }
  }, [selectedTeacherPlayerId, teacherPlayers]);

  const startLevel = (level: GameLevel) => {
    if (!isLevelUnlocked(progress, level.index, bankState.entries)) return;

    const levelRecord = getResolvedLevelRecord(progress, bankState.entries, level);
    const result = buildLevelChallenge(bankState.entries, level, levelRecord);
    if (!result.ok) {
      setUiMessage(result.message);
      return;
    }

    setUiMessage(null);
    setSummary(null);
    setMainScreen('home');
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
  };

  const leaveGame = () => {
    setQuiz(null);
    setSummary(null);
  };

  const answerCurrentQuestion = (selectedAnswer: string) => {
    if (!quiz) return;
    if (quiz.answers[quiz.currentIndex]) return;

    const question = quiz.questions[quiz.currentIndex];
    const nextAnswer: SessionAnswer = {
      questionId: question.id,
      word: question.word,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect: selectedAnswer === question.correctAnswer,
    };

    setQuiz((current) =>
      current
        ? {
            ...current,
            answers: [...current.answers, nextAnswer],
          }
        : current
    );
  };

  const finishLevel = () => {
    if (!quiz) return;

    const correctCount = quiz.answers.filter((answer) => answer.isCorrect).length;
    const totalQuestions = quiz.questions.length;
    const sessionPercentage = Math.round((correctCount / totalQuestions) * 100);
    const correctQuestionIds = quiz.answers.filter((answer) => answer.isCorrect).map((answer) => answer.questionId);
    const incorrectQuestionIds = quiz.answers.filter((answer) => !answer.isCorrect).map((answer) => answer.questionId);
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
        if (!result.ok && result.message) {
          setUiMessage(result.message);
        }
      });
    }
  };

  const advanceQuiz = () => {
    if (!quiz) return;
    if (!quiz.answers[quiz.currentIndex]) return;

    if (quiz.currentIndex === quiz.questions.length - 1) {
      finishLevel();
      return;
    }

    setQuiz((current) =>
      current
        ? {
            ...current,
            currentIndex: current.currentIndex + 1,
          }
        : current
    );
  };

  const resolvedLevelRecords = GAME_LEVELS.map((level) => ({
    level,
    record: getResolvedLevelRecord(progress, bankState.entries, level),
  }));
  const completedLevels = resolvedLevelRecords.filter((item) => item.record?.isCompleted).length;
  const unlockedLevels = getUnlockedLevels(progress, bankState.entries);
  const bestScore = resolvedLevelRecords.reduce((best, item) => Math.max(best, item.record?.bestScore ?? 0), 0);
  const isDemoMode = bankState.message.toLowerCase().includes('demo');
  const currentQuestion = quiz ? quiz.questions[quiz.currentIndex] : null;
  const currentAnswer = quiz ? quiz.answers[quiz.currentIndex] : null;
  const currentCorrectCount = quiz ? quiz.answers.filter((answer) => answer.isCorrect).length : 0;
  const currentSessionMeters = quiz ? getLevelMetersForProgress(quiz.level, currentCorrectCount, quiz.levelTotalQuestions) : 0;
  const quizAdvanceLabel = quiz ? (quiz.currentIndex === quiz.questions.length - 1 ? 'Amaitu' : 'Hurrengoa') : 'Hurrengoa';
  const currentTargetLevel = unlockedLevels.at(-1)?.index ?? 1;
  const unlockedLevelStats = unlockedLevels.map((level) => ({
    level,
    record: getResolvedLevelRecord(progress, bankState.entries, level),
    totalQuestions: getLevelQuestionCount(bankState.entries, level.index),
    isTarget: level.index === currentTargetLevel,
  }));
  const gamesPlayedToday = getTodayGamesPlayed(progress);
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
  const homeTargetLevel =
    GAME_LEVELS.find((level) => isLevelUnlocked(progress, level.index, bankState.entries) && !getResolvedLevelRecord(progress, bankState.entries, level)?.isCompleted) ??
    unlockedLevels.at(-1) ??
    GAME_LEVELS[0];
  const bankStatusLabel = bankState.isLoading
    ? 'Kargatzen...'
    : bankState.isReady
      ? `${bankState.entries.length} hitz prest`
      : 'Demoko hitzak';
  const teacherWordQuery = teacherWordSearch.trim().toLowerCase();
  const teacherWordResults = !teacherWordQuery || isDemoMode
    ? []
    : [...bankState.entries]
        .filter((entry) => (
          entry.word.toLowerCase().includes(teacherWordQuery)
          || entry.synonyms.some((synonym) => synonym.toLowerCase().includes(teacherWordQuery))
        ))
        .sort((left, right) => {
          const leftWord = left.word.toLowerCase();
          const rightWord = right.word.toLowerCase();
          const leftRank =
            leftWord === teacherWordQuery
              ? 0
              : leftWord.startsWith(teacherWordQuery)
                ? 1
                : left.synonyms.some((synonym) => synonym.toLowerCase() === teacherWordQuery)
                  ? 2
                  : 3;
          const rightRank =
            rightWord === teacherWordQuery
              ? 0
              : rightWord.startsWith(teacherWordQuery)
                ? 1
                : right.synonyms.some((synonym) => synonym.toLowerCase() === teacherWordQuery)
                  ? 2
                  : 3;

          if (leftRank !== rightRank) return leftRank - rightRank;

          const levelCompare = (left.levelOrder ?? 99) - (right.levelOrder ?? 99);
          if (levelCompare !== 0) return levelCompare;
          return left.word.localeCompare(right.word, 'eu');
        })
        .slice(0, 8);
  const selectedTeacherPlayer =
    teacherPlayers.find((player) => player.ownerId === selectedTeacherPlayerId)
    ?? teacherPlayers[0]
    ?? null;
  const selectedTeacherPlayerResolvedLevels = selectedTeacherPlayer
    ? GAME_LEVELS.map((level) => ({
        level,
        record: getResolvedLevelRecord(selectedTeacherPlayer.progress, bankState.entries, level),
      }))
    : [];
  const selectedTeacherPlayerLearnedWords = selectedTeacherPlayerResolvedLevels.reduce(
    (total, item) => total + (item.record?.bestCorrectCount ?? 0),
    0
  );
  const selectedTeacherPlayerAttemptedQuestions = selectedTeacherPlayerResolvedLevels.reduce(
    (total, item) => total + ((item.record?.attempts ?? 0) > 0 ? item.record?.totalQuestions ?? 0 : 0),
    0
  );
  const selectedTeacherPlayerAccuracy = selectedTeacherPlayerAttemptedQuestions > 0
    ? Math.round((selectedTeacherPlayerLearnedWords / selectedTeacherPlayerAttemptedQuestions) * 100)
    : 0;
  const selectedTeacherPlayerUnitStatus = selectedTeacherPlayer
    ? selectedTeacherPlayer.completedLevels > 0
      ? `${selectedTeacherPlayer.completedLevels} maila gaindituta`
      : `${selectedTeacherPlayer.currentLevelName} unean`
    : '';
  const teacherDirectMatch = !teacherWordQuery || isDemoMode
    ? null
    : teacherWordResults.find((entry) => (
      entry.word.toLowerCase() === teacherWordQuery
      || entry.synonyms.some((synonym) => synonym.toLowerCase() === teacherWordQuery)
    )) ?? null;

  useEffect(() => {
    if (adminSection !== 'words' || isDemoMode) {
      return;
    }

    const trimmedSearch = teacherWordSearch.trim();

    if (!trimmedSearch) {
      if (editingWordId || teacherWordForm.word || teacherWordForm.synonyms || teacherWordForm.levelOrder !== 1) {
        setEditingWordId(null);
        setTeacherWordForm(emptyTeacherWordForm);
      }
      return;
    }

    if (teacherDirectMatch) {
      const nextForm = {
        word: teacherDirectMatch.word,
        synonyms: teacherDirectMatch.synonyms.join(', '),
        levelOrder: teacherDirectMatch.levelOrder ?? 1,
      };
      const isSameForm =
        editingWordId === teacherDirectMatch.id
        && teacherWordForm.word === nextForm.word
        && teacherWordForm.synonyms === nextForm.synonyms
        && teacherWordForm.levelOrder === nextForm.levelOrder;

      if (!isSameForm) {
        setEditingWordId(teacherDirectMatch.id);
        setTeacherWordForm(nextForm);
      }
      return;
    }

    if (editingWordId !== null || teacherWordForm.word !== trimmedSearch) {
      setEditingWordId(null);
      setTeacherWordForm((current) => ({
        word: trimmedSearch,
        synonyms: current.word === trimmedSearch && editingWordId === null ? current.synonyms : '',
        levelOrder: current.levelOrder || 1,
      }));
    }
  }, [
    adminSection,
    editingWordId,
    isDemoMode,
    teacherDirectMatch,
    teacherWordForm.levelOrder,
    teacherWordForm.synonyms,
    teacherWordForm.word,
    teacherWordSearch,
  ]);

  const submitAccess = async (event?: FormEvent<HTMLFormElement>) => {
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
    setMainScreen('home');
    setAccessCode('');
    setAccessPassword('');
    setAccessMessage(null);
    setIsPasswordVisible(false);
    setUiMessage(result.message);
  };

  const logoutPlayer = async () => {
    await signOutPlayer();
    setActivePlayer(null);
    setProgress(createInitialProgress());
    setQuiz(null);
    setSummary(null);
    setMainScreen('home');
    setUiMessage(null);
    setAccessMessage(null);
    setTeacherMessage(null);
    setTeacherPlayers([]);
    setUnlockDrafts({});
    setAccessPassword('');
    setIsPasswordVisible(false);
  };

  const openMainScreen = (screen: MainScreen) => {
    setMainScreen(screen);
    shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startEditingWord = (entry: SynonymEntry) => {
    setEditingWordId(entry.id);
    setTeacherWordSearch(entry.word);
    setTeacherWordForm({
      word: entry.word,
      synonyms: entry.synonyms.join(', '),
      levelOrder: entry.levelOrder ?? 1,
    });
    setAdminSection('words');
    shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetTeacherWordForm = () => {
    setEditingWordId(null);
    setTeacherWordSearch('');
    setTeacherWordForm(emptyTeacherWordForm);
  };

  const submitTeacherWord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingWord(true);

    const result = editingWordId
      ? await updateTeacherWord(editingWordId, {
          word: teacherWordForm.word,
          synonyms: teacherWordForm.synonyms.split(','),
          levelOrder: teacherWordForm.levelOrder,
        })
      : await createTeacherWord({
          word: teacherWordForm.word,
          synonyms: teacherWordForm.synonyms.split(','),
          levelOrder: teacherWordForm.levelOrder,
        });

    setIsSavingWord(false);
    setTeacherMessage(result.message);

    if (!result.ok) {
      return;
    }

    await refreshBank();
    setTeacherWordSearch(teacherWordForm.word.trim());
  };

  const submitTeacherPlayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingPlayer(true);
    const result = await createPlayerByTeacher(newPlayerCode, newPlayerPassword);
    setIsCreatingPlayer(false);
    setTeacherMessage(result.message);

    if (!result.ok) {
      return;
    }

    setNewPlayerCode('');
    setNewPlayerPassword('');
    setAdminPlayersView('list');
    await refreshTeacherPlayers(bankState.entries);
  };

  const selectTeacherPlayer = (player: TeacherPlayerOverview) => {
    setSelectedTeacherPlayerId(player.ownerId);
    setTeacherPlayerDraft({
      playerCode: player.playerCode,
      password: '',
    });
    setAdminPlayersView('detail');
  };

  const saveTeacherPlayerAccessChanges = async (player: TeacherPlayerOverview) => {
    setIsSavingTeacherPlayer(true);
    const result = await updateTeacherPlayerAccess(player.ownerId, {
      playerCode: teacherPlayerDraft.playerCode,
      learnerName: teacherPlayerDraft.playerCode,
      password: teacherPlayerDraft.password,
    });
    setIsSavingTeacherPlayer(false);
    setTeacherMessage(result.message);

    if (result.ok) {
      await refreshTeacherPlayers(bankState.entries);
    }
  };

  const toggleForcedUnlockForPlayer = async (player: TeacherPlayerOverview, levelIndex: number) => {
    const currentLevels = unlockDrafts[player.ownerId] ?? player.forcedUnlockLevels;
    const nextLevels = currentLevels.includes(levelIndex)
      ? currentLevels.filter((value) => value !== levelIndex)
      : [...currentLevels, levelIndex].sort((left, right) => left - right);

    setUnlockDrafts((current) => ({
      ...current,
      [player.ownerId]: nextLevels,
    }));
    setIsSavingPlayerUnlocks(player.ownerId);
    const result = await setPlayerForcedUnlockLevels(player.ownerId, nextLevels);
    setIsSavingPlayerUnlocks(null);
    setTeacherMessage(result.message);

    if (result.ok) {
      await refreshTeacherPlayers(bankState.entries);
      return;
    }

    setUnlockDrafts((current) => ({
      ...current,
      [player.ownerId]: player.forcedUnlockLevels,
    }));
  };

  const resetTeacherPlayer = async (player: TeacherPlayerOverview) => {
    const result = await resetPlayerProgressByTeacher(player);
    setTeacherMessage(result.message);
    if (result.ok) {
      await refreshTeacherPlayers(bankState.entries);
    }
  };

  const deleteTeacherPlayer = async (player: TeacherPlayerOverview) => {
    if (player.playerCode === ADMIN_PLAYER_CODE) {
      setTeacherMessage('Administratzailea ezin da ezabatu.');
      return;
    }

    const shouldDelete = window.confirm(`${player.playerCode} jokalaria ezabatu nahi duzu?`);
    if (!shouldDelete) return;

    setIsDeletingTeacherPlayer(true);
    const result = await deletePlayerByTeacher(player);
    setIsDeletingTeacherPlayer(false);
    setTeacherMessage(result.message);

    if (result.ok) {
      setSelectedTeacherPlayerId(null);
      setTeacherPlayerDraft(emptyTeacherPlayerDraft);
      setAdminPlayersView('list');
      await refreshTeacherPlayers(bankState.entries);
    }
  };

  const topBarTitle = activePlayer?.code ?? 'Elio';
  const topBarSubtitle = quiz
    ? quiz.level.name
    : summary
      ? `${summary.level.name} emaitza`
      : mainScreen === 'admin'
        ? 'Kudeaketa'
      : mainScreen === 'stats'
        ? 'Estatistikak'
        : mainScreen === 'profile'
          ? 'Profila'
          : 'Hasiera';

  return (
    <div className="app-root">
      {activePlayer && (
        <div className="app-fixed app-fixed-top">
        <div className="app-topbar">
          <div className="app-topbar-side">
            {quiz && (
              <button className="app-topbar-button" type="button" onClick={leaveGame}>
                <ChevronLeft className="app-topbar-button-icon" />
                <span>Itzuli</span>
              </button>
            )}

            {!quiz && summary && (
              <button className="app-topbar-button" type="button" onClick={leaveGame}>
                <House className="app-topbar-button-icon" />
                <span>Mailak</span>
              </button>
            )}

            {!quiz && !summary && (
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
            <span>{topBarSubtitle}</span>
          </div>

          <div className="app-topbar-side app-topbar-side-end">
            {!quiz && !summary && (
              <div className={clsx('app-topbar-chip', 'app-topbar-chip-streak', `app-topbar-chip-${streakTone}`)}>
                <Flame className="app-topbar-chip-icon" />
                <span>{consecutivePlayDays} egun</span>
              </div>
            )}

            {quiz && (
              <div className="app-topbar-chip app-topbar-chip-success">
                <Mountain className="app-topbar-chip-icon" />
                <span>{formatMeters(currentSessionMeters)}</span>
              </div>
            )}

            {!quiz && summary && (
              <div className="app-topbar-chip app-topbar-chip-success">
                <CheckCircle2 className="app-topbar-chip-icon" />
                <span>{formatPercentage(summary.progressPercentage)}</span>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      <div ref={shellRef} className={clsx('app-shell', { 'app-shell-locked': Boolean(quiz) })}>
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
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className="access-view"
              >
                <div className="access-band">
                  <strong>Elio</strong>
                </div>

                <motion.form className="access-card" onSubmit={submitAccess}>
                  <div className="access-card-icon">
                    <CircleUserRound className="access-card-icon-svg" />
                  </div>

                  <div className="access-heading">
                    <h1>Sartu jokora</h1>
                  </div>

                  <label className="access-field" htmlFor="access-code">
                    <span>Erabiltzailea</span>
                    <div className="access-input-shell">
                      <CircleUserRound className="access-input-icon" />
                      <input
                        id="access-code"
                        className="access-input"
                        type="text"
                        value={accessCode}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setAccessCode(event.target.value.toLowerCase())}
                        placeholder="Adibidez: joka1"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </div>
                  </label>

                  <label className="access-field" htmlFor="access-password">
                    <span>Pasahitza</span>
                    <div className="access-input-shell">
                      <KeyRound className="access-input-icon" />
                      <input
                        id="access-password"
                        className="access-input"
                        type={isPasswordVisible ? 'text' : 'password'}
                        value={accessPassword}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setAccessPassword(event.target.value)}
                        placeholder="Sartu pasahitza"
                      />
                      <button
                        className="access-visibility-button"
                        type="button"
                        onClick={() => setIsPasswordVisible((current) => !current)}
                        aria-label={isPasswordVisible ? 'Pasahitza ezkutatu' : 'Pasahitza erakutsi'}
                      >
                        {isPasswordVisible ? <EyeOff className="access-input-icon" /> : <Eye className="access-input-icon" />}
                      </button>
                    </div>
                  </label>

                  {accessMessage && <div className="access-message">{accessMessage}</div>}

                  <button className="access-submit" type="submit" disabled={isSubmittingAccess}>
                    {isSubmittingAccess ? 'Konektatzen...' : 'Sartu'}
                  </button>
                </motion.form>
              </motion.section>
            </Page>
          )}

          {!isSessionLoading && activePlayer && !quiz && !summary && (
            <Page pageKey={`main-${mainScreen}`}>
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className={clsx('main-view', {
                  'main-view-home': mainScreen === 'home',
                })}
              >
                {mainScreen === 'home' && (
                  <section className="levels-panel levels-panel-compact">
                    <div className="levels-grid">
                      {GAME_LEVELS.map((level) => {
                        const record = getResolvedLevelRecord(progress, bankState.entries, level);
                        const unlocked = isLevelUnlocked(progress, level.index, bankState.entries);
                        const completed = Boolean(record?.isCompleted);
                        const isCurrentTarget = unlocked && level.index === currentTargetLevel;
                        const isDeferredLocked = !unlocked && level.index > currentTargetLevel + 1;
                        const levelTotalQuestions = getLevelQuestionCount(bankState.entries, level.index);
                        const levelProgressCount = record?.bestCorrectCount ?? 0;
                        const levelPercentage = record?.bestScore ?? 0;
                        const climbedMeters = getLevelMetersForProgress(level, levelProgressCount, levelTotalQuestions);
                        return (
                          <button
                            key={level.id}
                            type="button"
                            className={clsx('level-card', {
                              'level-card-locked': !unlocked,
                              'level-card-locked-deep': isDeferredLocked,
                              'level-card-completed': completed,
                              'level-card-target': isCurrentTarget,
                            })}
                            aria-disabled={!unlocked || bankState.isLoading}
                            onClick={() => startLevel(level)}
                          >
                            <div className="level-card-top">
                              <span
                                className={clsx('level-state', {
                                  'level-state-locked': !unlocked,
                                  'level-state-completed': completed,
                                  'level-state-open': unlocked && !completed,
                                })}
                              >
                                {!unlocked && <Lock className="level-state-icon" />}
                                {completed && <CheckCircle2 className="level-state-icon" />}
                                {unlocked && !completed && <Mountain className="level-state-icon" />}
                              </span>
                            </div>

                            <div className="level-card-body">
                              <h3>{level.name}</h3>
                              <p>
                                {unlocked && (levelTotalQuestions > 0 ? formatMeterProgress(climbedMeters, level.elevationMeters) : formatMeterProgress(0, level.elevationMeters))}
                              </p>
                            </div>

                            {unlocked && (
                              <div className="level-card-footer">
                                <div className="level-card-progress" aria-label={formatPercentage(levelPercentage)}>
                                  <div className="level-mini-track">
                                    <div
                                      className={clsx('level-mini-fill', {
                                        'level-mini-fill-visible': levelPercentage > 0,
                                      })}
                                      style={{ width: `${levelPercentage}%` }}
                                    />
                                  </div>
                                </div>
                                <span className="level-card-score">{formatPercentage(levelPercentage)}</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {mainScreen === 'stats' && (
                  <>
                    {homeNotice && (
                      <div className={clsx('home-note', { 'home-note-warning': isDemoMode && !uiMessage })}>{homeNotice}</div>
                    )}

                    <section className="stats-panel">
                      <div className="panel-head">
                        <div>
                          <p className="section-label">Estatistikak</p>
                          <h2>Zure aurrerapena</h2>
                        </div>

                        <div className="panel-meta">
                          <span>Helburua {homeTargetLevel.name}</span>
                          <span>{formatPercentage(bestScore)} onena</span>
                        </div>
                      </div>

                      <div className="stats-levels-panel">
                        <div className="stats-levels-head">
                          <div>
                            <p className="section-label">Mailen aurrerapena</p>
                            <h3>Zabalik dauden mailak</h3>
                          </div>
                          <span className="stats-levels-meta">{formatPercentage(bestScore)} markarik onena</span>
                        </div>

                        <div className="stats-levels-list">
                          {unlockedLevelStats.map(({ level, record, totalQuestions, isTarget }) => {
                            const bestPercentage = record?.bestScore ?? 0;
                            const attempts = record?.attempts ?? 0;
                            const climbedMeters = getLevelMetersForProgress(level, record?.bestCorrectCount ?? 0, totalQuestions);
                            const unlockMeters = getLevelMetersForProgress(level, getLevelUnlockTargetCount(totalQuestions), totalQuestions);
                            const statusLabel = record?.isCompleted ? 'Gaindituta' : isTarget ? 'Uneko maila' : 'Prest';

                            return (
                              <article
                                key={`stats-${level.id}`}
                                className={clsx('stats-level-card', {
                                  'stats-level-card-target': isTarget,
                                  'stats-level-card-completed': record?.isCompleted,
                                })}
                              >
                                <div className="stats-level-card-top">
                                  <div>
                                    <strong>{level.name}</strong>
                                  </div>
                                  <span className="stats-level-badge">{statusLabel}</span>
                                </div>

                                <div className="stats-level-track">
                                  <div className="stats-level-fill" style={{ width: `${bestPercentage}%` }} />
                                </div>

                                <div className="stats-level-meta-grid">
                                  <span>{formatMeterProgress(climbedMeters, level.elevationMeters)}</span>
                                  <span>{attempts} partida</span>
                                  <span>{formatMeters(unlockMeters)} helburua</span>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>

                      <div className="stats-grid">
                        <article className="stat-card">
                          <span className="stat-card-label">Partidak</span>
                          <strong>{gamesPlayedToday}</strong>
                          <p>Gaur jokatuta</p>
                        </article>

                        <article className="stat-card">
                          <span className="stat-card-label">Egun jarraian</span>
                          <strong>{consecutivePlayDays}</strong>
                          <p>Azken segida</p>
                        </article>

                        <article className="stat-card">
                          <span className="stat-card-label">Osatutako mailak</span>
                          <strong>{completedLevels}</strong>
                          <p>{LEVELS_TOTAL} menditik</p>
                        </article>
                      </div>
                    </section>
                  </>
                )}

                {mainScreen === 'admin' && isTeacher && (
                  <>
                    {teacherMessage && <div className="home-note">{teacherMessage}</div>}

                    <section className="admin-panel">
                      <div className="panel-head">
                        <div>
                          <p className="section-label">Kudeaketa</p>
                          <h2>Irakaslearen panela</h2>
                        </div>

                        <div className="admin-switch">
                          <button
                            type="button"
                            className={clsx('admin-switch-button', { 'admin-switch-button-active': adminSection === 'words' })}
                            onClick={() => setAdminSection('words')}
                          >
                            <BookOpen className="admin-switch-icon" />
                            <span>Hitzak</span>
                          </button>
                          <button
                            type="button"
                            className={clsx('admin-switch-button', { 'admin-switch-button-active': adminSection === 'players' })}
                            onClick={() => setAdminSection('players')}
                          >
                            <Users className="admin-switch-icon" />
                            <span>Jokalariak</span>
                          </button>
                        </div>
                      </div>

                      {adminSection === 'players' && (
                        <section className="admin-card admin-card-wide">
                          <div className="admin-card-head">
                            <div>
                              <p className="section-label">
                                {adminPlayersView === 'list'
                                  ? 'Aurrerapena'
                                  : adminPlayersView === 'detail'
                                    ? 'Jokalaria'
                                    : 'Jokalari berria'}
                              </p>
                              <h3>
                                {adminPlayersView === 'list'
                                  ? 'Jokalari guztiak'
                                  : adminPlayersView === 'detail'
                                    ? selectedTeacherPlayer?.playerCode ?? 'Jokalaria'
                                    : 'Sortu sarbide berria'}
                              </h3>
                            </div>

                            {adminPlayersView !== 'list' && (
                              <button
                                type="button"
                                className="admin-secondary-button admin-panel-action"
                                onClick={() => {
                                  setAdminPlayersView('list');
                                  setSelectedTeacherPlayerId(null);
                                  setTeacherPlayerDraft(emptyTeacherPlayerDraft);
                                  setNewPlayerCode('');
                                  setNewPlayerPassword('');
                                }}
                              >
                                <ChevronLeft className="admin-button-icon" />
                                <span>Jokalariak</span>
                              </button>
                            )}
                          </div>

                          {adminPlayersView === 'list' && (
                            <>
                              <span className="admin-muted-pill">
                                {isTeacherPlayersLoading ? 'Kargatzen...' : `${teacherPlayers.length} jokalari`}
                              </span>

                              {isTeacherPlayersLoading && (
                                <div className="admin-empty-state">Jokalariak kargatzen ari dira.</div>
                              )}

                              {!isTeacherPlayersLoading && teacherPlayers.length === 0 && (
                                <div className="admin-empty-state">Ez dago jokalaririk oraindik.</div>
                              )}

                              {!isTeacherPlayersLoading && teacherPlayers.length > 0 && (
                                <div className="admin-player-list">
                                  {teacherPlayers.map((player) => (
                                    <button
                                      key={player.ownerId}
                                      type="button"
                                      className="admin-player-list-button admin-player-list-button-plain"
                                      onClick={() => selectTeacherPlayer(player)}
                                    >
                                      <strong>{player.playerCode}</strong>
                                    </button>
                                  ))}
                                </div>
                              )}

                              <button
                                type="button"
                                className="admin-primary-button admin-panel-action"
                                onClick={() => setAdminPlayersView('create')}
                              >
                                <PlusCircle className="admin-button-icon" />
                                <span>Jokalari berria</span>
                              </button>
                            </>
                          )}

                          {adminPlayersView === 'detail' && selectedTeacherPlayer && (
                            <article className="admin-player-card admin-player-detail-card">
                              <div className="admin-player-top">
                                <div>
                                  <strong>{selectedTeacherPlayer.playerCode}</strong>
                                  <span>{selectedTeacherPlayer.currentLevelName} unean</span>
                                </div>
                                <span className="admin-player-date">
                                  Eguneratua {formatAdminDate(selectedTeacherPlayer.updatedAt)}
                                </span>
                              </div>

                              <div className="admin-player-stats">
                                <span>{selectedTeacherPlayer.totalGamesPlayed} partida</span>
                                <span>{selectedTeacherPlayer.consecutivePlayDays} egun jarraian</span>
                                <span>{selectedTeacherPlayerLearnedWords} hitz ikasita</span>
                                <span>{selectedTeacherPlayerUnitStatus}</span>
                                <span>{formatPercentage(selectedTeacherPlayerAccuracy)} asmatuta</span>
                              </div>

                              <div className="admin-player-detail-grid">
                                <label className="admin-field">
                                  <span>Erabiltzailea</span>
                                  <div className="admin-input-shell">
                                    <CircleUserRound className="admin-input-icon" />
                                    <input
                                      className="admin-input"
                                      type="text"
                                      value={teacherPlayerDraft.playerCode}
                                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                        setTeacherPlayerDraft((current) => ({
                                          ...current,
                                          playerCode: event.target.value.toLowerCase(),
                                        }))
                                      }
                                      placeholder="joka12"
                                    />
                                  </div>
                                </label>

                                <label className="admin-field admin-field-span-2">
                                  <span>Pasahitz berria</span>
                                  <div className="admin-input-shell">
                                    <KeyRound className="admin-input-icon" />
                                    <input
                                      className="admin-input"
                                      type="text"
                                      value={teacherPlayerDraft.password}
                                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                        setTeacherPlayerDraft((current) => ({
                                          ...current,
                                          password: event.target.value,
                                        }))
                                      }
                                      placeholder="Utzi hutsik aldatu nahi ez baduzu"
                                    />
                                  </div>
                                </label>
                              </div>

                              <div className="admin-player-actions admin-player-actions-detail">
                                <div className="admin-inline-field admin-inline-field-wide">
                                  <span>Mendiak eskuz zabaldu</span>
                                  <div className="admin-level-toggle-grid">
                                    {GAME_LEVELS.map((level) => {
                                      const forcedLevels = unlockDrafts[selectedTeacherPlayer.ownerId] ?? selectedTeacherPlayer.forcedUnlockLevels;
                                      const isAlwaysUnlocked = level.index === 1;
                                      const isActive = isAlwaysUnlocked || forcedLevels.includes(level.index);
                                      const isSavingUnlocks = isSavingPlayerUnlocks === selectedTeacherPlayer.ownerId;

                                      return (
                                        <button
                                          key={`unlock-${selectedTeacherPlayer.ownerId}-${level.id}`}
                                          type="button"
                                          className={clsx('admin-level-toggle', {
                                            'admin-level-toggle-active': isActive,
                                            'admin-level-toggle-static': isAlwaysUnlocked,
                                          })}
                                          disabled={isAlwaysUnlocked || isSavingUnlocks}
                                          aria-pressed={!isAlwaysUnlocked && isActive}
                                          onClick={() => void toggleForcedUnlockForPlayer(selectedTeacherPlayer, level.index)}
                                        >
                                          <span className="admin-level-toggle-label">{level.name}</span>
                                          <span className="admin-level-toggle-indicator" aria-hidden="true">
                                            {isAlwaysUnlocked ? (
                                              <Mountain className="admin-level-toggle-icon" />
                                            ) : isActive ? (
                                              <CheckCircle2 className="admin-level-toggle-icon" />
                                            ) : (
                                              <Lock className="admin-level-toggle-icon" />
                                            )}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="admin-primary-button"
                                  onClick={() => void saveTeacherPlayerAccessChanges(selectedTeacherPlayer)}
                                  disabled={isSavingTeacherPlayer}
                                >
                                  <Save className="admin-button-icon" />
                                  <span>{isSavingTeacherPlayer ? 'Gordetzen...' : 'Datuak gorde'}</span>
                                </button>

                                <button
                                  type="button"
                                  className="admin-secondary-button admin-secondary-button-danger"
                                  onClick={() => void resetTeacherPlayer(selectedTeacherPlayer)}
                                >
                                  <RotateCcw className="admin-button-icon" />
                                  <span>Datuak garbitu</span>
                                </button>

                                {selectedTeacherPlayer.playerCode !== ADMIN_PLAYER_CODE && (
                                  <button
                                    type="button"
                                    className="admin-secondary-button admin-secondary-button-danger"
                                    onClick={() => void deleteTeacherPlayer(selectedTeacherPlayer)}
                                    disabled={isDeletingTeacherPlayer}
                                  >
                                    <Trash2 className="admin-button-icon" />
                                    <span>{isDeletingTeacherPlayer ? 'Ezabatzen...' : 'Jokalaria ezabatu'}</span>
                                  </button>
                                )}
                              </div>
                            </article>
                          )}

                          {adminPlayersView === 'create' && (
                            <form className="admin-player-create-form" onSubmit={submitTeacherPlayer}>
                              <label className="admin-field">
                                <span>Erabiltzailea</span>
                                <div className="admin-input-shell">
                                  <CircleUserRound className="admin-input-icon" />
                                  <input
                                    className="admin-input"
                                    type="text"
                                    value={newPlayerCode}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPlayerCode(event.target.value.toLowerCase())}
                                    placeholder="Adibidez: joka12"
                                  />
                                </div>
                              </label>

                              <label className="admin-field">
                                <span>Pasahitza</span>
                                <div className="admin-input-shell">
                                  <KeyRound className="admin-input-icon" />
                                  <input
                                    className="admin-input"
                                    type="text"
                                    value={newPlayerPassword}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPlayerPassword(event.target.value)}
                                    placeholder="Hasierako giltza"
                                  />
                                </div>
                              </label>

                              <button className="admin-primary-button" type="submit" disabled={isCreatingPlayer}>
                                <Save className="admin-button-icon" />
                                <span>{isCreatingPlayer ? 'Sortzen...' : 'Gorde jokalaria'}</span>
                              </button>
                            </form>
                          )}
                        </section>
                      )}

                      {adminSection === 'words' && (
                        <section className="admin-card admin-card-wide admin-card-search-only">
                          <div className="admin-card-head">
                            <div>
                              <p className="section-label">Sinonimoak</p>
                              <h3>Bilatu, editatu edo gehitu</h3>
                            </div>
                          </div>

                          <div className="admin-word-section">
                            <div className="admin-search-shell">
                              <input
                                className="admin-input"
                                type="search"
                                value={teacherWordSearch}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setTeacherWordSearch(event.target.value)}
                                placeholder="Bilatu hitza edo sinonimoa"
                              />
                            </div>

                            {isDemoMode && (
                              <div className="admin-empty-state">
                                Demoko hitzak bakarrik daude ikusgai. Taula erreala erabilgarri dagoenean hemen agertuko dira benetako sarrerak.
                              </div>
                            )}

                            {!isDemoMode && teacherWordQuery.length === 0 && (
                              <div className="admin-empty-state">
                                Idatzi hitz bat edo sinonimo bat. Aurkitzen bada editatu ahal izango duzu; bestela, sarrera berria sortuko da.
                              </div>
                            )}

                            {!isDemoMode && teacherWordQuery.length > 0 && teacherWordResults.length > 0 && !teacherDirectMatch && (
                              <div className="admin-word-list">
                                {teacherWordResults.map((entry) => (
                                  <article key={entry.id} className="admin-word-card">
                                    <div className="admin-word-top">
                                      <div>
                                        <strong>{entry.word}</strong>
                                        <span>{GAME_LEVELS[(entry.levelOrder ?? 1) - 1]?.name ?? 'Mailarik gabe'}</span>
                                      </div>

                                      <button
                                        type="button"
                                        className="admin-inline-button"
                                        onClick={() => startEditingWord(entry)}
                                      >
                                        <PencilLine className="admin-button-icon" />
                                        <span>Editatu</span>
                                      </button>
                                    </div>

                                    <p className="admin-word-synonyms">{entry.synonyms.join(', ')}</p>
                                  </article>
                                ))}
                              </div>
                            )}

                            {!isDemoMode && teacherWordQuery.length > 0 && teacherWordResults.length === 0 && (
                              <div className="admin-empty-state">
                                Ez da hitz hori aurkitu. Azpiko formularioan zuzenean sor dezakezu.
                              </div>
                            )}

                            {!isDemoMode && teacherWordQuery.length > 0 && (
                              <form className="admin-word-editor" onSubmit={submitTeacherWord}>
                                <div className="admin-card-head admin-word-editor-head">
                                  <div>
                                    <p className="section-label">{editingWordId ? 'Editatzen' : 'Sarrera berria'}</p>
                                    <h3>{editingWordId ? 'Hitza eguneratu' : 'Hitza gehitu'}</h3>
                                  </div>
                                  <span className="admin-muted-pill">{editingWordId ? 'Badago' : 'Berria'}</span>
                                </div>

                                <label className="admin-field">
                                  <span>Hitza</span>
                                  <div className="admin-input-shell">
                                    <BookOpen className="admin-input-icon" />
                                    <input
                                      className="admin-input"
                                      type="text"
                                      value={teacherWordForm.word}
                                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                        setTeacherWordForm((current) => ({ ...current, word: event.target.value }))
                                      }
                                      placeholder="Adibidez: maite"
                                    />
                                  </div>
                                </label>

                                <label className="admin-field">
                                  <span>Sinonimoak</span>
                                  <div className="admin-textarea-shell">
                                    <textarea
                                      className="admin-textarea"
                                      value={teacherWordForm.synonyms}
                                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                        setTeacherWordForm((current) => ({ ...current, synonyms: event.target.value }))
                                      }
                                      placeholder="laket, atsegin, gustuko, gogoko"
                                      rows={5}
                                    />
                                  </div>
                                </label>

                                <label className="admin-field">
                                  <span>Maila</span>
                                  <div className="admin-select-shell">
                                    <Mountain className="admin-input-icon" />
                                    <select
                                      className="admin-select"
                                      value={teacherWordForm.levelOrder}
                                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                        setTeacherWordForm((current) => ({ ...current, levelOrder: Number(event.target.value) }))
                                      }
                                    >
                                      {GAME_LEVELS.map((level) => (
                                        <option key={`word-form-${level.id}`} value={level.index}>
                                          {level.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </label>

                                <div className="admin-form-actions">
                                  <button className="admin-primary-button" type="submit" disabled={isSavingWord}>
                                    {editingWordId ? <Save className="admin-button-icon" /> : <PlusCircle className="admin-button-icon" />}
                                    <span>{isSavingWord ? 'Gordetzen...' : editingWordId ? 'Aldaketak gorde' : 'Hitza sortu'}</span>
                                  </button>

                                  <button className="admin-secondary-button" type="button" onClick={resetTeacherWordForm}>
                                    <RotateCcw className="admin-button-icon" />
                                    <span>Garbitu</span>
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        </section>
                      )}
                    </section>
                  </>
                )}

                {mainScreen === 'profile' && (
                  <section className="profile-panel">
                    <div className="profile-inline">
                      <span className="profile-inline-icon">
                        <CircleUserRound className="profile-inline-svg" />
                      </span>
                      <div className="profile-inline-copy">
                        <strong>{activePlayer.code}</strong>
                        <span>Jokalari erregistratua</span>
                      </div>
                    </div>

                    <div className="profile-panel-row">
                      <div className="status-chip">
                        <Sparkles className="status-chip-icon" />
                        <span>{bankStatusLabel}</span>
                      </div>

                      <span className="player-code-chip">{activePlayer.code}</span>
                    </div>

                    <button className="logout-button logout-button-wide" type="button" onClick={() => void logoutPlayer()}>
                      <LogOut className="logout-button-icon" />
                      <span>Saioa itxi</span>
                    </button>
                  </section>
                )}
              </motion.section>
            </Page>
          )}

          {!isSessionLoading && activePlayer && quiz && currentQuestion && (
            <Page pageKey={`quiz-${quiz.level.id}`}>
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className="screen-card screen-card-quiz"
              >
                <div className="screen-progress">
                  <span className="progress-pill">
                    {quiz.currentIndex + 1}/{quiz.questions.length}
                  </span>
                  <SegmentBar total={quiz.questions.length} answers={quiz.answers} currentIndex={quiz.currentIndex} />
                </div>

                <div className="section-kicker">Hitza</div>
                <div className="word-card">
                  <div className="question-word">{currentQuestion.word}</div>
                </div>

                <div className="options-stack">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = currentAnswer?.selectedAnswer === option;
                    const isCorrect = currentQuestion.correctAnswer === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        className={clsx('answer-option', {
                          'answer-option-selected': isSelected && !currentAnswer,
                          'answer-option-correct': currentAnswer && isCorrect,
                          'answer-option-wrong': currentAnswer && isSelected && !isCorrect,
                        })}
                        disabled={Boolean(currentAnswer)}
                        onClick={() => answerCurrentQuestion(option)}
                      >
                        <span
                          className={clsx('answer-letter', {
                            'answer-letter-correct': currentAnswer && isCorrect,
                            'answer-letter-wrong': currentAnswer && isSelected && !isCorrect,
                          })}
                        >
                          {OPTION_LABELS[index] ?? index + 1}
                        </span>
                        <span className="answer-text">{option}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="quiz-action-row">
                  <button className="primary-button quiz-next-button" type="button" disabled={!currentAnswer} onClick={advanceQuiz}>
                    <CirclePlay className="dock-svg" />
                    <span>{quizAdvanceLabel}</span>
                  </button>
                </div>
              </motion.section>
            </Page>
          )}

          {!isSessionLoading && activePlayer && summary && !quiz && (
            <Page pageKey={`summary-${summary.level.id}`}>
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className="screen-card"
              >
                <div className="screen-heading">
                  <h2>{summary.level.name}</h2>
                </div>

                <div className="result-card">
                  <div className="result-score-row">
                    <span className="result-score">
                      {summary.correctCount}/{summary.totalQuestions}
                    </span>
                    <span className="result-percentage">{formatPercentage(summary.percentage)}</span>
                  </div>
                  <p className="result-copy">
                    Saio honetako emaitza
                  </p>
                  <SegmentBar total={summary.totalQuestions} filledCount={summary.correctCount} />
                </div>

                <div className="summary-panel">
                  <div className="summary-row">
                    <span>Maila</span>
                    <strong>{summary.level.name}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Saio honetako emaitza</span>
                    <strong>{summary.correctCount}/{summary.totalQuestions} · {formatPercentage(summary.percentage)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Mailako aurrerapena</span>
                    <strong>{formatMeterProgress(getLevelMetersForProgress(summary.level, summary.masteredCount, summary.levelTotalQuestions), summary.level.elevationMeters)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Hurrengo mailarako</span>
                    <strong>{formatMeters(getLevelMetersForProgress(summary.level, summary.unlockTargetCount, summary.levelTotalQuestions))}</strong>
                  </div>
                </div>
                <div className="review-card">
                  <div className="section-kicker">Berrikusi</div>

                  <div className="review-list">
                    {summaryErrors.length === 0 && (
                      <div className="review-item review-item-success">
                        <strong>Bikain</strong>
                        <span>Maila honetan ez duzu akatsik egin.</span>
                      </div>
                    )}

                    {summaryErrors.map((answer) => (
                      <div key={answer.questionId} className="review-item">
                        <strong>{answer.word}</strong>
                        <span>
                          Hautatua: {answer.selectedAnswer} | Zuzena: {answer.correctAnswer}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>
            </Page>
          )}
        </AnimatePresence>
      </div>

      {activePlayer && (
        <div className="app-fixed app-fixed-bottom">
        <nav className="app-dock" aria-label="Ekintza nagusiak">
          {!quiz && !summary && (
            <>
              <DockButton
                label="Hasiera"
                icon={<House className="dock-svg" />}
                onClick={() => openMainScreen('home')}
                active={mainScreen === 'home'}
                showLabel={mainScreen === 'home'}
              />
              {isTeacher ? (
                <>
                  <DockButton
                    label="Kudeaketa"
                    icon={<Shield className="dock-svg" />}
                    onClick={() => openMainScreen('admin')}
                    active={mainScreen === 'admin'}
                    showLabel={mainScreen === 'admin'}
                  />
                  <DockButton
                    label="Profila"
                    icon={<CircleUserRound className="dock-svg" />}
                    onClick={() => openMainScreen('profile')}
                    active={mainScreen === 'profile'}
                    showLabel={mainScreen === 'profile'}
                  />
                </>
              ) : (
                <>
                  <DockButton
                    label="Estatistikak"
                    icon={<Trophy className="dock-svg" />}
                    onClick={() => openMainScreen('stats')}
                    active={mainScreen === 'stats'}
                    showLabel={mainScreen === 'stats'}
                  />
                  <DockButton
                    label="Profila"
                    icon={<CircleUserRound className="dock-svg" />}
                    onClick={() => openMainScreen('profile')}
                    active={mainScreen === 'profile'}
                    showLabel={mainScreen === 'profile'}
                  />
                </>
              )}
            </>
          )}

          {quiz && (
            <>
              <DockButton label="Hasiera" icon={<House className="dock-svg" />} onClick={leaveGame} wide showLabel />
            </>
          )}

          {summary && (
            <>
              <DockButton label="Hasiera" icon={<House className="dock-svg" />} onClick={leaveGame} showLabel />
              <DockButton label="Berriz" icon={<RefreshCw className="dock-svg" />} onClick={() => startLevel(summary.level)} showLabel />
              <DockButton
                label={nextLevel && nextLevelUnlocked ? 'Hurrengoa' : 'Bukatu'}
                icon={nextLevel && nextLevelUnlocked ? <CirclePlay className="dock-svg" /> : <CheckCircle2 className="dock-svg" />}
                onClick={() => {
                  if (nextLevel && nextLevelUnlocked) {
                    startLevel(nextLevel);
                    return;
                  }

                  leaveGame();
                }}
                tone="primary"
                wide
                showLabel
              />
            </>
          )}
        </nav>
        </div>
      )}
    </div>
  );
};

export default App;
