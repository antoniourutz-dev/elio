import { describe, expect, it } from 'vitest';
import {
  buildStudyCardSeeds,
  getStudyQueueSummary,
  recordStudyDailyProgress,
  reviewStudyCard,
  selectNextStudyCard,
  type StudyCard,
} from './study';
import type { SynonymEntry } from './types';

const baseNow = new Date('2026-03-22T12:00:00.000Z');

const entry: SynonymEntry = {
  id: 'group-1',
  word: 'eder',
  synonyms: ['polita', 'lirain'],
  difficulty: 1,
  theme: 'deskribapenak',
  translation: 'bonito',
  example: 'Egun ederra.',
  tags: [],
  levelOrder: 1,
};

function makeCard(overrides: Partial<StudyCard> = {}): StudyCard {
  const seed = buildStudyCardSeeds([entry], 1)[0];

  return {
    ...seed,
    status: 'new',
    stepIndex: 0,
    intervalDays: 0,
    ease: 2.3,
    dueAt: baseNow.toISOString(),
    lastReviewedAt: null,
    lastRating: null,
    lapses: 0,
    reps: 0,
    leech: false,
    ...overrides,
  };
}

describe('buildStudyCardSeeds', () => {
  it('genera solo parejas unicas del grupo semantico', () => {
    const seeds = buildStudyCardSeeds([entry], 1);

    expect(seeds).toHaveLength(3);
    expect(seeds.some((seed) => seed.promptWord === 'eder' && seed.answerWord === 'polita')).toBe(true);
    expect(seeds.some((seed) => seed.promptWord === 'polita' && seed.answerWord === 'eder')).toBe(false);
  });
});

describe('reviewStudyCard', () => {
  it('en learning con good avanza al siguiente paso', () => {
    const updated = reviewStudyCard(makeCard(), 'good', baseNow);

    expect(updated.status).toBe('learning');
    expect(updated.stepIndex).toBe(1);
    expect(updated.dueAt).toBe('2026-03-22T12:12:00.000Z');
  });

  it('en learning con easy gradua a review con 3 dias', () => {
    const updated = reviewStudyCard(makeCard(), 'easy', baseNow);

    expect(updated.status).toBe('review');
    expect(updated.intervalDays).toBe(3);
    expect(updated.dueAt).toBe('2026-03-25T12:00:00.000Z');
  });

  it('en review con again manda a relearning y reduce ease', () => {
    const updated = reviewStudyCard(
      makeCard({
        status: 'review',
        intervalDays: 10,
        ease: 2.5,
        dueAt: '2026-03-20T12:00:00.000Z',
      }),
      'again',
      baseNow
    );

    expect(updated.status).toBe('relearning');
    expect(updated.ease).toBe(2.3);
    expect(updated.lapses).toBe(1);
    expect(updated.dueAt).toBe('2026-03-22T12:10:00.000Z');
  });

  it('en review con easy aumenta ease e intervalo', () => {
    const updated = reviewStudyCard(
      makeCard({
        status: 'review',
        intervalDays: 4,
        ease: 2.3,
        dueAt: '2026-03-20T12:00:00.000Z',
      }),
      'easy',
      baseNow
    );

    expect(updated.status).toBe('review');
    expect(updated.ease).toBe(2.35);
    expect(updated.intervalDays).toBe(10);
    expect(updated.dueAt).toBe('2026-04-01T12:00:00.000Z');
  });
});

describe('selectNextStudyCard', () => {
  it('prioriza due cards antes que nuevas', () => {
    const dueReview = makeCard({
      id: 'due-review',
      status: 'review',
      dueAt: '2026-03-21T12:00:00.000Z',
    });
    const freshNew = makeCard({
      id: 'fresh-new',
      semanticGroup: 'group-2',
      status: 'new',
    });

    const selected = selectNextStudyCard([freshNew, dueReview], baseNow, {});

    expect(selected?.id).toBe('due-review');
  });

  it('evita repetir semanticGroup si hay alternativa', () => {
    const first = makeCard({
      id: 'same-group',
      semanticGroup: 'group-1',
      status: 'new',
    });
    const second = makeCard({
      id: 'other-group',
      semanticGroup: 'group-2',
      status: 'new',
    });

    const selected = selectNextStudyCard([first, second], baseNow, { lastSemanticGroup: 'group-1' });

    expect(selected?.semanticGroup).toBe('group-2');
  });

  it('no ofrece mas nuevas cuando se alcanza el limite diario', () => {
    const freshNew = makeCard({
      id: 'fresh-new',
      semanticGroup: 'group-2',
      status: 'new',
    });

    const selected = selectNextStudyCard([freshNew], baseNow, {
      dailyNewLimit: 12,
      newCardsStudiedToday: 12,
    });

    expect(selected).toBeNull();
  });

  it('corta el cupo de repasos de la sesion', () => {
    const dueLearning = makeCard({
      id: 'due-learning',
      status: 'learning',
      dueAt: '2026-03-22T11:59:00.000Z',
    });
    const dueReview = makeCard({
      id: 'due-review',
      semanticGroup: 'group-2',
      status: 'review',
      dueAt: '2026-03-22T11:50:00.000Z',
    });
    const freshNew = makeCard({
      id: 'fresh-new',
      semanticGroup: 'group-3',
      status: 'new',
    });

    const summary = getStudyQueueSummary([dueLearning, dueReview, freshNew], baseNow, {
      dailyNewLimit: 12,
      newCardsStudiedToday: 0,
      sessionReviewLimit: 1,
      sessionReviewsCompleted: 0,
    });

    expect(summary.dueCount).toBe(1);
    expect(summary.newCount).toBe(1);
  });
});

describe('recordStudyDailyProgress', () => {
  it('cuenta nuevas y repasos solo dentro del mismo dia', () => {
    const progress = recordStudyDailyProgress(
      {
        dateKey: '2026-03-22',
        newCardsStudied: 2,
        reviewsCompleted: 4,
      },
      'new',
      baseNow
    );

    const resetProgress = recordStudyDailyProgress(progress, 'review', new Date('2026-03-23T08:00:00.000Z'));

    expect(progress.newCardsStudied).toBe(3);
    expect(resetProgress.dateKey).toBe('2026-03-23');
    expect(resetProgress.reviewsCompleted).toBe(1);
    expect(resetProgress.newCardsStudied).toBe(0);
  });
});
