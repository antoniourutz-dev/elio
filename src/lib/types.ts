export interface SynonymEntry {
  id: string;
  word: string;
  synonyms: string[];
  difficulty: number | null;
  theme: string | null;
  translation: string | null;
  example: string | null;
  tags: string[];
  levelOrder: number | null;
}

export interface QuizQuestion {
  id: string;
  word: string;
  prompt: string;
  supportText: string;
  correctAnswer: string;
  options: string[];
  translation: string | null;
  example: string | null;
}

export interface QuestionMemoryRecord {
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  correctStreak: number;
  incorrectStreak: number;
  masteryLevel: number;
  lastResult: 'correct' | 'incorrect' | null;
  lastSeenAt: string | null;
}

export interface GameLevel {
  id: string;
  index: number;
  name: string;
  elevationMeters: number;
}

export interface LevelRecord {
  levelId: string;
  levelIndex: number;
  attempts: number;
  bestScore: number;
  lastScore: number;
  bestCorrectCount: number;
  lastCorrectCount: number;
  totalQuestions: number;
  lastPlayedAt: string | null;
  playedDates: string[];
  dailyAttempts: Record<string, number>;
  masteredQuestionIds: string[];
  incorrectQuestionIds: string[];
  questionMemory: Record<string, QuestionMemoryRecord>;
  isCompleted: boolean;
}

export interface GameProgress {
  learnerName: string;
  forcedUnlockLevels: number[];
  levelRecords: LevelRecord[];
}

export interface PlayerIdentity {
  userId: string;
  code: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  avatarId?: string | null;
}

export interface PlayerSessionState {
  player: PlayerIdentity | null;
  progress: GameProgress;
  message: string | null;
}

export interface PlayerAccessSuccess {
  ok: true;
  player: PlayerIdentity;
  progress: GameProgress;
  isNew: boolean;
  message: string;
}

export interface PlayerAccessFailure {
  ok: false;
  message: string;
}

export interface PlayerProgressSyncResult {
  ok: boolean;
  message: string | null;
}

export interface TeacherOperationResult {
  ok: boolean;
  message: string;
}

export interface TeacherPlayerAccessInput {
  playerCode: string;
  learnerName: string;
  password?: string;
}

export interface LevelChallengeSuccess {
  ok: true;
  questions: QuizQuestion[];
  totalAvailableQuestions: number;
  message: string | null;
}

export interface LevelChallengeFailure {
  ok: false;
  message: string;
}

export interface BankLoadSuccess {
  ok: true;
  entries: SynonymEntry[];
  message: string;
}

export interface BankLoadFailure {
  ok: false;
  entries: SynonymEntry[];
  message: string;
}

export interface TeacherWordInput {
  word: string;
  synonyms: string[];
  levelOrder: number;
}

export interface TeacherPlayerOverview {
  ownerId: string;
  playerCode: string;
  playerEmail: string;
  learnerName: string;
  forcedUnlockLevels: number[];
  createdAt: string;
  updatedAt: string;
  progress: GameProgress;
  completedLevels: number;
  unlockedLevels: number;
  currentLevelName: string;
  bestScore: number;
  totalGamesPlayed: number;
  consecutivePlayDays: number;
}
