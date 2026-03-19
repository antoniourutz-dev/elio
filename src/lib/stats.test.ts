import { describe, it, expect } from 'vitest';
import {
  getTotalGamesPlayed,
  getGamesPlayedOnDay,
  getTodayGamesPlayed,
  getLevelUnlockTargetCount,
  getLevelMetersForProgress,
  getConsecutivePlayDays,
} from './stats';
import type { GameProgress, GameLevel } from './types';

const emptyProgress = (): GameProgress => ({
  learnerName: 'Test',
  forcedUnlockLevels: [],
  levelRecords: [],
});

const level1: GameLevel = { id: 'level-1', index: 1, name: 'Aitxuri', elevationMeters: 1551 };

const makeRecord = (overrides: Partial<{
  levelId: string; levelIndex: number; attempts: number; dailyAttempts: Record<string, number>; playedDates: string[];
}>) => ({
  levelId: 'level-1',
  levelIndex: 1,
  attempts: 1,
  bestScore: 70,
  lastScore: 70,
  bestCorrectCount: 7,
  lastCorrectCount: 7,
  totalQuestions: 10,
  lastPlayedAt: null,
  playedDates: [],
  dailyAttempts: {},
  masteredQuestionIds: [],
  incorrectQuestionIds: [],
  questionMemory: {},
  isCompleted: false,
  ...overrides,
});

// ── getTotalGamesPlayed ────────────────────────────────────────────────────

describe('getTotalGamesPlayed', () => {
  it('returns 0 for empty progress', () => {
    expect(getTotalGamesPlayed(emptyProgress())).toBe(0);
  });

  it('sums attempts across all level records', () => {
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [makeRecord({ attempts: 3 }), makeRecord({ levelId: 'level-2', levelIndex: 2, attempts: 5 })],
    };
    expect(getTotalGamesPlayed(progress)).toBe(8);
  });
});

// ── getGamesPlayedOnDay ────────────────────────────────────────────────────

describe('getGamesPlayedOnDay', () => {
  it('returns 0 when no dailyAttempts', () => {
    const progress: GameProgress = { ...emptyProgress(), levelRecords: [makeRecord({})] };
    expect(getGamesPlayedOnDay(progress, '2025-01-01')).toBe(0);
  });

  it('sums dailyAttempts for the given day across records', () => {
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [
        makeRecord({ dailyAttempts: { '2025-03-19': 2 } }),
        makeRecord({ levelId: 'level-2', levelIndex: 2, dailyAttempts: { '2025-03-19': 3 } }),
      ],
    };
    expect(getGamesPlayedOnDay(progress, '2025-03-19')).toBe(5);
  });

  it('ignores other days', () => {
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [makeRecord({ dailyAttempts: { '2025-03-18': 4, '2025-03-19': 1 } })],
    };
    expect(getGamesPlayedOnDay(progress, '2025-03-19')).toBe(1);
    expect(getGamesPlayedOnDay(progress, '2025-03-18')).toBe(4);
  });
});

// ── getTodayGamesPlayed ────────────────────────────────────────────────────

describe('getTodayGamesPlayed', () => {
  it('uses the provided date to determine today', () => {
    const today = new Date('2025-03-19T12:00:00Z');
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [makeRecord({ dailyAttempts: { '2025-03-19': 3 } })],
    };
    expect(getTodayGamesPlayed(progress, today)).toBe(3);
  });

  it('returns 0 when nothing played today', () => {
    const today = new Date('2025-03-20T12:00:00Z');
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [makeRecord({ dailyAttempts: { '2025-03-19': 3 } })],
    };
    expect(getTodayGamesPlayed(progress, today)).toBe(0);
  });
});

// ── getLevelUnlockTargetCount ──────────────────────────────────────────────

describe('getLevelUnlockTargetCount', () => {
  it('returns 0 for empty level', () => {
    expect(getLevelUnlockTargetCount(0)).toBe(0);
  });

  it('calculates 70% threshold with ceiling', () => {
    expect(getLevelUnlockTargetCount(10)).toBe(7);   // 10 * 70 / 100 = 7
    expect(getLevelUnlockTargetCount(15)).toBe(11);  // 15 * 70 / 100 = 10.5 → ceil = 11
    expect(getLevelUnlockTargetCount(20)).toBe(14);  // 20 * 70 / 100 = 14
  });
});

// ── getLevelMetersForProgress ──────────────────────────────────────────────

describe('getLevelMetersForProgress', () => {
  it('returns 0 when nothing achieved', () => {
    expect(getLevelMetersForProgress(level1, 0, 10)).toBe(0);
  });

  it('returns 0 when totalCount is 0', () => {
    expect(getLevelMetersForProgress(level1, 5, 0)).toBe(0);
  });

  it('calculates proportional meters', () => {
    // 5/10 = 50% of 1551 = 775.5 → rounded = 776
    expect(getLevelMetersForProgress(level1, 5, 10)).toBe(776);
  });

  it('caps at elevationMeters when achievedCount exceeds totalCount', () => {
    expect(getLevelMetersForProgress(level1, 15, 10)).toBe(level1.elevationMeters);
  });

  it('returns full elevation when fully completed', () => {
    expect(getLevelMetersForProgress(level1, 10, 10)).toBe(level1.elevationMeters);
  });
});

// ── getConsecutivePlayDays ─────────────────────────────────────────────────

describe('getConsecutivePlayDays', () => {
  it('returns 0 for empty progress', () => {
    const now = new Date('2025-03-19T12:00:00');
    expect(getConsecutivePlayDays(emptyProgress(), now)).toBe(0);
  });

  it('returns 0 when last play was more than 1 day ago', () => {
    const now = new Date('2025-03-19T12:00:00');
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [makeRecord({ playedDates: ['2025-03-17'] })],
    };
    expect(getConsecutivePlayDays(progress, now)).toBe(0);
  });

  it('counts a streak of 1 when played today', () => {
    const now = new Date('2025-03-19T12:00:00');
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [makeRecord({ playedDates: ['2025-03-19'] })],
    };
    expect(getConsecutivePlayDays(progress, now)).toBe(1);
  });

  it('counts a streak when played multiple consecutive days including today', () => {
    const now = new Date('2025-03-19T12:00:00');
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [makeRecord({ playedDates: ['2025-03-17', '2025-03-18', '2025-03-19'] })],
    };
    expect(getConsecutivePlayDays(progress, now)).toBe(3);
  });

  it('counts a streak starting from yesterday when not played today', () => {
    const now = new Date('2025-03-19T12:00:00');
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [makeRecord({ playedDates: ['2025-03-17', '2025-03-18'] })],
    };
    expect(getConsecutivePlayDays(progress, now)).toBe(2);
  });

  it('breaks streak at a gap', () => {
    const now = new Date('2025-03-19T12:00:00');
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [makeRecord({ playedDates: ['2025-03-14', '2025-03-15', '2025-03-17', '2025-03-18', '2025-03-19'] })],
    };
    // streak is 3: 17, 18, 19 (14 and 15 break the chain)
    expect(getConsecutivePlayDays(progress, now)).toBe(3);
  });

  it('merges playedDates across multiple level records', () => {
    const now = new Date('2025-03-19T12:00:00');
    const progress: GameProgress = {
      ...emptyProgress(),
      levelRecords: [
        makeRecord({ playedDates: ['2025-03-18'] }),
        makeRecord({ levelId: 'level-2', levelIndex: 2, playedDates: ['2025-03-19'] }),
      ],
    };
    expect(getConsecutivePlayDays(progress, now)).toBe(2);
  });
});
