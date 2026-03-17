import { isSupabaseConfigured, playerProgressTable, supabase, synonymsTable } from './supabaseClient';
import { getFirstValue, parseSynonyms, toStringValue, uniqueNonEmptyStrings } from './wordUtils';

const STORAGE_KEY = 'lexikoa.euskera.levels.v2';
const LEGACY_STORAGE_KEY = 'lexikoa.euskera.daily.v1';
const PLAYER_EMAIL_DOMAIN = import.meta.env.VITE_SUPABASE_PLAYER_EMAIL_DOMAIN || 'lexiko.app';
const WORD_FIELDS = ['basque_word', 'hitza', 'word', 'term', 'name'];
const SYNONYM_FIELDS = ['synonyms', 'sinonimoak', 'synonym_list'];
const DIFFICULTY_FIELDS = ['difficulty', 'level', 'maila'];
const THEME_FIELDS = ['theme', 'category', 'topic'];
const TRANSLATION_FIELDS = ['translation_es', 'translation', 'meaning_es'];
const EXAMPLE_FIELDS = ['example_sentence', 'example', 'usage_example'];
const TAG_FIELDS = ['tags', 'labels'];
const ACTIVE_FIELDS = ['active', 'enabled', 'published'];
const ID_FIELDS = ['id', 'uuid', 'word_id'];
const LEVEL_ORDER_FIELDS = ['group_number', 'group_num', 'exercise_order', 'exercise'];

const QUESTIONS_PER_LEVEL = 10;
const LEVEL_PASS_SCORE = 70;
const LEVEL_MOUNTAINS = [
  { name: 'Aitxuri', elevationMeters: 1551 },
  { name: 'Aizkorri', elevationMeters: 1528 },
  { name: 'Gorbea', elevationMeters: 1482 },
  { name: 'Anboto', elevationMeters: 1331 },
  { name: 'Txindoki', elevationMeters: 1346 },
  { name: 'Aratz', elevationMeters: 1445 },
  { name: 'Ernio', elevationMeters: 1075 },
  { name: 'Oiz', elevationMeters: 1026 },
  { name: 'Ganekogorta', elevationMeters: 999 },
  { name: 'Jaizkibel', elevationMeters: 543 },
] as const;
export const ADMIN_PLAYER_CODE = 'irakasle';

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

interface LevelQuestionSeed {
  id: string;
  promptWord: string;
  answerTerms: string[];
  sourceEntry: SynonymEntry;
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

export const GAME_LEVELS: GameLevel[] = LEVEL_MOUNTAINS.map(({ name, elevationMeters }, index) => ({
  id: `level-${index + 1}`,
  index: index + 1,
  name,
  elevationMeters,
}));

const DEMO_SYNONYM_BANK: SynonymEntry[] = [
  { id: 'demo-1', word: 'maite', synonyms: ['laket', 'atsegin', 'gogoko'], difficulty: 1, theme: 'sentimenduak', translation: 'maitatua', example: 'Lagun maite bat dut.', tags: ['demo'], levelOrder: 1 },
  { id: 'demo-2', word: 'gomutatu', synonyms: ['gogoratu', 'oroitu'], difficulty: 1, theme: 'oroimena', translation: 'oroitu', example: 'Atzokoa gomutatu dut.', tags: ['demo'], levelOrder: 1 },
  { id: 'demo-3', word: 'iruditu', synonyms: ['begitandu', 'irudikatu'], difficulty: 2, theme: 'iritzia', translation: 'antza izan', example: 'Ondo iruditu zait.', tags: ['demo'], levelOrder: 2 },
  { id: 'demo-4', word: 'gehitu', synonyms: ['erantsi', 'txertatu'], difficulty: 1, theme: 'ekintzak', translation: 'erantsi', example: 'Esaldi bat gehitu du.', tags: ['demo'], levelOrder: 2 },
  { id: 'demo-5', word: 'usna', synonyms: ['suma', 'usain'], difficulty: 1, theme: 'zentzumenak', translation: 'usaimena', example: 'Usna fina du.', tags: ['demo'], levelOrder: 3 },
  { id: 'demo-6', word: 'adi', synonyms: ['erne', 'tentuz'], difficulty: 1, theme: 'arreta', translation: 'erne', example: 'Adi entzun irakasleari.', tags: ['demo'], levelOrder: 3 },
  { id: 'demo-7', word: 'landu', synonyms: ['jorratu', 'sakondu'], difficulty: 2, theme: 'ikasketa', translation: 'jorratu', example: 'Gai hau ondo landu dugu.', tags: ['demo'], levelOrder: 4 },
  { id: 'demo-8', word: 'zaildu', synonyms: ['gogortu', 'korapilatu'], difficulty: 2, theme: 'zailtasuna', translation: 'gogortu', example: 'Ariketa zaildu egin da.', tags: ['demo'], levelOrder: 4 },
  { id: 'demo-9', word: 'belztu', synonyms: ['ilundu', 'beltzarandu'], difficulty: 2, theme: 'koloreak', translation: 'ilundu', example: 'Zerua belztu da.', tags: ['demo'], levelOrder: 5 },
  { id: 'demo-10', word: 'sotil', synonyms: ['fin', 'lirain', 'dotore'], difficulty: 2, theme: 'deskribapenak', translation: 'findua', example: 'Keinu sotila egin du.', tags: ['demo'], levelOrder: 5 },
  { id: 'demo-11', word: 'kokote', synonyms: ['garondo', 'lepoondo'], difficulty: 2, theme: 'gorputza', translation: 'garondoa', example: 'Kokotean mina du.', tags: ['demo'], levelOrder: 6 },
  { id: 'demo-12', word: 'ahope', synonyms: ['xuxurlaz', 'isilpean'], difficulty: 1, theme: 'komunikazioa', translation: 'xuxurlaz', example: 'Ahope hitz egin dute.', tags: ['demo'], levelOrder: 6 },
  { id: 'demo-13', word: 'bitar', synonyms: ['artean', 'bien bitartean'], difficulty: 1, theme: 'denbora', translation: 'artean', example: 'Ni bitar laguna etorri da.', tags: ['demo'], levelOrder: 7 },
  { id: 'demo-14', word: 'lepo', synonyms: ['sama', 'zama', 'karga'], difficulty: 2, theme: 'gorputza', translation: 'sama', example: 'Lepoa tente dauka.', tags: ['demo'], levelOrder: 7 },
  { id: 'demo-15', word: 'azkar', synonyms: ['bizkor', 'arin'], difficulty: 1, theme: 'abiadura', translation: 'bizkor', example: 'Ikaslea oso azkarra da.', tags: ['demo'], levelOrder: 8 },
  { id: 'demo-16', word: 'eder', synonyms: ['polita', 'dotore', 'lirain'], difficulty: 1, theme: 'deskribapenak', translation: 'polita', example: 'Egun ederra egin du.', tags: ['demo'], levelOrder: 8 },
  { id: 'demo-17', word: 'sendotu', synonyms: ['indartu', 'finkatu'], difficulty: 3, theme: 'hazkundea', translation: 'indartu', example: 'Ohitura onak sendotu dira.', tags: ['demo'], levelOrder: 9 },
  { id: 'demo-18', word: 'nahasi', synonyms: ['korapilatu', 'katramilatu'], difficulty: 3, theme: 'egoerak', translation: 'nahastu', example: 'Kontua nahasi egin da.', tags: ['demo'], levelOrder: 9 },
  { id: 'demo-19', word: 'argitu', synonyms: ['xehaztu', 'garbitu'], difficulty: 3, theme: 'ulermena', translation: 'argi utzi', example: 'Irakasleak zalantza argitu du.', tags: ['demo'], levelOrder: 10 },
  { id: 'demo-20', word: 'mardul', synonyms: ['trinko', 'oparo'], difficulty: 3, theme: 'deskribapenak', translation: 'oparo', example: 'Testu mardula irakurri dugu.', tags: ['demo'], levelOrder: 10 },
];

const normalizeTextKey = (value: string): string => value.trim().toLowerCase();
const normalizePlayerCode = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, '');
export const buildPlayerEmail = (playerCode: string): string => `${normalizePlayerCode(playerCode)}@${PLAYER_EMAIL_DOMAIN}`;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const buildLocalDayKey = (value: Date | string): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parsePlayedDates = (value: unknown, lastPlayedAt: string | null): string[] => {
  const dates = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && DAY_KEY_PATTERN.test(item))
    : [];

  if (dates.length > 0) {
    return Array.from(new Set(dates)).sort((left, right) => left.localeCompare(right, 'eu'));
  }

  if (!lastPlayedAt) return [];
  return [buildLocalDayKey(lastPlayedAt)];
};

const parseQuestionIdList = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(
        new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()))
      )
    : [];

const parseDailyAttempts = (value: unknown, playedDates: string[], lastPlayedAt: string | null, attempts: number): Record<string, number> => {
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

const calculateLevelProgressPercentage = (masteredCount: number, totalQuestions: number): number => {
  if (totalQuestions <= 0) return 0;
  return Math.round((masteredCount / totalQuestions) * 100);
};

const takeRandomEntries = <T,>(items: T[], count: number, rng: () => number): T[] =>
  shuffleWithRng(items, rng).slice(0, Math.max(0, count));

const buildEntryTerms = (entry: SynonymEntry): string[] => uniqueNonEmptyStrings([entry.word, ...entry.synonyms]);

const buildLevelQuestionSeeds = (entries: SynonymEntry[], levelIndex: number): LevelQuestionSeed[] =>
  entries
    .filter((entry) => entry.levelOrder === levelIndex)
    .flatMap((entry) => {
      const terms = buildEntryTerms(entry);

      return terms
        .map((term) => {
          const answerTerms = terms.filter((candidate) => normalizeTextKey(candidate) !== normalizeTextKey(term));
          if (answerTerms.length === 0) return null;

          return {
            id: `${entry.id}::${normalizeTextKey(term)}`,
            promptWord: term,
            answerTerms,
            sourceEntry: entry,
          } satisfies LevelQuestionSeed;
        })
        .filter((seed): seed is LevelQuestionSeed => seed !== null);
    });

const parsePlayerCodeFromEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const [localPart] = email.toLowerCase().split('@');
  const code = normalizePlayerCode(localPart ?? '');
  return code || null;
};

const sanitizeForcedUnlockLevels = (value: unknown, legacyValue?: unknown): number[] => {
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

const getLegacyForcedUnlockLevel = (levels: number[]): number | null => {
  const sanitized = sanitizeForcedUnlockLevels(levels);
  if (sanitized.length === 0) return 1;

  for (let index = 0; index < sanitized.length; index += 1) {
    if (sanitized[index] !== index + 2) {
      return null;
    }
  }

  return sanitized[sanitized.length - 1] ?? 1;
};

export const isTeacherPlayer = (player: Pick<PlayerIdentity, 'code'> | null | undefined): boolean =>
  normalizePlayerCode(player?.code ?? '') === ADMIN_PLAYER_CODE;

interface DbErrorLike {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

interface RemoteProgressRow {
  owner_id: string;
  player_code: string;
  player_email: string;
  learner_name: string;
  level_records: unknown;
  forced_unlock_levels: number[] | null;
  forced_unlock_level: number | null;
  created_at: string;
  updated_at: string;
}

const toDbError = (error: unknown): DbErrorLike | null => {
  if (!error || typeof error !== 'object') return null;
  if (!('message' in error) || typeof error.message !== 'string') return null;
  return error as DbErrorLike;
};

const isMissingTableError = (error: DbErrorLike | null): boolean => {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;

  const joined = `${error.message} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return joined.includes('does not exist') || joined.includes('not found');
};

const isRowLevelSecurityError = (error: DbErrorLike | null): boolean => {
  if (!error) return false;
  if (error.code === '42501') return true;

  const joined = `${error.message} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return joined.includes('row-level security') || joined.includes('rls');
};

const isMissingColumnError = (error: DbErrorLike | null, columnName: string): boolean => {
  if (!error) return false;
  if (error.code === '42703') return true;

  const joined = `${error.message} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return joined.includes(columnName.toLowerCase());
};

const isMissingFunctionError = (error: DbErrorLike | null, functionName: string): boolean => {
  if (!error) return false;
  if (error.code === '42883' || error.code === 'PGRST202') return true;

  const joined = `${error.message} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return joined.includes(functionName.toLowerCase());
};

const REMOTE_PROGRESS_SELECT = '*';
const LEGACY_REMOTE_PROGRESS_SELECT = '*';
let forcedUnlockLevelsColumnSupport: boolean | null = null;

const rememberForcedUnlockLevelsSupport = (value: unknown): void => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  forcedUnlockLevelsColumnSupport = Object.prototype.hasOwnProperty.call(value, 'forced_unlock_levels');
};

const rememberForcedUnlockLevelsSupportFromRows = (value: unknown): void => {
  if (!Array.isArray(value) || value.length === 0) return;
  rememberForcedUnlockLevelsSupport(value[0]);
};

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const parseNumberValue = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBooleanValue = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['true', '1', 'yes', 'si', 'bai'].includes(normalized)) return true;
  if (['false', '0', 'no', 'ez'].includes(normalized)) return false;
  return null;
};

const parseDifficulty = (value: unknown): number | null => {
  const parsed = parseNumberValue(value);
  if (!parsed || !Number.isInteger(parsed) || parsed < 1 || parsed > 4) {
    return null;
  }
  return parsed;
};

const parseLevelOrder = (value: unknown): number | null => {
  const parsed = parseNumberValue(value);
  if (!parsed || !Number.isInteger(parsed) || parsed < 1 || parsed > GAME_LEVELS.length) {
    return null;
  }
  return parsed;
};

const parseTags = (value: unknown): string[] => uniqueNonEmptyStrings(parseSynonyms(value));

const shuffleWithRng = <T,>(items: T[], rng: () => number): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const sortEntries = (entries: SynonymEntry[]): SynonymEntry[] =>
  [...entries].sort((left, right) => {
    const levelCompare = (left.levelOrder ?? 999) - (right.levelOrder ?? 999);
    if (levelCompare !== 0) return levelCompare;

    const difficultyCompare = (left.difficulty ?? 999) - (right.difficulty ?? 999);
    if (difficultyCompare !== 0) return difficultyCompare;

    const wordCompare = left.word.localeCompare(right.word, 'eu');
    if (wordCompare !== 0) return wordCompare;

    return String(left.id).localeCompare(String(right.id), 'eu');
  });

const normalizeSynonymRow = (row: Record<string, unknown>, index: number): SynonymEntry | null => {
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

const buildSupportText = (entry: SynonymEntry): string => {
  if (entry.example) {
    return `Adibidea: ${entry.example}`;
  }
  if (entry.theme) {
    return `Gaia: ${entry.theme}`;
  }
  return 'Aukeratu hitz honen sinonimo egokiena.';
};

const buildPrompt = (word: string): string => `"${word}" hitzaren sinonimoa aukeratu.`;

const buildQuestionFromSeed = (
  seed: LevelQuestionSeed,
  allEntries: SynonymEntry[],
  rng: () => number
): QuizQuestion | null => {
  const correctAnswer = shuffleWithRng(seed.answerTerms, rng)[0];
  const forbidden = new Set([seed.promptWord, ...seed.answerTerms].map(normalizeTextKey));

  const distractorPool = uniqueNonEmptyStrings(
    allEntries.flatMap((candidate) => buildEntryTerms(candidate))
  ).filter((candidate) => !forbidden.has(normalizeTextKey(candidate)));

  if (distractorPool.length < 3) {
    return null;
  }

  const options = shuffleWithRng([correctAnswer, ...shuffleWithRng(distractorPool, rng).slice(0, 3)], rng);

  return {
    id: seed.id,
    word: seed.promptWord,
    prompt: buildPrompt(seed.promptWord),
    supportText: buildSupportText(seed.sourceEntry),
    correctAnswer,
    options,
    translation: seed.sourceEntry.translation,
    example: seed.sourceEntry.example,
  };
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
    isCompleted: totalQuestions > 0 && bestCorrectCount >= unlockTargetCount,
  };
};

const parseLegacyLearnerName = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim() : 'Ikaslea';

const createDefaultLearnerName = (playerCode: string): string => playerCode || 'Ikaslea';

const createAuthPlayerIdentity = (params: {
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

const parseRemoteProgressRow = (row: Partial<RemoteProgressRow>, playerCode: string): GameProgress => {
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

const loadLegacyGameProgress = (): GameProgress => {
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

const clearLegacyGameProgress = (): void => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore legacy cleanup failures.
  }
};

const loadRemoteProgress = async (player: PlayerIdentity): Promise<{ progress: GameProgress; message: string | null }> => {
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

export const loadPlayerSessionState = async (): Promise<PlayerSessionState> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      player: null,
      progress: createInitialProgress(),
      message: 'Supabase ez dago prest.',
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return {
      player: null,
      progress: createInitialProgress(),
      message: sessionError.message,
    };
  }

  const user = session?.user;
  const code = parsePlayerCodeFromEmail(user?.email);
  if (!user || !code || !user.email) {
    return {
      player: null,
      progress: createInitialProgress(),
      message: null,
    };
  }

  const player = createAuthPlayerIdentity({
    userId: user.id,
    email: user.email,
    code,
    createdAt: user.created_at,
    lastLoginAt: user.last_sign_in_at ?? null,
  });

  const remote = await loadRemoteProgress(player);
  return {
    player,
    progress: remote.progress,
    message: remote.message,
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
      forcedUnlockLevelsColumnSupport = true;
    } else if (isMissingColumnError(error, 'forced_unlock_levels')) {
      forcedUnlockLevelsColumnSupport = false;

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

export const signOutPlayer = async (): Promise<void> => {
  if (!supabase || !isSupabaseConfigured) return;

  await supabase.auth.signOut();
};

export const accessPlayer = async (codeInput: string, passwordInput: string): Promise<PlayerAccessSuccess | PlayerAccessFailure> => {
  const playerCode = normalizePlayerCode(codeInput);
  const playerEmail = buildPlayerEmail(playerCode);
  const password = passwordInput.trim();

  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase ez dago prest; ezin da saioa hasi.',
    };
  }

  if (!playerCode) {
    return {
      ok: false,
      message: 'Erabiltzailea idatzi behar duzu.',
    };
  }

  if (!/^[a-z0-9_-]+$/.test(playerCode)) {
    return {
      ok: false,
      message: 'Kodeak letrak, zenbakiak, marratxoa edo azpimarra bakarrik izan ditzake.',
    };
  }

  if (password.length === 0) {
    return {
      ok: false,
      message: 'Pasahitza idatzi behar duzu.',
    };
  }

  const now = new Date().toISOString();
  const signInResult = await supabase.auth.signInWithPassword({
    email: playerEmail,
    password,
  });

  if (!signInResult.error && signInResult.data.user) {
    const authPlayer = createAuthPlayerIdentity({
      userId: signInResult.data.user.id,
      email: signInResult.data.user.email ?? playerEmail,
      code: playerCode,
      createdAt: signInResult.data.user.created_at,
      lastLoginAt: signInResult.data.user.last_sign_in_at ?? now,
    });
    const remote = await loadRemoteProgress(authPlayer);

    return {
      ok: true,
      player: authPlayer,
      progress: remote.progress,
      isNew: false,
      message: remote.message ?? `${authPlayer.code} berriro konektatu da.`,
    };
  }

  const normalizedError = signInResult.error?.message.toLowerCase() ?? '';
  if (
    normalizedError.includes('invalid login credentials')
    || normalizedError.includes('invalid credentials')
    || normalizedError.includes('email not confirmed')
  ) {
    return {
      ok: false,
      message: 'Erabiltzailea edo pasahitza ez dira zuzenak. Irakasleak kontua sortuta izan behar du.',
    };
  }

  return {
    ok: false,
    message: `Ezin izan da saioa hasi: ${signInResult.error?.message ?? 'errore ezezaguna'}`,
  };
};

export const getLevelRecord = (progress: GameProgress, levelId: string): LevelRecord | null =>
  progress.levelRecords.find((record) => record.levelId === levelId) ?? null;

export const getResolvedLevelRecord = (
  progress: GameProgress,
  entries: SynonymEntry[],
  level: GameLevel
): LevelRecord | null => {
  const record = getLevelRecord(progress, level.id);
  if (!record) return null;

  const totalQuestions = getLevelQuestionCount(entries, level.index);
  if (totalQuestions <= 0) {
    return {
      ...record,
      totalQuestions: 0,
      bestCorrectCount: 0,
      bestScore: 0,
      isCompleted: false,
    };
  }

  const bestCorrectCount = Math.min(record.bestCorrectCount, totalQuestions);
  const bestScore = calculateLevelProgressPercentage(bestCorrectCount, totalQuestions);
  const unlockTargetCount = getLevelUnlockTargetCount(totalQuestions);

  return {
    ...record,
    totalQuestions,
    bestCorrectCount,
    bestScore,
    isCompleted: bestCorrectCount >= unlockTargetCount,
  };
};

export const isLevelUnlocked = (progress: GameProgress, levelIndex: number, entries?: SynonymEntry[]): boolean => {
  if (levelIndex <= 1) return true;
  if (sanitizeForcedUnlockLevels(progress.forcedUnlockLevels).includes(levelIndex)) return true;

  const previousLevel = GAME_LEVELS[levelIndex - 2];
  const previousRecord = entries ? getResolvedLevelRecord(progress, entries, previousLevel) : getLevelRecord(progress, previousLevel.id);
  return Boolean(previousRecord?.isCompleted);
};

export const getUnlockedLevels = (progress: GameProgress, entries?: SynonymEntry[]): GameLevel[] =>
  GAME_LEVELS.filter((level) => isLevelUnlocked(progress, level.index, entries));

export const recordLevelResult = (
  progress: GameProgress,
  level: GameLevel,
  sessionScore: number,
  correctCount: number,
  _sessionQuestions: number,
  levelQuestionsTotal: number,
  correctQuestionIds: string[],
  incorrectQuestionIds: string[]
): GameProgress => {
  const playedAt = new Date().toISOString();
  const playedDay = buildLocalDayKey(playedAt);
  const existing = getLevelRecord(progress, level.id);
  const masteredSet = new Set((existing?.masteredQuestionIds ?? []).map((value) => value.trim()).filter(Boolean));
  const incorrectSet = new Set((existing?.incorrectQuestionIds ?? []).map((value) => value.trim()).filter(Boolean));

  for (const questionId of correctQuestionIds.map((value) => value.trim()).filter(Boolean)) {
    masteredSet.add(questionId);
    incorrectSet.delete(questionId);
  }

  for (const questionId of incorrectQuestionIds.map((value) => value.trim()).filter(Boolean)) {
    if (!masteredSet.has(questionId)) {
      incorrectSet.add(questionId);
    }
  }

  const masteredQuestionIds = Array.from(masteredSet).sort((left, right) => left.localeCompare(right, 'eu'));
  const nextIncorrectQuestionIds = Array.from(incorrectSet).sort((left, right) => left.localeCompare(right, 'eu'));
  const masteredCount = levelQuestionsTotal > 0 ? Math.min(masteredQuestionIds.length, levelQuestionsTotal) : 0;
  const nextProgressScore = calculateLevelProgressPercentage(masteredCount, levelQuestionsTotal);
  const unlockTargetCount = getLevelUnlockTargetCount(levelQuestionsTotal);
  const playedDates = Array.from(new Set([...(existing?.playedDates ?? []), playedDay])).sort((left, right) =>
    left.localeCompare(right, 'eu')
  );
  const dailyAttempts = {
    ...(existing?.dailyAttempts ?? {}),
    [playedDay]: (existing?.dailyAttempts?.[playedDay] ?? 0) + 1,
  };

  const nextRecord: LevelRecord = existing
    ? {
        ...existing,
        attempts: existing.attempts + 1,
        bestScore: nextProgressScore,
        lastScore: sessionScore,
        bestCorrectCount: masteredCount,
        lastCorrectCount: correctCount,
        totalQuestions: levelQuestionsTotal,
        lastPlayedAt: playedAt,
        playedDates,
        dailyAttempts,
        masteredQuestionIds,
        incorrectQuestionIds: nextIncorrectQuestionIds,
        isCompleted: masteredCount >= unlockTargetCount,
      }
    : {
        levelId: level.id,
        levelIndex: level.index,
        attempts: 1,
        bestScore: nextProgressScore,
        lastScore: sessionScore,
        bestCorrectCount: masteredCount,
        lastCorrectCount: correctCount,
        totalQuestions: levelQuestionsTotal,
        lastPlayedAt: playedAt,
        playedDates,
        dailyAttempts,
        masteredQuestionIds,
        incorrectQuestionIds: nextIncorrectQuestionIds,
        isCompleted: masteredCount >= unlockTargetCount,
      };

  const nextRecords = [nextRecord, ...progress.levelRecords.filter((record) => record.levelId !== level.id)].sort(
    (left, right) => left.levelIndex - right.levelIndex
  );

  return {
    ...progress,
    levelRecords: nextRecords,
  };
};

export const buildLevelChallenge = (
  entries: SynonymEntry[],
  level: GameLevel,
  levelRecord: LevelRecord | null = null
): LevelChallengeSuccess | LevelChallengeFailure => {
  if (entries.length === 0) {
    return {
      ok: false,
      message: 'Ez dago sinonimo bankurik kargatuta.',
    };
  }

  const rng = Math.random;
  const sortedEntries = sortEntries(entries);
  const levelSeeds = buildLevelQuestionSeeds(sortedEntries, level.index);
  const totalAvailableQuestions = levelSeeds.length;

  if (totalAvailableQuestions === 0) {
    return {
      ok: false,
      message: `${level.name} mailak ez du hitz esleiturik. Egiaztatu ${level.index} balioa duen group_number eremua.`,
    };
  }

  const masteredQuestionIds = new Set(levelRecord?.masteredQuestionIds ?? []);
  const incorrectQuestionIds = new Set(levelRecord?.incorrectQuestionIds ?? []);
  const masteredEntries = levelSeeds.filter((seed) => masteredQuestionIds.has(seed.id));
  const incorrectEntries = levelSeeds.filter(
    (seed) => incorrectQuestionIds.has(seed.id) && !masteredQuestionIds.has(seed.id)
  );
  const newEntries = levelSeeds.filter(
    (seed) => !masteredQuestionIds.has(seed.id) && !incorrectQuestionIds.has(seed.id)
  );
  const batchSize = totalAvailableQuestions >= QUESTIONS_PER_LEVEL ? QUESTIONS_PER_LEVEL : totalAvailableQuestions;
  const masteredQuota = Math.min(5, masteredEntries.length, batchSize);
  const selectedMastered = takeRandomEntries(masteredEntries, masteredQuota, rng);
  const reviewQuota = Math.min(QUESTIONS_PER_LEVEL - masteredQuota, batchSize - selectedMastered.length);
  const selectedIncorrect = takeRandomEntries(incorrectEntries, reviewQuota, rng);
  const missingReviewCount = Math.max(0, reviewQuota - selectedIncorrect.length);
  const selectedNew = takeRandomEntries(newEntries, missingReviewCount, rng);
  const alreadySelected = new Set(
    [...selectedMastered, ...selectedIncorrect, ...selectedNew].map((seed) => seed.id)
  );
  const fallbackEntries = shuffleWithRng(
    levelSeeds.filter((seed) => !alreadySelected.has(seed.id)),
    rng
  );
  const prioritizedSeeds = [
    selectedMastered,
    selectedIncorrect,
    selectedNew,
    fallbackEntries
  ].flat();
  const questions: QuizQuestion[] = [];

  for (const seed of prioritizedSeeds) {
    const question = buildQuestionFromSeed(seed, sortedEntries, rng);
    if (!question) continue;

    questions.push(question);
    if (questions.length === batchSize) break;
  }

  if (questions.length !== batchSize) {
    return {
      ok: false,
      message: `${level.name} mailako hitzek ez dute nahikoa aukera osatzen. Gehitu sinonimo edo hitz gehiago bankuan.`,
    };
  }

  return {
    ok: true,
    questions,
    totalAvailableQuestions,
    message: null,
  };
};

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
    .filter((player): player is TeacherPlayerOverview => player !== null);

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

  if (playerCode === ADMIN_PLAYER_CODE) {
    return {
      ok: false,
      message: 'irakasle kodea erreserbatuta dago.',
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

  if (player.playerCode === ADMIN_PLAYER_CODE) {
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
      forcedUnlockLevelsColumnSupport = true;
    } else if (isMissingColumnError(error, 'forced_unlock_levels')) {
      forcedUnlockLevelsColumnSupport = false;

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
      forcedUnlockLevelsColumnSupport = true;
    } else if (isMissingColumnError(error, 'forced_unlock_levels')) {
      forcedUnlockLevelsColumnSupport = false;

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

export const loadSynonymBank = async (): Promise<BankLoadSuccess | BankLoadFailure> => {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      entries: DEMO_SYNONYM_BANK,
      message: 'Supabase ez dago prest. Demoko hitzekin kargatu da jokoa.',
    };
  }

  const { data, error } = await supabase.from(synonymsTable).select('*');

  if (error) {
    return {
      ok: true,
      entries: DEMO_SYNONYM_BANK,
      message: `Ezin izan da ${synonymsTable} taula irakurri: ${error.message}. Demoko hitzak erabili dira.`,
    };
  }

  const entries = (data ?? [])
    .map((row, index) => normalizeSynonymRow(row as Record<string, unknown>, index))
    .filter((entry): entry is SynonymEntry => entry !== null);

  if (entries.length === 0) {
    return {
      ok: true,
      entries: DEMO_SYNONYM_BANK,
      message: `${synonymsTable} taulak ez du sinonimo baliozkorik eman. Demoko hitzak erabili dira.`,
    };
  }

  return {
    ok: true,
    entries,
    message: `${entries.length} sarrera sinkronizatu dira ${synonymsTable} taulatik.`,
  };
};

export const getTotalGamesPlayed = (progress: GameProgress): number =>
  progress.levelRecords.reduce((total, record) => total + record.attempts, 0);

export const getGamesPlayedOnDay = (progress: GameProgress, dayKey: string): number =>
  progress.levelRecords.reduce((total, record) => total + Math.max(0, record.dailyAttempts?.[dayKey] ?? 0), 0);

export const getTodayGamesPlayed = (progress: GameProgress, now: Date = new Date()): number =>
  getGamesPlayedOnDay(progress, buildLocalDayKey(now));

export const getLevelQuestionCount = (entries: SynonymEntry[], levelIndex: number): number =>
  buildLevelQuestionSeeds(entries, levelIndex).length;

export const getLevelUnlockTargetCount = (levelQuestionCount: number): number => {
  if (levelQuestionCount <= 0) return 0;
  return Math.ceil((levelQuestionCount * LEVEL_PASS_SCORE) / 100);
};

export const getLevelMetersForProgress = (
  level: GameLevel,
  achievedCount: number,
  totalCount: number
): number => {
  if (totalCount <= 0 || achievedCount <= 0) return 0;
  const sanitizedAchievedCount = Math.max(0, Math.min(achievedCount, totalCount));
  return Math.min(level.elevationMeters, Math.round((sanitizedAchievedCount / totalCount) * level.elevationMeters));
};

export const getConsecutivePlayDays = (progress: GameProgress, now: Date = new Date()): number => {
  const uniqueDays = Array.from(
    new Set(progress.levelRecords.flatMap((record) => record.playedDates).filter((value) => DAY_KEY_PATTERN.test(value)))
  ).sort((left, right) => right.localeCompare(left, 'eu'));

  if (uniqueDays.length === 0) return 0;

  const todayKey = buildLocalDayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = buildLocalDayKey(yesterday);
  const latestDay = uniqueDays[0];

  if (latestDay !== todayKey && latestDay !== yesterdayKey) {
    return 0;
  }

  let streak = 0;
  let cursor = new Date(now);
  if (latestDay === yesterdayKey) {
    cursor = yesterday;
  }

  while (true) {
    const cursorKey = buildLocalDayKey(cursor);
    if (!uniqueDays.includes(cursorKey)) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export const LEVELS_TOTAL = GAME_LEVELS.length;
