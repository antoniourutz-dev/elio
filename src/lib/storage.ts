import { isSupabaseConfigured, playerProgressTable, supabase } from '../supabaseClient';
import type { PlayerIdentity, GameProgress, LevelRecord, PlayerProgressSyncResult, QuestionMemoryRecord } from './types';
import {
  GAME_LEVELS,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  LEVEL_PASS_SCORE,
} from './constants';
import {
  parsePlayedDates,
  parseQuestionIdList,
  parseDailyAttempts,
  calculateLevelProgressPercentage,
} from './parsing';
import {
  forcedUnlockLevelsColumnSupport,
  setForcedUnlockLevelsColumnSupport,
  rememberForcedUnlockLevelsSupport,
  toDbError,
  isMissingTableError,
  isRowLevelSecurityError,
  isMissingColumnError,
  REMOTE_PROGRESS_SELECT,
  LEGACY_REMOTE_PROGRESS_SELECT,
  type DbErrorLike,
  type RemoteProgressRow,
} from './db';

export const sanitizeForcedUnlockLevels = (value: unknown, legacyValue?: unknown): number[] => {
  const parsedLevels = Array.isArray(value)
    ? value
        .map((item) => Math.floor(Number(item)))
        .filter((item) => Number.isFinite(item) && item >= 2 && item <= GAME_LEVELS.length)
    : [];

  if (parsedLevels.length > 0) {
    return Array.from(new Set(parsedLevels)).sort((left, right) => left - right);
  }

  const legacyLevel = Math.floor(Number(legacyValue ?? 1));
  if (!Number.isFinite(legacyLevel) || legacyLevel <= 1) return [];

  return Array.from({ length: Math.min(legacyLevel, GAME_LEVELS.length) - 1 }, (_, index) => index + 2);
};

export const getLegacyForcedUnlockLevel = (levels: number[]): number | null => {
  const sanitized = sanitizeForcedUnlockLevels(levels);
  if (sanitized.length === 0) return 1;

  for (let index = 0; index < sanitized.length; index += 1) {
    if (sanitized[index] !== index + 2) {
      return null;
    }
  }

  return sanitized[sanitized.length - 1] ?? 1;
};

const getLevelUnlockTargetCount = (levelQuestionCount: number): number => {
  if (levelQuestionCount <= 0) return 0;
  return Math.ceil((levelQuestionCount * LEVEL_PASS_SCORE) / 100);
};

const clampMasteryLevel = (value: unknown): number => {
  const parsed = Math.floor(Number(value ?? 0));
  return Math.max(0, Math.min(4, Number.isFinite(parsed) ? parsed : 0));
};

const normalizeQuestionMemoryRecord = (value: unknown): QuestionMemoryRecord | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<QuestionMemoryRecord>;

  return {
    attempts: Math.max(0, Math.floor(Number(candidate.attempts ?? 0))),
    correctCount: Math.max(0, Math.floor(Number(candidate.correctCount ?? 0))),
    incorrectCount: Math.max(0, Math.floor(Number(candidate.incorrectCount ?? 0))),
    correctStreak: Math.max(0, Math.floor(Number(candidate.correctStreak ?? 0))),
    incorrectStreak: Math.max(0, Math.floor(Number(candidate.incorrectStreak ?? 0))),
    masteryLevel: clampMasteryLevel(candidate.masteryLevel),
    lastResult:
      candidate.lastResult === 'correct' || candidate.lastResult === 'incorrect'
        ? candidate.lastResult
        : null,
    lastSeenAt: typeof candidate.lastSeenAt === 'string' ? candidate.lastSeenAt : null,
  };
};

const parseQuestionMemory = (
  value: unknown,
  masteredQuestionIds: string[],
  incorrectQuestionIds: string[],
  lastPlayedAt: string | null
): Record<string, QuestionMemoryRecord> => {
  const parsed =
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value).reduce<Record<string, QuestionMemoryRecord>>((accumulator, [questionId, record]) => {
          if (!questionId.trim()) return accumulator;

          const normalized = normalizeQuestionMemoryRecord(record);
          if (!normalized) return accumulator;

          accumulator[questionId.trim()] = normalized;
          return accumulator;
        }, {})
      : {};

  for (const questionId of masteredQuestionIds) {
    parsed[questionId] ??= {
      attempts: 1,
      correctCount: 1,
      incorrectCount: 0,
      correctStreak: 1,
      incorrectStreak: 0,
      masteryLevel: 2,
      lastResult: 'correct',
      lastSeenAt: lastPlayedAt,
    };
  }

  for (const questionId of incorrectQuestionIds) {
    parsed[questionId] ??= {
      attempts: 1,
      correctCount: 0,
      incorrectCount: 1,
      correctStreak: 0,
      incorrectStreak: 1,
      masteryLevel: 0,
      lastResult: 'incorrect',
      lastSeenAt: lastPlayedAt,
    };
  }

  return parsed;
};

const parseStoredLevelRecord = (record: unknown): LevelRecord | null => {
  if (!record || typeof record !== 'object') return null;

  const candidate = record as Partial<LevelRecord>;
  if (typeof candidate.levelId !== 'string') return null;

  const levelIndex = Math.max(1, Math.min(GAME_LEVELS.length, Number(candidate.levelIndex ?? 1)));
  const lastPlayedAt = typeof candidate.lastPlayedAt === 'string' ? candidate.lastPlayedAt : null;
  const attempts = Math.max(0, Number(candidate.attempts ?? 0));
  const totalQuestions = Math.max(0, Number(candidate.totalQuestions ?? 0));
  const playedDates = parsePlayedDates(candidate.playedDates, lastPlayedAt);
  const masteredQuestionIds = parseQuestionIdList(candidate.masteredQuestionIds);
  const incorrectQuestionIds = parseQuestionIdList(candidate.incorrectQuestionIds).filter(
    (item) => !masteredQuestionIds.includes(item)
  );
  const questionMemory = parseQuestionMemory(
    (candidate as { questionMemory?: unknown }).questionMemory,
    masteredQuestionIds,
    incorrectQuestionIds,
    lastPlayedAt
  );
  const storedBestCorrectCount = Math.max(0, Number(candidate.bestCorrectCount ?? 0));
  const bestCorrectCount =
    masteredQuestionIds.length > 0
      ? Math.min(masteredQuestionIds.length, totalQuestions)
      : Math.min(storedBestCorrectCount, totalQuestions);
  const bestScore =
    totalQuestions > 0
      ? calculateLevelProgressPercentage(bestCorrectCount, totalQuestions)
      : Math.max(0, Math.min(100, Number(candidate.bestScore ?? 0)));
  const unlockTargetCount = totalQuestions > 0 ? getLevelUnlockTargetCount(totalQuestions) : 0;

  return {
    levelId: candidate.levelId,
    levelIndex,
    attempts,
    bestScore,
    lastScore: Math.max(0, Math.min(100, Number(candidate.lastScore ?? 0))),
    bestCorrectCount,
    lastCorrectCount: Math.max(0, Number(candidate.lastCorrectCount ?? 0)),
    totalQuestions,
    lastPlayedAt,
    playedDates,
    dailyAttempts: parseDailyAttempts((candidate as { dailyAttempts?: unknown }).dailyAttempts, playedDates, lastPlayedAt, attempts),
    masteredQuestionIds,
    incorrectQuestionIds,
    questionMemory,
    isCompleted: totalQuestions > 0 && bestCorrectCount >= unlockTargetCount,
  };
};

const parseLegacyLearnerName = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim() : 'Ikaslea';

export const createDefaultLearnerName = (playerCode: string): string => playerCode || 'Ikaslea';

export const createAuthPlayerIdentity = (params: {
  userId: string;
  email: string;
  code: string;
  createdAt?: string | null;
  lastLoginAt?: string | null;
}): PlayerIdentity => ({
  userId: params.userId,
  code: params.code,
  email: params.email,
  createdAt: params.createdAt || new Date().toISOString(),
  lastLoginAt: params.lastLoginAt ?? null,
});

const parseStoredProgress = (parsed: Record<string, unknown>): GameProgress => {
  const learnerName = parseLegacyLearnerName(parsed.learnerName);
  const forcedUnlockLevels = sanitizeForcedUnlockLevels(
    (parsed as { forcedUnlockLevels?: unknown }).forcedUnlockLevels,
    (parsed as { forcedUnlockLevel?: unknown }).forcedUnlockLevel
  );

  const levelRecords = Array.isArray(parsed.levelRecords)
    ? parsed.levelRecords
        .map(parseStoredLevelRecord)
        .filter((record): record is LevelRecord => record !== null)
        .sort((left, right) => left.levelIndex - right.levelIndex)
    : [];

  return {
    learnerName,
    forcedUnlockLevels,
    levelRecords,
  };
};

const createRemoteProgressPayload = (
  player: PlayerIdentity,
  progress: GameProgress
): Pick<
  RemoteProgressRow,
  'owner_id' | 'player_code' | 'player_email' | 'learner_name' | 'level_records' | 'forced_unlock_levels' | 'forced_unlock_level'
> => ({
  owner_id: player.userId,
  player_code: player.code,
  player_email: player.email,
  learner_name: progress.learnerName.trim() || createDefaultLearnerName(player.code),
  level_records: progress.levelRecords,
  forced_unlock_levels: sanitizeForcedUnlockLevels(progress.forcedUnlockLevels),
  forced_unlock_level: getLegacyForcedUnlockLevel(progress.forcedUnlockLevels) ?? 1,
});

export const parseRemoteProgressRow = (row: Partial<RemoteProgressRow>, playerCode: string): GameProgress => {
  const learnerName =
    typeof row.learner_name === 'string' && row.learner_name.trim()
      ? row.learner_name.trim()
      : createDefaultLearnerName(playerCode);

  const levelRecords = Array.isArray(row.level_records)
    ? row.level_records
        .map(parseStoredLevelRecord)
        .filter((record): record is LevelRecord => record !== null)
        .sort((left, right) => left.levelIndex - right.levelIndex)
    : [];

  return {
    learnerName,
    forcedUnlockLevels: sanitizeForcedUnlockLevels(row.forced_unlock_levels, row.forced_unlock_level),
    levelRecords,
  };
};

export const createInitialProgress = (): GameProgress => ({
  learnerName: 'Ikaslea',
  forcedUnlockLevels: [],
  levelRecords: [],
});

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadLegacyGameProgress = (): GameProgress => {
  if (!canUseStorage()) return createInitialProgress();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return createInitialProgress();

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parseStoredProgress(parsed);
  } catch {
    return createInitialProgress();
  }
};

export const clearLegacyGameProgress = (): void => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore legacy cleanup failures.
  }
};

export const loadRemoteProgress = async (player: PlayerIdentity): Promise<{ progress: GameProgress; message: string | null }> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      progress: createInitialProgress(),
      message: 'Supabase ez dago prest; ezin da aurrerapena hodeian kargatu.',
    };
  }

  const primaryQueryResult = await supabase
    .from(playerProgressTable)
    .select(REMOTE_PROGRESS_SELECT)
    .eq('owner_id', player.userId)
    .maybeSingle();

  let data = primaryQueryResult.data as Partial<RemoteProgressRow> | null;
  let error = primaryQueryResult.error;
  const firstError = toDbError(error);
  if (isMissingColumnError(firstError, 'forced_unlock_levels')) {
    const fallbackQueryResult = await supabase
      .from(playerProgressTable)
      .select(LEGACY_REMOTE_PROGRESS_SELECT)
      .eq('owner_id', player.userId)
      .maybeSingle();

    data = fallbackQueryResult.data as Partial<RemoteProgressRow> | null;
    error = fallbackQueryResult.error;
  }

  if (error) {
    const dbError = toDbError(error);
    const prefix = isMissingTableError(dbError)
      ? `${playerProgressTable} taula falta da.`
      : isRowLevelSecurityError(dbError)
        ? 'RLS politikek aurrerapenaren taula blokeatzen dute.'
        : 'Ezin izan da urruneko aurrerapena kargatu.';

    return {
      progress: createInitialProgress(),
      message: `${prefix} ${dbError?.message ?? ''}`.trim(),
    };
  }

  if (data) {
    rememberForcedUnlockLevelsSupport(data);
    return {
      progress: parseRemoteProgressRow(data as Partial<RemoteProgressRow>, player.code),
      message: null,
    };
  }

  const legacyProgress = loadLegacyGameProgress();
  const initialProgress =
    legacyProgress.levelRecords.length > 0 || legacyProgress.learnerName !== 'Ikaslea'
      ? {
          ...legacyProgress,
          learnerName: player.code,
          forcedUnlockLevels: sanitizeForcedUnlockLevels(legacyProgress.forcedUnlockLevels),
        }
      : {
          ...createInitialProgress(),
          learnerName: player.code,
        };

  const saveResult = await savePlayerProgress(player, initialProgress);
  if (saveResult.ok) {
    clearLegacyGameProgress();
  }

  return {
    progress: initialProgress,
    message: saveResult.ok ? null : saveResult.message,
  };
};

export const savePlayerProgress = async (
  player: PlayerIdentity,
  progress: GameProgress
): Promise<PlayerProgressSyncResult> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase ez dago prest; ezin da aurrerapena hodeian gorde.',
    };
  }

  const legacyForcedUnlockLevel = getLegacyForcedUnlockLevel(progress.forcedUnlockLevels);
  const legacyPayload = {
    owner_id: player.userId,
    player_code: player.code,
    player_email: player.email,
    learner_name: progress.learnerName.trim() || createDefaultLearnerName(player.code),
    level_records: progress.levelRecords,
    forced_unlock_level: legacyForcedUnlockLevel ?? 1,
  };

  let error = null as DbErrorLike | null;

  if (forcedUnlockLevelsColumnSupport === false) {
    if (legacyForcedUnlockLevel === null) {
      return {
        ok: false,
        message: 'Aktibazio anitzak gordetzeko irakaslearen SQL script berria exekutatu behar da.',
      };
    }

    const fallbackResult = await supabase
      .from(playerProgressTable)
      .upsert(legacyPayload, { onConflict: 'owner_id' });

    error = toDbError(fallbackResult.error);
  } else {
    const upsertResult = await supabase
      .from(playerProgressTable)
      .upsert(createRemoteProgressPayload(player, progress), { onConflict: 'owner_id' });

    error = toDbError(upsertResult.error);

    if (!error) {
      setForcedUnlockLevelsColumnSupport(true);
    } else if (isMissingColumnError(error, 'forced_unlock_levels')) {
      setForcedUnlockLevelsColumnSupport(false);

      if (legacyForcedUnlockLevel === null) {
        return {
          ok: false,
          message: 'Aktibazio anitzak gordetzeko irakaslearen SQL script berria exekutatu behar da.',
        };
      }

      const fallbackResult = await supabase
        .from(playerProgressTable)
        .upsert(legacyPayload, { onConflict: 'owner_id' });

      error = toDbError(fallbackResult.error);
    }
  }

  if (error) {
    const prefix = isMissingTableError(error)
      ? `${playerProgressTable} taula falta da.`
      : isRowLevelSecurityError(error)
        ? 'RLS politikek aurrerapenaren taula blokeatzen dute.'
        : 'Ezin izan da urruneko aurrerapena gorde.';

    return {
      ok: false,
      message: `${prefix} ${error.message ?? ''}`.trim(),
    };
  }

  return {
    ok: true,
    message: null,
  };
};
