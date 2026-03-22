import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatMeters, formatPercentage } from '../formatters';
import { resolveTopBarState, type MainScreen } from '../components/app/appChrome';
import type { ActiveQuiz, LevelSummary } from '../appTypes';

interface UseAppTopBarArgs {
  playerCode: string | null | undefined;
  mainScreen: MainScreen;
  dailySession: boolean;
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
  dailySession,
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
        dailySession,
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
      dailySession,
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

  return {
    title: playerCode ?? 'Elio',
    ...state,
    metric: dailySession && dailySessionProgress ? { icon: CheckCircle2, label: dailySessionProgress, variant: 'success' as const } : state.metric,
    secondaryMetric: dailySession && dailyElapsed ? { icon: undefined as never, label: dailyElapsed, variant: 'default' as const } : state.secondaryMetric ?? null,
  };
}
