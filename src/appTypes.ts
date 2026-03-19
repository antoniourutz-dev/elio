import type { GameLevel, SynonymEntry } from './euskeraLearning';

export interface GameWord {
  id: number;
  text: string;
  egoera: boolean;
  level: number;
}

export interface SpellingDailyQuestion {
  type: 'spelling';
  id: string;
  displayText: string;
  correctAnswer: 'ZUZEN' | 'OKERRA';
}

export interface SynonymDailyQuestion {
  type: 'synonym';
  id: string;
  word: string;
  correctAnswer: string;
  options: string[];
}

export type DailyQuestion = SpellingDailyQuestion | SynonymDailyQuestion;

export interface DailyAnswer {
  questionId: string;
  questionType: 'spelling' | 'synonym';
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface DailyGameSession {
  dayKey: string;
  questions: DailyQuestion[];
  currentIndex: number;
  answers: DailyAnswer[];
  startedAt: number;
}

export interface DailyStoredAnswer {
  type: 'spelling' | 'synonym';
  word: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
}

export interface DailyResult {
  dayKey: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  secondsElapsed: number;
  completedAt: string;
  answers: DailyStoredAnswer[];
}

export interface DailyRankingEntry {
  playerCode: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  secondsElapsed: number;
  rank: number;
}

export interface DailyWeeklyRankingEntry {
  playerCode: string;
  totalScore: number;
  daysPlayed: number;
  rank: number;
}

export interface BankState {
  isLoading: boolean;
  isReady: boolean;
  entries: SynonymEntry[];
  message: string;
}

export interface SessionAnswer {
  questionId: string;
  word: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface ActiveQuiz {
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

export interface LevelSummary {
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
