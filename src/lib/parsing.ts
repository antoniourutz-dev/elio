import {
  GAME_LEVELS,
  LEVEL_TARGET_QUESTION_COUNTS,
  PLAYER_EMAIL_DOMAIN,
  WORD_FIELDS,
  SYNONYM_FIELDS,
  DIFFICULTY_FIELDS,
  THEME_FIELDS,
  TRANSLATION_FIELDS,
  EXAMPLE_FIELDS,
  TAG_FIELDS,
  ACTIVE_FIELDS,
  ID_FIELDS,
  LEVEL_ORDER_FIELDS,
} from './constants';
import { getFirstValue, parseSynonyms, toStringValue, uniqueNonEmptyStrings } from '../wordUtils';
import type { SynonymEntry } from './types';

export const normalizeTextKey = (value: string): string => value.trim().toLowerCase();
export const normalizePlayerCode = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, '');
export const buildPlayerEmail = (playerCode: string): string => `${normalizePlayerCode(playerCode)}@${PLAYER_EMAIL_DOMAIN}`;
export const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const buildLocalDayKey = (value: Date | string): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parsePlayedDates = (value: unknown, lastPlayedAt: string | null): string[] => {
  const dates = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && DAY_KEY_PATTERN.test(item))
    : [];

  if (dates.length > 0) {
    return Array.from(new Set(dates)).sort((left, right) => left.localeCompare(right, 'eu'));
  }

  if (!lastPlayedAt) return [];
  return [buildLocalDayKey(lastPlayedAt)];
};

export const parseQuestionIdList = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(
        new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()))
      )
    : [];

export const parseDailyAttempts = (value: unknown, playedDates: string[], lastPlayedAt: string | null, attempts: number): Record<string, number> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const parsed = Object.entries(value).reduce<Record<string, number>>((accumulator, [dayKey, count]) => {
      if (!DAY_KEY_PATTERN.test(dayKey)) return accumulator;

      const normalizedCount = Math.max(0, Math.floor(Number(count ?? 0)));
      if (normalizedCount > 0) {
        accumulator[dayKey] = normalizedCount;
      }
      return accumulator;
    }, {});

    if (Object.keys(parsed).length > 0) {
      return parsed;
    }
  }

  if (playedDates.length === 0 && !lastPlayedAt) {
    return {};
  }

  const fallbackDayKeys = playedDates.length > 0 ? playedDates : lastPlayedAt ? [buildLocalDayKey(lastPlayedAt)] : [];
  return fallbackDayKeys.reduce<Record<string, number>>((accumulator, dayKey) => {
    if (Object.keys(accumulator).length >= Math.max(1, attempts)) return accumulator;
    accumulator[dayKey] = 1;
    return accumulator;
  }, {});
};

export const calculateLevelProgressPercentage = (masteredCount: number, totalQuestions: number): number => {
  if (totalQuestions <= 0) return 0;
  return Math.round((masteredCount / totalQuestions) * 100);
};

export const parseNumberValue = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseBooleanValue = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['true', '1', 'yes', 'si', 'bai'].includes(normalized)) return true;
  if (['false', '0', 'no', 'ez'].includes(normalized)) return false;
  return null;
};

export const parseDifficulty = (value: unknown): number | null => {
  const parsed = parseNumberValue(value);
  if (!parsed || !Number.isInteger(parsed) || parsed < 1 || parsed > 4) {
    return null;
  }
  return parsed;
};

export const parseLevelOrder = (value: unknown): number | null => {
  const parsed = parseNumberValue(value);
  if (!parsed || !Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
};

export const parseTags = (value: unknown): string[] => uniqueNonEmptyStrings(parseSynonyms(value));

export const normalizeSynonymRow = (row: Record<string, unknown>, index: number): SynonymEntry | null => {
  const word = toStringValue(getFirstValue(row, WORD_FIELDS));
  if (!word) return null;

  const isActive = parseBooleanValue(getFirstValue(row, ACTIVE_FIELDS));
  if (isActive === false) return null;

  const synonyms = uniqueNonEmptyStrings(parseSynonyms(getFirstValue(row, SYNONYM_FIELDS))).filter(
    (item) => normalizeTextKey(item) !== normalizeTextKey(word)
  );
  if (synonyms.length === 0) return null;

  const rawId = toStringValue(getFirstValue(row, ID_FIELDS));

  return {
    id: rawId || `${word}-${index}`,
    word,
    synonyms,
    difficulty: parseDifficulty(getFirstValue(row, DIFFICULTY_FIELDS)),
    theme: toStringValue(getFirstValue(row, THEME_FIELDS)) || null,
    translation: toStringValue(getFirstValue(row, TRANSLATION_FIELDS)) || null,
    example: toStringValue(getFirstValue(row, EXAMPLE_FIELDS)) || null,
    tags: parseTags(getFirstValue(row, TAG_FIELDS)),
    levelOrder: parseLevelOrder(getFirstValue(row, LEVEL_ORDER_FIELDS)),
  };
};

export const sortEntries = (entries: SynonymEntry[]): SynonymEntry[] =>
  [...entries].sort((left, right) => {
    const levelCompare = (left.levelOrder ?? 999) - (right.levelOrder ?? 999);
    if (levelCompare !== 0) return levelCompare;

    const difficultyCompare = (left.difficulty ?? 999) - (right.difficulty ?? 999);
    if (difficultyCompare !== 0) return difficultyCompare;

    const wordCompare = left.word.localeCompare(right.word, 'eu');
    if (wordCompare !== 0) return wordCompare;

    return String(left.id).localeCompare(String(right.id), 'eu');
  });

export const buildEntryTerms = (entry: SynonymEntry): string[] => uniqueNonEmptyStrings([entry.word, ...entry.synonyms]);

export const redistributeEntriesByQuestionTargets = (entries: SynonymEntry[]): SynonymEntry[] => {
  if (entries.length === 0) return [];

  const sortedEntries = sortEntries(entries);
  const totalLevels = GAME_LEVELS.length;
  let currentLevelIndex = 0;
  let currentLevelQuestions = 0;

  return sortedEntries.map((entry, entryIndex) => {
    const contribution = buildEntryTerms(entry).length;
    const target = LEVEL_TARGET_QUESTION_COUNTS[currentLevelIndex] ?? LEVEL_TARGET_QUESTION_COUNTS.at(-1) ?? contribution;
    const remainingEntries = sortedEntries.length - entryIndex;
    const remainingLevels = totalLevels - currentLevelIndex;
    const wouldOvershoot = currentLevelQuestions + contribution > target;
    const currentDistance = Math.abs(target - currentLevelQuestions);
    const nextDistance = Math.abs(target - (currentLevelQuestions + contribution));
    const canAdvance = currentLevelIndex < totalLevels - 1 && remainingEntries > remainingLevels;

    if (canAdvance && currentLevelQuestions > 0 && (currentLevelQuestions >= target || (wouldOvershoot && currentDistance <= nextDistance))) {
      currentLevelIndex += 1;
      currentLevelQuestions = 0;
    }

    currentLevelQuestions += contribution;

    return {
      ...entry,
      levelOrder: currentLevelIndex + 1,
    };
  });
};

export const parsePlayerCodeFromEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const [localPart] = email.toLowerCase().split('@');
  const code = normalizePlayerCode(localPart ?? '');
  return code || null;
};
