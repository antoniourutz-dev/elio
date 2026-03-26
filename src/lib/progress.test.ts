import { describe, it, expect } from 'vitest';
import { getLevelRecord, getResolvedLevelRecord, isLevelUnlocked, getUnlockedLevels, recordLevelResult } from './progress';
import { createInitialProgress } from './storage';
import { GAME_LEVELS } from './constants';
import type { GameProgress, SynonymEntry } from './types';
import { buildLevelQuestionSeeds } from './quiz';

// Minimal synonym entries that produce question seeds for level 1
const makeEntries = (levelIndex: number, count: number): SynonymEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `entry-${levelIndex}-${i}`,
    word: `word${i}`,
    synonyms: [`syn${i}a`, `syn${i}b`],
    difficulty: 1,
    theme: null,
    translation: null,
    example: null,
    tags: [],
    levelOrder: levelIndex,
  }));

const level1 = GAME_LEVELS[0]!;
const level2 = GAME_LEVELS[1]!;

// entries for levels 1 and 2 (each entry yields multiple question seeds)
const entries1 = makeEntries(1, 5);
const entries2 = makeEntries(2, 5);
const allEntries = [...entries1, ...entries2];

// ── getLevelRecord ─────────────────────────────────────────────────────────

describe('getLevelRecord', () => {
  it('returns null when no record exists', () => {
    expect(getLevelRecord(createInitialProgress(), 'level-1')).toBeNull();
  });

  it('returns the correct record by levelId', () => {
    const progress = recordLevelResult(createInitialProgress(), level1, 80, 8, 10, 10, [], []);
    const record = getLevelRecord(progress, 'level-1');
    expect(record).not.toBeNull();
    expect(record?.levelId).toBe('level-1');
  });
});

// ── getResolvedLevelRecord ─────────────────────────────────────────────────

describe('getResolvedLevelRecord', () => {
  it('returns null when no stored record', () => {
    expect(getResolvedLevelRecord(createInitialProgress(), allEntries, level1)).toBeNull();
  });

  it('caps bestCorrectCount at available question count', () => {
    // Record 20 correct but only 5 entries available → seeds < 20
    const progress = recordLevelResult(createInitialProgress(), level1, 100, 20, 20, 20, Array.from({ length: 20 }, (_, i) => `entry-1-${i}::word${i}`), []);
    const record = getResolvedLevelRecord(progress, entries1, level1);
    const totalQuestions = record?.totalQuestions ?? 0;
    expect(record?.bestCorrectCount).toBeLessThanOrEqual(totalQuestions);
  });

  it('reflects isCompleted based on current question count', () => {
    // Build enough mastered IDs to exceed 70% threshold
    const seeds = buildLevelQuestionSeeds(entries1, 1).map((seed) => seed.id);
    const progress = recordLevelResult(createInitialProgress(), level1, 100, seeds.length, seeds.length, seeds.length, seeds, []);
    const record = getResolvedLevelRecord(progress, entries1, level1);
    expect(record?.isCompleted).toBe(true);
  });
});

// ── isLevelUnlocked ────────────────────────────────────────────────────────

describe('isLevelUnlocked', () => {
  it('level 1 is always unlocked', () => {
    expect(isLevelUnlocked(createInitialProgress(), 1)).toBe(true);
  });

  it('level 2 is locked without progress', () => {
    expect(isLevelUnlocked(createInitialProgress(), 2, allEntries)).toBe(false);
  });

  it('level 2 is unlocked via forcedUnlockLevels', () => {
    const progress: GameProgress = { ...createInitialProgress(), forcedUnlockLevels: [2] };
    expect(isLevelUnlocked(progress, 2, allEntries)).toBe(true);
  });

  it('level 2 unlocks when level 1 is completed', () => {
    const seeds = buildLevelQuestionSeeds(entries1, 1).map((seed) => seed.id);
    const progress = recordLevelResult(createInitialProgress(), level1, 100, seeds.length, seeds.length, seeds.length, seeds, []);
    expect(isLevelUnlocked(progress, 2, entries1)).toBe(true);
  });
});

// ── getUnlockedLevels ──────────────────────────────────────────────────────

describe('getUnlockedLevels', () => {
  it('returns only level 1 for fresh progress', () => {
    const unlocked = getUnlockedLevels(createInitialProgress(), allEntries);
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0]?.index).toBe(1);
  });

  it('returns level 1 and 2 when level 2 is force-unlocked', () => {
    const progress: GameProgress = { ...createInitialProgress(), forcedUnlockLevels: [2] };
    const unlocked = getUnlockedLevels(progress, allEntries);
    expect(unlocked.map((l) => l.index)).toContain(2);
  });
});

// ── recordLevelResult ──────────────────────────────────────────────────────

describe('recordLevelResult', () => {
  it('creates a new level record on first attempt', () => {
    const progress = recordLevelResult(createInitialProgress(), level1, 70, 7, 10, 10, ['q1', 'q2'], ['q3']);
    const record = getLevelRecord(progress, 'level-1');
    expect(record).not.toBeNull();
    expect(record?.attempts).toBe(1);
    expect(record?.masteredQuestionIds).toContain('q1');
    expect(record?.masteredQuestionIds).toContain('q2');
    expect(record?.incorrectQuestionIds).toContain('q3');
  });

  it('increments attempts on subsequent plays', () => {
    let progress = recordLevelResult(createInitialProgress(), level1, 60, 6, 10, 10, ['q1'], ['q2']);
    progress = recordLevelResult(progress, level1, 70, 7, 10, 10, ['q2', 'q3'], []);
    expect(getLevelRecord(progress, 'level-1')?.attempts).toBe(2);
  });

  it('promotes questions from incorrect to mastered', () => {
    let progress = recordLevelResult(createInitialProgress(), level1, 50, 5, 10, 10, [], ['q1']);
    expect(getLevelRecord(progress, 'level-1')?.incorrectQuestionIds).toContain('q1');

    progress = recordLevelResult(progress, level1, 70, 7, 10, 10, ['q1'], []);
    const record = getLevelRecord(progress, 'level-1');
    expect(record?.masteredQuestionIds).toContain('q1');
    expect(record?.incorrectQuestionIds).not.toContain('q1');
  });

  it('removes a previously mastered question after failing it again', () => {
    let progress = recordLevelResult(createInitialProgress(), level1, 70, 7, 10, 10, ['q1'], []);
    expect(getLevelRecord(progress, 'level-1')?.masteredQuestionIds).toContain('q1');

    progress = recordLevelResult(progress, level1, 60, 6, 10, 10, [], ['q1']);
    const record = getLevelRecord(progress, 'level-1');
    expect(record?.masteredQuestionIds).not.toContain('q1');
    expect(record?.incorrectQuestionIds).toContain('q1');
    expect(record?.questionMemory.q1?.masteryLevel).toBe(0);
    expect(record?.questionMemory.q1?.lastResult).toBe('incorrect');
  });

  it('builds question memory for adaptive repetition', () => {
    const progress = recordLevelResult(createInitialProgress(), level1, 70, 7, 10, 10, ['q1'], ['q2']);
    const record = getLevelRecord(progress, 'level-1');
    expect(record?.questionMemory.q1).toMatchObject({
      attempts: 1,
      correctCount: 1,
      incorrectCount: 0,
      masteryLevel: 1,
      lastResult: 'correct',
    });
    expect(record?.questionMemory.q2).toMatchObject({
      attempts: 1,
      correctCount: 0,
      incorrectCount: 1,
      masteryLevel: 0,
      lastResult: 'incorrect',
    });
  });

  it('accumulates mastered question ids across sessions', () => {
    let progress = recordLevelResult(createInitialProgress(), level1, 50, 5, 10, 10, ['q1', 'q2'], []);
    progress = recordLevelResult(progress, level1, 50, 5, 10, 10, ['q3', 'q4'], []);
    const record = getLevelRecord(progress, 'level-1');
    expect(record?.masteredQuestionIds).toContain('q1');
    expect(record?.masteredQuestionIds).toContain('q3');
  });

  it('marks level as completed when mastered count exceeds 70% threshold', () => {
    // 10 questions, need ceil(10*70/100) = 7 mastered
    const correctIds = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];
    const progress = recordLevelResult(createInitialProgress(), level1, 70, 7, 10, 10, correctIds, []);
    const record = getLevelRecord(progress, 'level-1');
    expect(record?.isCompleted).toBe(true);
  });

  it('records the play date', () => {
    const progress = recordLevelResult(createInitialProgress(), level1, 70, 7, 10, 10, [], []);
    const record = getLevelRecord(progress, 'level-1');
    expect(record?.playedDates).toHaveLength(1);
    expect(record?.playedDates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('records progress for level 2 without touching level 1', () => {
    let progress = recordLevelResult(createInitialProgress(), level1, 70, 7, 10, 10, ['q1'], []);
    progress = recordLevelResult(progress, level2, 80, 8, 10, 10, ['q2'], []);
    expect(getLevelRecord(progress, 'level-1')?.attempts).toBe(1);
    expect(getLevelRecord(progress, 'level-2')?.attempts).toBe(1);
    expect(progress.levelRecords).toHaveLength(2);
  });
});
