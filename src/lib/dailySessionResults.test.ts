import { describe, expect, it, vi } from 'vitest';
import type { DailyGameSession } from '../appTypes';
import {
  buildAbandonedDailyResult,
  buildCompletedDailyResult,
  buildRecoveredAbandonedDailyResult,
} from './dailySessionResults';

const baseSession: DailyGameSession = {
  dayKey: '2026-03-25',
  questions: [
    {
      type: 'spelling',
      id: 'spell-1',
      displayText: 'etxea',
      correctAnswer: 'ZUZEN',
    },
    {
      type: 'orthography',
      id: 'orth-2',
      exerciseNumber: 2,
      options: [
        { key: 'A', text: 'a, b, c', words: ['a', 'b', 'c'] },
        { key: 'B', text: 'd, e, f', words: ['d', 'e', 'f'] },
        { key: 'C', text: 'g, h, i', words: ['g', 'h', 'i'] },
      ],
      correctAnswer: 'B',
    },
    {
      type: 'eroglifico',
      id: 'ero-3',
      imageUrl: '/img.png',
      clue: 'Mendia',
      correctAnswer: 'Anboto',
      acceptedAnswers: ['anboto'],
    },
  ],
  currentIndex: 2,
  answers: [
    {
      questionId: 'spell-1',
      questionType: 'spelling',
      selectedAnswer: 'ZUZEN',
      correctAnswer: 'ZUZEN',
      isCorrect: true,
    },
    {
      questionId: 'orth-2',
      questionType: 'orthography',
      selectedAnswer: 'A',
      correctAnswer: 'B',
      isCorrect: false,
      wasSolved: true,
    },
    {
      questionId: 'ero-3',
      questionType: 'eroglifico',
      selectedAnswer: 'Anboto',
      correctAnswer: 'Anboto',
      isCorrect: true,
    },
  ],
  startedAt: 1_000,
};

describe('dailySessionResults', () => {
  it('builds a completed result with normalized stored answers', () => {
    const result = buildCompletedDailyResult(baseSession, 540, 48, '2026-03-25T10:00:00.000Z');

    expect(result).toMatchObject({
      dayKey: '2026-03-25',
      score: 540,
      correctCount: 2,
      totalQuestions: 3,
      secondsElapsed: 48,
      completedAt: '2026-03-25T10:00:00.000Z',
    });
    expect(result.answers).toEqual([
      {
        type: 'spelling',
        word: 'etxea',
        selected: 'ZUZEN',
        correct: 'ZUZEN',
        isCorrect: true,
      },
      {
        type: 'orthography',
        word: 'Ariketa 2',
        selected: 'Ebatzita',
        correct: 'B',
        isCorrect: false,
        wasSolved: true,
      },
      {
        type: 'eroglifico',
        word: 'Mendia',
        selected: 'Anboto',
        correct: 'Anboto',
        isCorrect: true,
      },
    ]);
  });

  it('builds an abandoned result with zero score and elapsed time from session start', () => {
    vi.useFakeTimers();
    vi.setSystemTime(11_000);

    const result = buildAbandonedDailyResult(baseSession, '2026-03-25T10:01:00.000Z');

    expect(result.score).toBe(0);
    expect(result.correctCount).toBe(2);
    expect(result.totalQuestions).toBe(3);
    expect(result.secondsElapsed).toBe(10);
    expect(result.answers).toHaveLength(3);

    vi.useRealTimers();
  });

  it('builds a recovered abandoned result from a persisted marker', () => {
    const result = buildRecoveredAbandonedDailyResult(
      {
        dayKey: '2026-03-25',
        startedAt: 2_000,
        totalQuestions: 12,
      },
      15_400,
      '2026-03-25T11:00:00.000Z'
    );

    expect(result).toEqual({
      dayKey: '2026-03-25',
      score: 0,
      correctCount: 0,
      totalQuestions: 12,
      secondsElapsed: 13,
      completedAt: '2026-03-25T11:00:00.000Z',
      answers: [],
    });
  });
});
