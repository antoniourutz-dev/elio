// Barrel re-export — preserves all public exports from the original single-file module.
// Consumers using `from '../euskeraLearning'` or `from './euskeraLearning'` continue to work.

export type {
  SynonymEntry,
  QuizQuestion,
  GameLevel,
  LevelRecord,
  GameProgress,
  PlayerIdentity,
  PlayerSessionState,
  PlayerAccessSuccess,
  PlayerAccessFailure,
  PlayerProgressSyncResult,
  TeacherOperationResult,
  TeacherPlayerAccessInput,
  LevelChallengeSuccess,
  LevelChallengeFailure,
  BankLoadSuccess,
  BankLoadFailure,
  TeacherWordInput,
  TeacherPlayerOverview,
} from './lib/types';

export { ADMIN_PLAYER_CODE, GAME_LEVELS, LEVELS_TOTAL, SUPERADMIN_PLAYER_CODE } from './lib/constants';

export { buildPlayerEmail } from './lib/parsing';

export { isTeacherPlayer, isSuperPlayer, loadPlayerSessionState, signOutPlayer, accessPlayer } from './lib/auth';

export { savePlayerProgress } from './lib/storage';

export {
  createInitialProgress,
  getLevelRecord,
  getResolvedLevelRecord,
  isLevelUnlocked,
  getUnlockedLevels,
  recordLevelResult,
} from './lib/progress';

export { buildLevelChallenge } from './lib/quiz';

export {
  getTotalGamesPlayed,
  getGamesPlayedOnDay,
  getTodayGamesPlayed,
  getLevelQuestionCount,
  getLevelUnlockTargetCount,
  getLevelMetersForProgress,
  getConsecutivePlayDays,
} from './lib/stats';

export { loadSynonymBank } from './lib/bank';

export {
  getDayKey,
  loadGameWords,
  buildDailyGame,
  calculateDailyScore,
  loadMyDailyResult,
  saveDailyResult,
  loadDailyRanking,
} from './lib/daily';

export {
  loadTeacherPlayers,
  createPlayerByTeacher,
  updateTeacherPlayerAccess,
  deletePlayerByTeacher,
  resetPlayerProgressByTeacher,
  setPlayerForcedUnlockLevels,
  createTeacherWord,
  updateTeacherWord,
} from './lib/teacher';
