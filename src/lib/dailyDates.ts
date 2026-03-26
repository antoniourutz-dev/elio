import { buildLocalDayKey } from './parsing';

export const getDayKey = (): string => buildLocalDayKey(new Date());

export function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: buildLocalDayKey(monday), end: buildLocalDayKey(sunday) };
}
