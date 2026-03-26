import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildLevelChallenge } from './quiz';
import { GAME_LEVELS } from './constants';
import type { LevelRecord, SynonymEntry } from './types';

const level = GAME_LEVELS[0]!;

const entries: SynonymEntry[] = Array.from({ length: 5 }, (_, index) => ({
  id: `entry-${index + 1}`,
  word: `word${index + 1}`,
  synonyms: [`syn${index + 1}a`, `syn${index + 1}b`],
  difficulty: 1,
  theme: null,
  translation: null,
  example: null,
  tags: [],
  levelOrder: 1,
}));

const makeLevelRecord = (): LevelRecord => ({
  levelId: level.id,
  levelIndex: level.index,
  attempts: 3,
  bestScore: 60,
  lastScore: 60,
  bestCorrectCount: 4,
  lastCorrectCount: 4,
  totalQuestions: 15,
  lastPlayedAt: '2026-03-18T10:00:00.000Z',
  playedDates: ['2026-03-18'],
  dailyAttempts: { '2026-03-18': 3 },
  masteredQuestionIds: ['entry-1::word1<>syn1b', 'entry-2::word2<>syn2b'],
  incorrectQuestionIds: ['entry-1::word1<>syn1a', 'entry-2::word2<>syn2a', 'entry-3::word3<>syn3a', 'entry-4::word4<>syn4a'],
  questionMemory: {
    'entry-1::word1<>syn1a': {
      attempts: 3,
      correctCount: 0,
      incorrectCount: 3,
      correctStreak: 0,
      incorrectStreak: 3,
      masteryLevel: 0,
      lastResult: 'incorrect',
      lastSeenAt: '2026-03-18T10:00:00.000Z',
    },
    'entry-2::word2<>syn2a': {
      attempts: 2,
      correctCount: 0,
      incorrectCount: 2,
      correctStreak: 0,
      incorrectStreak: 2,
      masteryLevel: 0,
      lastResult: 'incorrect',
      lastSeenAt: '2026-03-18T10:00:00.000Z',
    },
    'entry-3::word3<>syn3a': {
      attempts: 1,
      correctCount: 0,
      incorrectCount: 1,
      correctStreak: 0,
      incorrectStreak: 1,
      masteryLevel: 0,
      lastResult: 'incorrect',
      lastSeenAt: '2026-03-18T10:00:00.000Z',
    },
    'entry-4::word4<>syn4a': {
      attempts: 1,
      correctCount: 0,
      incorrectCount: 1,
      correctStreak: 0,
      incorrectStreak: 1,
      masteryLevel: 0,
      lastResult: 'incorrect',
      lastSeenAt: '2026-03-18T10:00:00.000Z',
    },
    'entry-1::word1<>syn1b': {
      attempts: 3,
      correctCount: 3,
      incorrectCount: 0,
      correctStreak: 3,
      incorrectStreak: 0,
      masteryLevel: 4,
      lastResult: 'correct',
      lastSeenAt: '2026-03-18T10:00:00.000Z',
    },
    'entry-2::word2<>syn2b': {
      attempts: 2,
      correctCount: 2,
      incorrectCount: 0,
      correctStreak: 2,
      incorrectStreak: 0,
      masteryLevel: 4,
      lastResult: 'correct',
      lastSeenAt: '2026-03-18T10:00:00.000Z',
    },
  },
  isCompleted: false,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildLevelChallenge', () => {
  it('prioritizes recovery questions before strongly mastered ones', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = buildLevelChallenge(entries, level, makeLevelRecord());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const firstQuestionIds = result.questions.slice(0, 4).map((question) => question.id);
    expect(firstQuestionIds).toEqual([
      'entry-1::word1<>syn1a',
      'entry-2::word2<>syn2a',
      'entry-3::word3<>syn3a',
      'entry-4::word4<>syn4a',
    ]);
  });
});
