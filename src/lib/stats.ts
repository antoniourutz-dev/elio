import type { GameProgress, GameLevel, SynonymEntry } from './types';
import { LEVEL_PASS_SCORE } from './constants';
import { buildLocalDayKey, DAY_KEY_PATTERN } from './parsing';
import { buildLevelQuestionSeeds } from './quiz';

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
