import { isSupabaseConfigured, playerProgressTable, supabase, synonymsTable } from '../supabaseClient';
import type { SynonymEntry, TeacherPlayerOverview, TeacherOperationResult, TeacherPlayerAccessInput, TeacherWordInput } from './types';
import { ADMIN_PLAYER_CODE, GAME_LEVELS, SUPERADMIN_PLAYER_CODE } from './constants';
import {
  toDbError,
  isMissingColumnError,
  isMissingFunctionError,
  forcedUnlockLevelsColumnSupport,
  setForcedUnlockLevelsColumnSupport,
  rememberForcedUnlockLevelsSupportFromRows,
  REMOTE_PROGRESS_SELECT,
  LEGACY_REMOTE_PROGRESS_SELECT,
  type DbErrorLike,
  type RemoteProgressRow,
} from './db';
import {
  parseRemoteProgressRow,
  sanitizeForcedUnlockLevels,
  getLegacyForcedUnlockLevel,
} from './storage';
import { normalizePlayerCode, parseLevelOrder } from './parsing';
import { uniqueNonEmptyStrings } from '../wordUtils';
import { getResolvedLevelRecord, getUnlockedLevels, isLevelUnlocked } from './progress';
import { getTotalGamesPlayed, getConsecutivePlayDays } from './stats';

const buildTeacherPlayerOverview = (
  row: Partial<RemoteProgressRow>,
  entries: SynonymEntry[]
): TeacherPlayerOverview | null => {
  if (typeof row.owner_id !== 'string' || typeof row.player_code !== 'string' || typeof row.player_email !== 'string') {
    return null;
  }

  const progress = parseRemoteProgressRow(row, row.player_code);
  const completedLevels = GAME_LEVELS.filter((level) => getResolvedLevelRecord(progress, entries, level)?.isCompleted).length;
  const unlockedLevels = getUnlockedLevels(progress, entries).length;
  const currentLevel =
    GAME_LEVELS.find((level) => isLevelUnlocked(progress, level.index, entries) && !getResolvedLevelRecord(progress, entries, level)?.isCompleted)
    ?? getUnlockedLevels(progress, entries).at(-1)
    ?? GAME_LEVELS[0];
  const bestScore = GAME_LEVELS.reduce((best, level) => Math.max(best, getResolvedLevelRecord(progress, entries, level)?.bestScore ?? 0), 0);

  return {
    ownerId: row.owner_id,
    playerCode: row.player_code,
    playerEmail: row.player_email,
    learnerName: progress.learnerName,
    forcedUnlockLevels: sanitizeForcedUnlockLevels(row.forced_unlock_levels, row.forced_unlock_level),
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
    progress,
    completedLevels,
    unlockedLevels,
    currentLevelName: currentLevel.name,
    bestScore,
    totalGamesPlayed: getTotalGamesPlayed(progress),
    consecutivePlayDays: getConsecutivePlayDays(progress),
  };
};

const buildTeacherWordPayload = (input: TeacherWordInput): { word: string; synonyms: string[]; group_number: number } | null => {
  const word = input.word.trim();
  const synonyms = uniqueNonEmptyStrings(input.synonyms);
  const levelOrder = parseLevelOrder(input.levelOrder);

  if (!word || synonyms.length === 0 || !levelOrder) {
    return null;
  }

  return {
    word,
    synonyms,
    group_number: levelOrder,
  };
};

export const loadTeacherPlayers = async (entries: SynonymEntry[]): Promise<{ ok: boolean; players: TeacherPlayerOverview[]; message: string }> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      players: [],
      message: 'Supabase ez dago prest; ezin dira jokalariak kargatu.',
    };
  }

  const rpcResult = await supabase.rpc('teacher_list_players');
  let data = (rpcResult.data ?? []) as Partial<RemoteProgressRow>[];
  let error = rpcResult.error;
  const rpcError = toDbError(error);

  if (isMissingFunctionError(rpcError, 'teacher_list_players')) {
    const primaryQueryResult = await supabase
      .from(playerProgressTable)
      .select(REMOTE_PROGRESS_SELECT)
      .order('player_code', { ascending: true });

    data = (primaryQueryResult.data ?? []) as Partial<RemoteProgressRow>[];
    error = primaryQueryResult.error;
    const firstError = toDbError(error);
    if (isMissingColumnError(firstError, 'forced_unlock_levels')) {
      const fallbackQueryResult = await supabase
        .from(playerProgressTable)
        .select(LEGACY_REMOTE_PROGRESS_SELECT)
        .order('player_code', { ascending: true });

      data = (fallbackQueryResult.data ?? []) as Partial<RemoteProgressRow>[];
      error = fallbackQueryResult.error;
    }
  }

  if (error) {
    return {
      ok: false,
      players: [],
      message: `Ezin izan dira jokalariak kargatu: ${error.message}`,
    };
  }

  const players = (data ?? [])
    .map((row) => buildTeacherPlayerOverview(row as Partial<RemoteProgressRow>, entries))
    .filter((player): player is TeacherPlayerOverview => player !== null)
    .filter((player) => player.playerCode !== SUPERADMIN_PLAYER_CODE);

  rememberForcedUnlockLevelsSupportFromRows(data);

  return {
    ok: true,
    players,
    message: `${players.length} jokalari kargatu dira.`,
  };
};

export const createPlayerByTeacher = async (codeInput: string, passwordInput: string): Promise<TeacherOperationResult> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase ez dago prest; ezin da jokalaria sortu.',
    };
  }

  const playerCode = normalizePlayerCode(codeInput);
  const password = passwordInput.trim();

  if (!playerCode) {
    return {
      ok: false,
      message: 'Erabiltzaile kodea idatzi behar duzu.',
    };
  }

  if (!/^[a-z0-9_-]+$/.test(playerCode)) {
    return {
      ok: false,
      message: 'Kodeak letrak, zenbakiak, marratxoa edo azpimarra bakarrik izan ditzake.',
    };
  }

  if (playerCode === ADMIN_PLAYER_CODE || playerCode === SUPERADMIN_PLAYER_CODE) {
    return {
      ok: false,
      message: `${playerCode} kodea erreserbatuta dago.`,
    };
  }

  if (!password) {
    return {
      ok: false,
      message: 'Pasahitza idatzi behar da.',
    };
  }

  if (password.length < 3) {
    return {
      ok: false,
      message: 'Pasahitzak gutxienez 3 karaktere izan behar ditu.',
    };
  }

  const { error } = await supabase.rpc('teacher_create_player_access', {
    next_player_code: playerCode,
    next_password: password,
    next_learner_name: playerCode,
  });

  if (error) {
    const errorMessage = error.message.toLowerCase();
    const missingFunction =
      error.code === '42883'
      || error.code === 'PGRST202'
      || errorMessage.includes('teacher_create_player_access');

    return {
      ok: false,
      message: missingFunction
        ? 'Irakaslearen SQL script berria exekutatu behar da jokalariak sortu ahal izateko.'
        : errorMessage.includes('already') || errorMessage.includes('lehendik')
          ? 'Erabiltzaile hori lehendik existitzen da.'
          : `Ezin izan da jokalaria sortu: ${error.message}`,
    };
  }

  return {
    ok: true,
    message: `${playerCode} jokalaria sortu da.`,
  };
};

export const updateTeacherPlayerAccess = async (
  ownerId: string,
  input: TeacherPlayerAccessInput
): Promise<TeacherOperationResult> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase ez dago prest; ezin dira jokalariaren datuak eguneratu.',
    };
  }

  const playerCode = normalizePlayerCode(input.playerCode);
  const learnerName = input.learnerName.trim();
  const password = input.password?.trim() ?? '';

  if (!playerCode) {
    return {
      ok: false,
      message: 'Erabiltzaile kodea idatzi behar duzu.',
    };
  }

  if (!/^[a-z0-9_-]+$/.test(playerCode)) {
    return {
      ok: false,
      message: 'Kodeak letrak, zenbakiak, marratxoa edo azpimarra bakarrik izan ditzake.',
    };
  }

  if (playerCode === ADMIN_PLAYER_CODE || playerCode === SUPERADMIN_PLAYER_CODE) {
    return {
      ok: false,
      message: `${playerCode} kodea erreserbatuta dago.`,
    };
  }

  if (password && password.length < 3) {
    return {
      ok: false,
      message: 'Pasahitzak gutxienez 3 karaktere izan behar ditu.',
    };
  }

  const { error } = await supabase.rpc('teacher_update_player_access', {
    target_owner_id: ownerId,
    next_player_code: playerCode,
    next_learner_name: learnerName || null,
    next_password: password || null,
  });

  if (error) {
    const dbError = toDbError(error);
    const missingFunction = isMissingFunctionError(dbError, 'teacher_update_player_access');
    const extra = [dbError?.details, dbError?.hint].filter(Boolean).join(' ');

    return {
      ok: false,
      message: missingFunction
        ? 'Irakaslearen SQL script berria exekutatu behar da jokalariaren sarbidea eguneratu ahal izateko.'
        : `Ezin izan dira jokalariaren datuak eguneratu: ${error.message}${extra ? ` ${extra}` : ''}`,
    };
  }

  return {
    ok: true,
    message: `${playerCode} jokalariaren sarbidea eguneratu da.`,
  };
};

export const deletePlayerByTeacher = async (player: TeacherPlayerOverview): Promise<TeacherOperationResult> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase ez dago prest; ezin da jokalaria ezabatu.',
    };
  }

  if (player.playerCode === ADMIN_PLAYER_CODE || player.playerCode === SUPERADMIN_PLAYER_CODE) {
    return {
      ok: false,
      message: 'Administratzailea ezin da ezabatu.',
    };
  }

  const { error } = await supabase.rpc('teacher_delete_player_account', {
    target_owner_id: player.ownerId,
  });

  if (error) {
    const dbError = toDbError(error);
    const missingFunction = isMissingFunctionError(dbError, 'teacher_delete_player_account');
    const extra = [dbError?.details, dbError?.hint].filter(Boolean).join(' ');

    return {
      ok: false,
      message: missingFunction
        ? 'Irakaslearen SQL script berria exekutatu behar da jokalaria ezabatu ahal izateko.'
        : `Ezin izan da ${player.playerCode} jokalaria ezabatu: ${error.message}${extra ? ` ${extra}` : ''}`,
    };
  }

  return {
    ok: true,
    message: `${player.playerCode} jokalaria ezabatu da.`,
  };
};

export const resetPlayerProgressByTeacher = async (player: TeacherPlayerOverview): Promise<TeacherOperationResult> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase ez dago prest; ezin da jokalariaren aurrerapena ezabatu.',
    };
  }

  let error = null as DbErrorLike | null;

  if (forcedUnlockLevelsColumnSupport === false) {
    const fallbackResult = await supabase
      .from(playerProgressTable)
      .update({
        learner_name: player.learnerName,
        level_records: [],
        forced_unlock_level: 1,
      })
      .eq('owner_id', player.ownerId);

    error = toDbError(fallbackResult.error);
  } else {
    const updateResult = await supabase
      .from(playerProgressTable)
      .update({
        learner_name: player.learnerName,
        level_records: [],
        forced_unlock_levels: [],
        forced_unlock_level: 1,
      })
      .eq('owner_id', player.ownerId);

    error = toDbError(updateResult.error);

    if (!error) {
      setForcedUnlockLevelsColumnSupport(true);
    } else if (isMissingColumnError(error, 'forced_unlock_levels')) {
      setForcedUnlockLevelsColumnSupport(false);

      const fallbackResult = await supabase
        .from(playerProgressTable)
        .update({
          learner_name: player.learnerName,
          level_records: [],
          forced_unlock_level: 1,
        })
        .eq('owner_id', player.ownerId);

      error = toDbError(fallbackResult.error);
    }
  }

  if (error) {
    return {
      ok: false,
      message: `Ezin izan dira ${player.playerCode} jokalariaren datuak garbitu: ${error.message}`,
    };
  }

  return {
    ok: true,
    message: `${player.playerCode} jokalariaren datuak garbitu dira.`,
  };
};

export const setPlayerForcedUnlockLevels = async (ownerId: string, levelIndexes: number[]): Promise<TeacherOperationResult> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase ez dago prest; ezin dira mailak aktibatu.',
    };
  }

  const forcedUnlockLevels = sanitizeForcedUnlockLevels(levelIndexes);
  const legacyForcedUnlockLevel = getLegacyForcedUnlockLevel(forcedUnlockLevels);
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
      .update({
        forced_unlock_level: legacyForcedUnlockLevel,
      })
      .eq('owner_id', ownerId);

    error = toDbError(fallbackResult.error);
  } else {
    const updateResult = await supabase
      .from(playerProgressTable)
      .update({
        forced_unlock_levels: forcedUnlockLevels,
        forced_unlock_level: legacyForcedUnlockLevel ?? 1,
      })
      .eq('owner_id', ownerId);

    error = toDbError(updateResult.error);

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
        .update({
          forced_unlock_level: legacyForcedUnlockLevel,
        })
        .eq('owner_id', ownerId);

      error = toDbError(fallbackResult.error);
    }
  }

  if (error) {
    return {
      ok: false,
      message: `Ezin izan dira mailak aktibatu: ${error.message}`,
    };
  }

  return {
    ok: true,
    message: forcedUnlockLevels.length > 0
      ? `${forcedUnlockLevels.length} mendi eskuz aktibatu dira.`
      : 'Eskuzko aktibazioak kendu dira.',
  };
};

export const createTeacherWord = async (input: TeacherWordInput): Promise<TeacherOperationResult> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase ez dago prest; ezin da hitza gorde.',
    };
  }

  const payload = buildTeacherWordPayload(input);
  if (!payload) {
    return {
      ok: false,
      message: 'Hitza, sinonimoak eta maila behar dira.',
    };
  }

  const { error } = await supabase.from(synonymsTable).insert(payload);
  if (error) {
    return {
      ok: false,
      message: `Ezin izan da hitza sortu: ${error.message}`,
    };
  }

  return {
    ok: true,
    message: `${payload.word} hitza gorde da.`,
  };
};

export const updateTeacherWord = async (wordId: string, input: TeacherWordInput): Promise<TeacherOperationResult> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase ez dago prest; ezin da hitza eguneratu.',
    };
  }

  const payload = buildTeacherWordPayload(input);
  if (!payload) {
    return {
      ok: false,
      message: 'Hitza, sinonimoak eta maila behar dira.',
    };
  }

  const { error } = await supabase.from(synonymsTable).update(payload).eq('id', wordId);
  if (error) {
    return {
      ok: false,
      message: `Ezin izan da hitza eguneratu: ${error.message}`,
    };
  }

  return {
    ok: true,
    message: `${payload.word} hitza eguneratu da.`,
  };
};
