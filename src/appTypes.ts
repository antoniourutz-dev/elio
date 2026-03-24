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
  correctAnswer: 'ZUZEN' | 'OKER';
}

export interface OrthographyExercise {
  id: number | string;
  exerciseNumber: number;
  optionA: string;
  optionB: string;
  optionC: string;
  solution: 'A' | 'B' | 'C';
}

export interface OrthographyDailyQuestion {
  type: 'orthography';
  id: string;
  exerciseNumber: number;
  options: {
    key: 'A' | 'B' | 'C';
    text: string;
    words: string[];
  }[];
  correctAnswer: 'A' | 'B' | 'C';
}

export interface SynonymDailyQuestion {
  type: 'synonym';
  id: string;
  word: string;
  correctAnswer: string;
  options: string[];
}

export interface EroglificoEntry {
  id: number | string;
  imagePath: string;
  clue: string;
  solution: string;
  normalizedSolution?: string;
  alternativeAnswers?: string[];
  active?: boolean;
}

export interface EroglificoDailyQuestion {
  type: 'eroglifico';
  id: string;
  imageUrl: string;
  clue: string;
  correctAnswer: string;
  acceptedAnswers: string[];
}

export type DailyQuestion =
  | SpellingDailyQuestion
  | OrthographyDailyQuestion
  | SynonymDailyQuestion
  | EroglificoDailyQuestion;

export interface DailyAnswer {
  questionId: string;
  questionType: 'spelling' | 'orthography' | 'synonym' | 'eroglifico';
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  wasSolved?: boolean;
}

export interface DailyGameSession {
  dayKey: string;
  mode?: 'daily' | 'orthography_practice';
  questions: DailyQuestion[];
  currentIndex: number;
  answers: DailyAnswer[];
  startedAt: number;
}

export interface DailyStoredAnswer {
  type: 'spelling' | 'orthography' | 'synonym' | 'eroglifico';
  word: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
  wasSolved?: boolean;
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
