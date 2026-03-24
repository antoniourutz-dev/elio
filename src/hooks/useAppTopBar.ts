import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatMeters, formatPercentage } from '../formatters';
import { resolveTopBarState, type MainScreen } from '../components/app/appChrome';
import type { ActiveQuiz, LevelSummary } from '../appTypes';

interface UseAppTopBarArgs {
  playerCode: string | null | undefined;
  mainScreen: MainScreen;
  dailySessionMode?: 'daily' | 'orthography_practice' | null;
  dailySessionProgress: string | null;
  dailyElapsed: string | null;
  quiz: ActiveQuiz | null;
  quizProgress: string | null;
  summary: LevelSummary | null;
  completedLevels: number;
  totalLevels: number;
  consecutivePlayDays: number;
  streakTone: string;
  currentSessionMeters: number;
}

export function useAppTopBar({
  playerCode,
  mainScreen,
  dailySessionMode,
  dailySessionProgress,
  dailyElapsed,
  quiz,
  quizProgress,
  summary,
  completedLevels,
  totalLevels,
  consecutivePlayDays,
  streakTone,
  currentSessionMeters,
}: UseAppTopBarArgs) {
  const state = useMemo(
    () =>
      resolveTopBarState({
        mainScreen,
        dailySessionMode,
        quiz,
        quizProgress,
        summary,
        completedLevels,
        totalLevels,
        consecutivePlayDays,
        streakTone,
        currentSessionMeters: formatMeters(currentSessionMeters),
        summaryPercentage: summary ? formatPercentage(summary.progressPercentage) : null,
      }),
    [
      mainScreen,
      dailySessionMode,
      quiz,
      quizProgress,
      summary,
      completedLevels,
      totalLevels,
      consecutivePlayDays,
      streakTone,
      currentSessionMeters,
    ]
  );

  const sessionMetric =
    dailySessionMode && dailySessionProgress
      ? { icon: CheckCircle2, label: dailySessionProgress, variant: 'success' as const }
      : null;
  const sessionSecondary =
    dailySessionMode === 'daily' && dailyElapsed
      ? { icon: undefined as never, label: dailyElapsed, variant: 'default' as const }
      : null;
  const combinedDailyMetric =
    dailySessionMode === 'daily' && dailySessionProgress && dailyElapsed
      ? { icon: CheckCircle2, label: `${dailySessionProgress} · ${dailyElapsed}`, variant: 'success' as const }
      : null;

  return {
    title: playerCode ?? 'Elio',
    ...state,
    metric: combinedDailyMetric ?? sessionMetric ?? state.metric,
    secondaryMetric: combinedDailyMetric ? null : sessionSecondary ?? state.secondaryMetric ?? null,
  };
}
