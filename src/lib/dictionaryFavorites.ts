import type { DictionarySearchResult } from './dictionary';

const STORAGE_PREFIX = 'elio-dictionary-favorites:v1';

export interface DictionaryFavoriteEntry {
  key: string;
  basque: string;
  spanish: string | null;
  definitions: DictionarySearchResult['definitions'];
  synonyms: string[];
  source: DictionarySearchResult['source'];
  savedAt: string;
}

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const getStorageKey = (playerId: string): string => `${STORAGE_PREFIX}:${playerId}`;

const normalizeFavorite = (value: unknown): DictionaryFavoriteEntry | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const key = typeof candidate.key === 'string' ? candidate.key.trim() : '';
  const basque = typeof candidate.basque === 'string' ? candidate.basque.trim() : '';
  if (!key || !basque) return null;

  const definitions = Array.isArray(candidate.definitions)
    ? candidate.definitions
        .map((definition) => {
          if (!definition || typeof definition !== 'object') return null;
          const entry = definition as Record<string, unknown>;
          const text = typeof entry.text === 'string' ? entry.text.trim() : '';
          if (!text) return null;
          return {
            id: entry.id ?? text,
            text,
            order: typeof entry.order === 'number' ? entry.order : 0,
          };
        })
        .filter((entry): entry is DictionaryFavoriteEntry['definitions'][number] => entry !== null)
    : [];

  const synonyms = Array.isArray(candidate.synonyms)
    ? candidate.synonyms
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    : [];

  return {
    key,
    basque,
    spanish: typeof candidate.spanish === 'string' && candidate.spanish.trim() ? candidate.spanish.trim() : null,
    definitions,
    synonyms,
    source: candidate.source === 'dictionary' ? 'dictionary' : 'synonym_only',
    savedAt: typeof candidate.savedAt === 'string' && candidate.savedAt ? candidate.savedAt : new Date(0).toISOString(),
  };
};

export const readDictionaryFavorites = (playerId: string | null | undefined): DictionaryFavoriteEntry[] => {
  if (!playerId || !canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(getStorageKey(playerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeFavorite)
      .filter((entry): entry is DictionaryFavoriteEntry => entry !== null)
      .sort((left, right) => right.savedAt.localeCompare(left.savedAt, 'eu'));
  } catch {
    return [];
  }
};

export const writeDictionaryFavorites = (playerId: string | null | undefined, favorites: DictionaryFavoriteEntry[]): void => {
  if (!playerId || !canUseStorage()) return;

  try {
    window.localStorage.setItem(getStorageKey(playerId), JSON.stringify(favorites));
  } catch {
    // Ignore local persistence failures.
  }
};

export const toDictionaryFavorite = (result: DictionarySearchResult): DictionaryFavoriteEntry => ({
  key: result.key,
  basque: result.basque,
  spanish: result.spanish,
  definitions: result.definitions,
  synonyms: result.synonyms,
  source: result.source,
  savedAt: new Date().toISOString(),
});
