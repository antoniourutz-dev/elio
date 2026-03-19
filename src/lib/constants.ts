import type { GameLevel, SynonymEntry } from './types';

export const STORAGE_KEY = 'lexikoa.euskera.levels.v2';
export const LEGACY_STORAGE_KEY = 'lexikoa.euskera.daily.v1';
export const PLAYER_EMAIL_DOMAIN = import.meta.env.VITE_SUPABASE_PLAYER_EMAIL_DOMAIN || 'lexiko.app';
export const WORD_FIELDS = ['basque_word', 'hitza', 'word', 'term', 'name'];
export const SYNONYM_FIELDS = ['synonyms', 'sinonimoak', 'synonym_list'];
export const DIFFICULTY_FIELDS = ['difficulty', 'level', 'maila'];
export const THEME_FIELDS = ['theme', 'category', 'topic'];
export const TRANSLATION_FIELDS = ['translation_es', 'translation', 'meaning_es'];
export const EXAMPLE_FIELDS = ['example_sentence', 'example', 'usage_example'];
export const TAG_FIELDS = ['tags', 'labels'];
export const ACTIVE_FIELDS = ['active', 'enabled', 'published'];
export const ID_FIELDS = ['id', 'uuid', 'word_id'];
export const LEVEL_ORDER_FIELDS = ['group_number', 'group_num', 'exercise_order', 'exercise'];

export const QUESTIONS_PER_LEVEL = 10;
export const LEVEL_PASS_SCORE = 70;

const LEVEL_MOUNTAINS = [
  { name: 'Aitxuri', elevationMeters: 1551 },
  { name: 'Aizkorri', elevationMeters: 1528 },
  { name: 'Gorbea', elevationMeters: 1482 },
  { name: 'Anboto', elevationMeters: 1331 },
  { name: 'Txindoki', elevationMeters: 1346 },
  { name: 'Aratz', elevationMeters: 1445 },
  { name: 'Ernio', elevationMeters: 1075 },
  { name: 'Larhun', elevationMeters: 905 },
  { name: 'Pagasarri', elevationMeters: 671 },
  { name: 'Jaizkibel', elevationMeters: 543 },
] as const;

export const ADMIN_PLAYER_CODE = 'irakasle';
export const SUPERADMIN_PLAYER_CODE = 'admin';

export const GAME_LEVELS: GameLevel[] = LEVEL_MOUNTAINS.map(({ name, elevationMeters }, index) => ({
  id: `level-${index + 1}`,
  index: index + 1,
  name,
  elevationMeters,
}));

export const LEVELS_TOTAL = GAME_LEVELS.length;

export interface LevelQuestionSeed {
  id: string;
  promptWord: string;
  answerTerms: string[];
  sourceEntry: SynonymEntry;
}
