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
import type { GameLevel, GameProgress } from '../../lib/types';
import type { DockAction, DockActionItemConfig, DockItemConfig, TopBarState } from './appChrome';

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
  bankState: BankState;
  progress: GameProgress;
  currentTargetLevel: number;
  isTeacher: boolean;
  isSuperUser: boolean;
  activeGrammarLessonSlug: string | null;
  grammarCompletedStops: number;
  onGoSynonyms: () => void;
  onGoGrammar: () => void;
  onOpenGrammarLesson: (slug?: string | null) => void;
  onCompleteGrammarStop: () => void;
  onGoVocabulary: () => void;
  onGoTopics: () => void;
  onGoVerbs: () => void;
  onStartOrthographyPractice: () => void;
  onStartLevel: (level: GameLevel) => void;
  onRefreshBank: () => Promise<void>;
  onScrollTop: () => void;
  onLogout: () => void | Promise<void>;
}

export interface DailyHomeViewModel {
  dayKey: string;
  dailyResult: DailyResult | null;
  weekHistory: DailyResult[];
  ranking: DailyRankingEntry[];
  weeklyRanking: DailyWeeklyRankingEntry[];
  myRankEntry: DailyRankingEntry | null;
  myWeekRankEntry: DailyWeeklyRankingEntry | null;
  isLoadingData: boolean;
  canStartGame: boolean;
  onStartGame: () => void;
  onGoLearn: () => void;
  onGoSynonyms: () => void;
  onGoGrammar: () => void;
  onGoVocabulary: () => void;
  onGoVerbs: () => void;
}

export interface StatsViewModel {
  progress: GameProgress;
  entries: BankState['entries'];
  currentTargetLevel: number;
  homeNotice: string | null;
  isDemoMode: boolean;
  uiMessage: string | null;
}

export interface ProfileViewModel {
  weekHistory: DailyResult[];
  isLoadingData: boolean;
  progress: GameProgress;
  entries: BankState['entries'];
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
  tabs: DockItemConfig[];
  actions: DockActionItemConfig[];
  onItemClick: (action: DockAction) => void;
}

export interface AppTopBarViewModel extends TopBarState {
  title: string;
}
