import type { FormEvent } from 'react';
import type {
  ActiveQuiz,
  BankState,
  DailyGameSession,
  DailyRankingEntry,
  DailyResult,
  DailyWeeklyRankingEntry,
  LevelSummary,
} from '../../appTypes';
import type { GameLevel, GameProgress, PlayerIdentity } from '../../euskeraLearning';
import type { DockAction, DockItemConfig, MainScreen, TopBarState } from './appChrome';

export interface AccessViewModel {
  code: string;
  password: string;
  message: string | null;
  isPasswordVisible: boolean;
  isSubmitting: boolean;
  onCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordVisibilityToggle: () => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

export interface MainViewModel {
  dayKey: string;
  dailyResult: DailyResult | null;
  canStartDailyGame: boolean;
  ranking: DailyRankingEntry[];
  weeklyRanking: DailyWeeklyRankingEntry[];
  weekHistory: DailyResult[];
  myRankEntry: DailyRankingEntry | null;
  myWeekRankEntry: DailyWeeklyRankingEntry | null;
  isLoadingData: boolean;
  bankState: BankState;
  progress: GameProgress;
  currentTargetLevel: number;
  homeNotice: string | null;
  isDemoMode: boolean;
  uiMessage: string | null;
  isTeacher: boolean;
  onStartDailyGame: () => void;
  onGoSynonyms: () => void;
  onStartLevel: (level: GameLevel) => void;
  onRefreshBank: () => Promise<void>;
  onScrollTop: () => void;
  onLogout: () => void | Promise<void>;
}

export interface DailyGameViewModel {
  session: DailyGameSession | null;
  elapsedSeconds: number;
  onAnswer: (selectedAnswer: string) => void;
  onSolve: () => void;
  onAdvance: () => void;
}

export interface SynonymGameViewModel {
  quiz: ActiveQuiz | null;
  currentQuestion: ActiveQuiz['questions'][number] | null;
  currentAnswer: ActiveQuiz['answers'][number] | null;
  quizAdvanceLabel: string;
  summary: LevelSummary | null;
  summaryErrors: LevelSummary['answers'];
  onAnswer: (selectedAnswer: string) => void;
  onAdvance: () => void;
}

export interface DockViewModel {
  items: DockItemConfig[];
  onItemClick: (action: DockAction) => void;
}

export interface AppTopBarViewModel extends TopBarState {
  title: string;
}

export interface AppScreenModel {
  isSessionLoading: boolean;
  access: AccessViewModel;
  main: MainViewModel;
  dailyGame: DailyGameViewModel;
  synonymGame: SynonymGameViewModel;
  topBar: AppTopBarViewModel;
  dock: DockViewModel;
}

export interface BuildAppScreenModelArgs {
  isSessionLoading: boolean;
  access: AccessViewModel;
  main: MainViewModel;
  dailyGame: DailyGameViewModel;
  synonymGame: SynonymGameViewModel;
  topBar: AppTopBarViewModel;
  dock: DockViewModel;
}

export interface UseAppScreenModelArgs {
  activePlayer: PlayerIdentity | null;
  mainScreen: MainScreen;
  isSessionLoading: boolean;
  dailySessionProgress: string | null;
  dailyElapsed: string | null;
  accessCode: string;
  setAccessCode: (value: string) => void;
  accessPassword: string;
  setAccessPassword: (value: string) => void;
  accessMessage: string | null;
  isPasswordVisible: boolean;
  togglePasswordVisibility: () => void;
  isSubmittingAccess: boolean;
  submitAccess: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>;
  dayKey: string;
  dailySession: DailyGameSession | null;
  dailyResult: DailyResult | null;
  canStartDailyGame: boolean;
  ranking: DailyRankingEntry[];
  weeklyRanking: DailyWeeklyRankingEntry[];
  weekHistory: DailyResult[];
  myRankEntry: DailyRankingEntry | null;
  myWeekRankEntry: DailyWeeklyRankingEntry | null;
  elapsedSeconds: number;
  isLoadingData: boolean;
  bankState: BankState;
  progress: GameProgress;
  currentTargetLevel: number;
  homeNotice: string | null;
  isDemoMode: boolean;
  uiMessage: string | null;
  isTeacher: boolean;
  quiz: ActiveQuiz | null;
  currentQuestion: ActiveQuiz['questions'][number] | null;
  currentAnswer: ActiveQuiz['answers'][number] | null;
  quizAdvanceLabel: string;
  summary: LevelSummary | null;
  summaryErrors: LevelSummary['answers'];
  completedLevels: number;
  totalLevels: number;
  consecutivePlayDays: number;
  streakTone: string;
  currentSessionMeters: number;
  nextLevel: GameLevel | null;
  nextLevelUnlocked: boolean;
  startDailyGame: () => void;
  answerDailyQuestion: (selectedAnswer: string) => void;
  solveDailyQuestion: () => void;
  advanceDailyQuestion: () => void;
  startLevel: (level: GameLevel) => void;
  refreshBank: () => Promise<void>;
  scrollTop: () => void;
  logoutPlayer: () => void | Promise<void>;
  answerCurrentQuestion: (selectedAnswer: string) => void;
  advanceQuiz: () => void;
  goHome: () => void;
  goSynonyms: () => void;
  goStats: () => void;
  goAdmin: () => void;
  goProfile: () => void;
}
