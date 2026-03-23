import { describe, expect, it } from 'vitest';
import type { ActiveQuiz, LevelSummary } from '../../appTypes';
import { GAME_LEVELS } from '../../euskeraLearning';
import { resolveDockItems, resolveTopBarState } from './appChrome';

const sampleQuiz: ActiveQuiz = {
  level: GAME_LEVELS[0],
  levelTotalQuestions: 40,
  questions: [
    {
      id: 'q-1',
      word: 'alai',
      correctAnswer: 'pozik',
      options: ['pozik', 'urdin', 'handi', 'txiki'],
    },
  ],
  currentIndex: 0,
  answers: [],
};

const sampleSummary: LevelSummary = {
  level: GAME_LEVELS[0],
  answers: [],
  correctCount: 8,
  totalQuestions: 10,
  percentage: 80,
  progressPercentage: 67,
  masteredCount: 18,
  levelTotalQuestions: 40,
  unlockTargetCount: 24,
};

describe('resolveTopBarState', () => {
  it('prioritizes daily session state over other shell states', () => {
    const state = resolveTopBarState({
      mainScreen: 'daily',
      dailySession: true,
      quiz: null,
      summary: null,
      completedLevels: 2,
      totalLevels: 10,
      consecutivePlayDays: 3,
      streakTone: 'streak-2',
      currentSessionMeters: '420 m',
      summaryPercentage: null,
    });

    expect(state.subtitle).toBe('Eguneko jokoa');
    expect(state.showBackButton).toBe(true);
    expect(state.metric).toBeNull();
  });

  it('shows quiz progress as success metric while a level is active', () => {
    const state = resolveTopBarState({
      mainScreen: 'synonyms',
      dailySession: false,
      quiz: sampleQuiz,
      summary: null,
      completedLevels: 2,
      totalLevels: 10,
      consecutivePlayDays: 3,
      streakTone: 'streak-2',
      currentSessionMeters: '420 m',
      summaryPercentage: null,
    });

    expect(state.subtitle).toBe(sampleQuiz.level.name);
    expect(state.showBackButton).toBe(true);
    expect(state.metric?.variant).toBe('success');
    expect(state.metric?.label).toBe('420 m');
  });

  it('shows summary percentage after finishing a level', () => {
    const state = resolveTopBarState({
      mainScreen: 'synonyms',
      dailySession: false,
      quiz: null,
      summary: sampleSummary,
      completedLevels: 2,
      totalLevels: 10,
      consecutivePlayDays: 3,
      streakTone: 'streak-2',
      currentSessionMeters: '420 m',
      summaryPercentage: '67%',
    });

    expect(state.subtitle).toBe(`${sampleSummary.level.name} emaitza`);
    expect(state.showBackButton).toBe(true);
    expect(state.metric?.variant).toBe('success');
    expect(state.metric?.label).toBe('67%');
  });

  it('falls back to streak metric on regular screens', () => {
    const state = resolveTopBarState({
      mainScreen: 'stats',
      dailySession: false,
      quiz: null,
      summary: null,
      completedLevels: 4,
      totalLevels: 10,
      consecutivePlayDays: 5,
      streakTone: 'streak-3',
      currentSessionMeters: '0 m',
      summaryPercentage: null,
    });

    expect(state.subtitle).toBeNull();
    expect(state.showBackButton).toBe(false);
    expect(state.metric).toMatchObject({
      variant: 'streak',
      label: '5 egun',
      streakTone: 'streak-3',
    });
  });
});

describe('resolveDockItems', () => {
  it('hides the dock while a daily session is active', () => {
    const items = resolveDockItems({
      isTeacher: false,
      mainScreen: 'daily',
      dailySession: true,
      quiz: null,
      summary: null,
    });

    expect(items).toEqual([]);
  });

  it('builds teacher navigation without public tabs', () => {
    const items = resolveDockItems({
      isTeacher: true,
      mainScreen: 'admin',
      dailySession: false,
      quiz: null,
      summary: null,
    });

    expect(items.map((item) => item.action)).toEqual(['home', 'admin', 'profile']);
    expect(items.find((item) => item.action === 'admin')?.active).toBe(true);
  });

  it('builds learner navigation with learning and ranking tabs', () => {
    const items = resolveDockItems({
      isTeacher: false,
      mainScreen: 'stats',
      dailySession: false,
      quiz: null,
      summary: null,
    });

    expect(items.map((item) => item.action)).toEqual(['home', 'learn', 'stats', 'profile']);
    expect(items.find((item) => item.action === 'stats')?.active).toBe(true);
  });

  it('replaces navigation with replay and study actions when a level is finished', () => {
    const items = resolveDockItems({
      isTeacher: false,
      mainScreen: 'synonyms',
      dailySession: false,
      quiz: null,
      summary: sampleSummary,
    });

    expect(items.map((item) => item.action)).toEqual(['retry-level', 'learn']);
    expect(items[1]).toMatchObject({ tone: 'primary', wide: true });
    expect(items[1]?.label).toBe('Ikasi');
  });

  it('keeps the same summary actions regardless of next unlocked level', () => {
    const items = resolveDockItems({
      isTeacher: false,
      mainScreen: 'synonyms',
      dailySession: false,
      quiz: null,
      summary: sampleSummary,
    });

    expect(items.map((item) => item.action)).toEqual(['retry-level', 'learn']);
  });

  it('keeps the learning dock item active on synonym and grammar screens', () => {
    const synonymItems = resolveDockItems({
      isTeacher: false,
      mainScreen: 'synonyms',
      dailySession: false,
      quiz: null,
      summary: null,
    });
    const grammarItems = resolveDockItems({
      isTeacher: false,
      mainScreen: 'grammar',
      dailySession: false,
      quiz: null,
      summary: null,
    });
    const vocabularyItems = resolveDockItems({
      isTeacher: false,
      mainScreen: 'vocabulary',
      dailySession: false,
      quiz: null,
      summary: null,
    });
    const verbsItems = resolveDockItems({
      isTeacher: false,
      mainScreen: 'verbs',
      dailySession: false,
      quiz: null,
      summary: null,
    });

    expect(synonymItems.find((item) => item.action === 'learn')?.active).toBe(true);
    expect(grammarItems.find((item) => item.action === 'learn')?.active).toBe(true);
    expect(vocabularyItems.find((item) => item.action === 'learn')?.active).toBe(true);
    expect(verbsItems.find((item) => item.action === 'learn')?.active).toBe(true);
  });
});
