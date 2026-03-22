export interface TeacherPlayerHistoryItem {
  playerCode: string;
  action: 'created' | 'updated';
  changedAt: string;
  changedBy: string;
}

const STORAGE_KEY = 'elio-teacher-player-history:v1';
const MAX_ITEMS = 10;

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeHistoryItem = (value: unknown): TeacherPlayerHistoryItem | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<TeacherPlayerHistoryItem>;
  const playerCode = typeof candidate.playerCode === 'string' ? candidate.playerCode.trim() : '';
  const changedAt = typeof candidate.changedAt === 'string' ? candidate.changedAt : '';
  const changedBy = typeof candidate.changedBy === 'string' ? candidate.changedBy.trim() : '';
  const action = candidate.action === 'created' || candidate.action === 'updated' ? candidate.action : null;

  if (!playerCode || !changedAt || !changedBy || !action) {
    return null;
  }

  return {
    playerCode,
    action,
    changedAt,
    changedBy,
  };
};

export const normalizeTeacherPlayerHistory = (items: unknown): TeacherPlayerHistoryItem[] =>
  Array.isArray(items)
    ? items
        .map(normalizeHistoryItem)
        .filter((item): item is TeacherPlayerHistoryItem => item !== null)
        .sort((left, right) => Date.parse(right.changedAt) - Date.parse(left.changedAt))
        .slice(0, MAX_ITEMS)
    : [];

export const loadTeacherPlayerHistory = (): TeacherPlayerHistoryItem[] => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeTeacherPlayerHistory(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const saveTeacherPlayerHistory = (items: TeacherPlayerHistoryItem[]): void => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeTeacherPlayerHistory(items)));
  } catch {
    // Ignore persistence failures for local audit history.
  }
};

export const recordTeacherPlayerHistoryItem = (
  items: TeacherPlayerHistoryItem[],
  nextItem: TeacherPlayerHistoryItem
): TeacherPlayerHistoryItem[] => normalizeTeacherPlayerHistory([nextItem, ...items]);
