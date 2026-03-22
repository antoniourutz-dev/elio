export interface TeacherWordHistoryItem {
  word: string;
  action: 'created' | 'updated';
  changedAt: string;
  changedBy: string;
}

const STORAGE_KEY = 'elio-teacher-word-history:v1';
const MAX_ITEMS = 10;

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeHistoryItem = (value: unknown): TeacherWordHistoryItem | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<TeacherWordHistoryItem>;
  const word = typeof candidate.word === 'string' ? candidate.word.trim() : '';
  const changedAt = typeof candidate.changedAt === 'string' ? candidate.changedAt : '';
  const changedBy = typeof candidate.changedBy === 'string' ? candidate.changedBy.trim() : '';
  const action = candidate.action === 'created' || candidate.action === 'updated' ? candidate.action : null;

  if (!word || !changedAt || !changedBy || !action) {
    return null;
  }

  return {
    word,
    action,
    changedAt,
    changedBy,
  };
};

export const normalizeTeacherWordHistory = (items: unknown): TeacherWordHistoryItem[] =>
  Array.isArray(items)
    ? items
        .map(normalizeHistoryItem)
        .filter((item): item is TeacherWordHistoryItem => item !== null)
        .sort((left, right) => Date.parse(right.changedAt) - Date.parse(left.changedAt))
        .slice(0, MAX_ITEMS)
    : [];

export const loadTeacherWordHistory = (): TeacherWordHistoryItem[] => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeTeacherWordHistory(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const saveTeacherWordHistory = (items: TeacherWordHistoryItem[]): void => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeTeacherWordHistory(items)));
  } catch {
    // Ignore persistence failures for local audit history.
  }
};

export const recordTeacherWordHistoryItem = (
  items: TeacherWordHistoryItem[],
  nextItem: TeacherWordHistoryItem
): TeacherWordHistoryItem[] => normalizeTeacherWordHistory([nextItem, ...items]);
