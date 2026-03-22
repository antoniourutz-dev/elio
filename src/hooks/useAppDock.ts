import { useCallback, useMemo } from 'react';
import { resolveDockItems, type DockAction, type MainScreen } from '../components/app/appChrome';
import type { ActiveQuiz, LevelSummary } from '../appTypes';

interface UseAppDockArgs {
  isTeacher: boolean;
  mainScreen: MainScreen;
  dailySession: boolean;
  quiz: ActiveQuiz | null;
  summary: LevelSummary | null;
  onHome: () => void;
  onSynonyms: () => void;
  onStats: () => void;
  onAdmin: () => void;
  onProfile: () => void;
  onRetryLevel: () => void;
}

export function useAppDock({
  isTeacher,
  mainScreen,
  dailySession,
  quiz,
  summary,
  onHome,
  onSynonyms,
  onStats,
  onAdmin,
  onProfile,
  onRetryLevel,
}: UseAppDockArgs) {
  const items = useMemo(
    () =>
      resolveDockItems({
        isTeacher,
        mainScreen,
        dailySession,
        quiz,
        summary,
      }),
    [isTeacher, mainScreen, dailySession, quiz, summary]
  );

  const actions = useMemo<Record<DockAction, () => void>>(
    () => ({
      home: onHome,
      synonyms: onSynonyms,
      stats: onStats,
      admin: onAdmin,
      profile: onProfile,
      'retry-level': onRetryLevel,
    }),
    [onHome, onSynonyms, onStats, onAdmin, onProfile, onRetryLevel]
  );

  const onItemClick = useCallback(
    (action: DockAction) => {
      actions[action]();
    },
    [actions]
  );

  return {
    items,
    onItemClick,
  };
}
