import { describe, expect, it, vi } from 'vitest';
import { buildAppScreenModel } from './useAppScreenModel';

describe('buildAppScreenModel', () => {
  it('assembles all shell view-model sections into one contract', () => {
    const model = buildAppScreenModel({
      isSessionLoading: false,
      access: {
        code: 'urko',
        password: '1234',
        message: null,
        isPasswordVisible: false,
        isSubmitting: false,
        onCodeChange: vi.fn(),
        onPasswordChange: vi.fn(),
        onPasswordVisibilityToggle: vi.fn(),
        onSubmit: vi.fn(),
      },
      main: {
        dayKey: '2026-03-22',
        dailyResult: null,
        canStartDailyGame: true,
        ranking: [],
        weeklyRanking: [],
        weekHistory: [],
        myRankEntry: null,
        myWeekRankEntry: null,
        isLoadingData: false,
        bankState: { isLoading: false, isReady: true, entries: [], message: 'ready' },
        progress: { learnerName: 'urko', forcedUnlockLevels: [], levelRecords: [] },
        currentTargetLevel: 2,
        homeNotice: null,
        isDemoMode: false,
        uiMessage: null,
        isTeacher: false,
        onStartDailyGame: vi.fn(),
        onGoSynonyms: vi.fn(),
        onStartLevel: vi.fn(),
        onRefreshBank: vi.fn(async () => {}),
        onScrollTop: vi.fn(),
        onLogout: vi.fn(),
      },
      dailyGame: {
        session: null,
        elapsedSeconds: 20,
        onAnswer: vi.fn(),
        onSolve: vi.fn(),
        onAdvance: vi.fn(),
      },
      synonymGame: {
        quiz: null,
        currentQuestion: null,
        currentAnswer: null,
        quizAdvanceLabel: 'Hurrengoa',
        summary: null,
        summaryErrors: [],
        onAnswer: vi.fn(),
        onAdvance: vi.fn(),
      },
      topBar: {
        title: 'urko',
        subtitle: 'Sinonimoak',
        showBackButton: false,
        metric: null,
      },
      dock: {
        items: [],
        onItemClick: vi.fn(),
      },
    });

    expect(model.isSessionLoading).toBe(false);
    expect(model.access.code).toBe('urko');
    expect(model.main.currentTargetLevel).toBe(2);
    expect(model.dailyGame.elapsedSeconds).toBe(20);
    expect(model.synonymGame.quizAdvanceLabel).toBe('Hurrengoa');
    expect(model.topBar).toMatchObject({ title: 'urko', subtitle: 'Sinonimoak' });
    expect(model.dock.items).toEqual([]);
  });

  it('preserves object identity for provided sections', () => {
    const access = {
      code: 'admin',
      password: '',
      message: 'ok',
      isPasswordVisible: true,
      isSubmitting: true,
      onCodeChange: vi.fn(),
      onPasswordChange: vi.fn(),
      onPasswordVisibilityToggle: vi.fn(),
      onSubmit: vi.fn(),
    };
    const dock = {
      items: [{ id: 'home', label: 'Hasiera', icon: vi.fn(), action: 'home' as const, active: true }],
      onItemClick: vi.fn(),
    };

    const model = buildAppScreenModel({
      isSessionLoading: true,
      access,
      main: {
        dayKey: '2026-03-22',
        dailyResult: null,
        canStartDailyGame: false,
        ranking: [],
        weeklyRanking: [],
        weekHistory: [],
        myRankEntry: null,
        myWeekRankEntry: null,
        isLoadingData: true,
        bankState: { isLoading: true, isReady: false, entries: [], message: 'loading' },
        progress: { learnerName: 'admin', forcedUnlockLevels: [], levelRecords: [] },
        currentTargetLevel: 1,
        homeNotice: 'demo',
        isDemoMode: true,
        uiMessage: 'demo',
        isTeacher: true,
        onStartDailyGame: vi.fn(),
        onGoSynonyms: vi.fn(),
        onStartLevel: vi.fn(),
        onRefreshBank: vi.fn(async () => {}),
        onScrollTop: vi.fn(),
        onLogout: vi.fn(),
      },
      dailyGame: { session: null, elapsedSeconds: 0, onAnswer: vi.fn(), onSolve: vi.fn(), onAdvance: vi.fn() },
      synonymGame: {
        quiz: null,
        currentQuestion: null,
        currentAnswer: null,
        quizAdvanceLabel: 'Amaitu',
        summary: null,
        summaryErrors: [],
        onAnswer: vi.fn(),
        onAdvance: vi.fn(),
      },
      topBar: { title: 'admin', subtitle: null, showBackButton: true, metric: null },
      dock,
    });

    expect(model.access).toBe(access);
    expect(model.dock).toBe(dock);
  });
});
