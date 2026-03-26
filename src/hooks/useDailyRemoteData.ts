import { useQuery } from '@tanstack/react-query';
import type {
  DailyRankingEntry,
  DailyResult,
  DailyWeeklyRankingEntry,
  EroglificoEntry,
  GameWord,
  OrthographyExercise,
} from '../appTypes';
import { isSuperPlayer } from '../lib/auth';
import { getWeekRange } from '../lib/dailyDates';
import {
  loadDailyHieroglyphs,
  loadDailySynonymEntries,
  loadDailyRanking,
  loadGameWords,
  loadMyDailyResult,
  loadMyWeekHistory,
  loadOrthographyExercises,
  loadWeeklyRanking,
} from '../lib/dailyRepository';
import { measureAsyncOperation } from '../lib/performanceMetrics';
import type { PlayerIdentity, SynonymEntry } from '../lib/types';

export const dailyQueryKeys = {
  gameWords: ['daily', 'content', 'game-words'] as const,
  synonymEntries: ['daily', 'content', 'synonym-entries'] as const,
  orthographyExercises: ['daily', 'content', 'orthography-exercises'] as const,
  hieroglyphs: ['daily', 'content', 'hieroglyphs'] as const,
  myResult: (ownerId: string | null | undefined, dayKey: string) =>
    ['daily', 'player', ownerId ?? 'guest', 'result', dayKey] as const,
  ranking: (dayKey: string) => ['daily', 'ranking', dayKey] as const,
  weeklyRanking: (weekStart: string, weekEnd: string) =>
    ['daily', 'weekly-ranking', weekStart, weekEnd] as const,
  weekHistory: (ownerId: string | null | undefined, weekStart: string, weekEnd: string) =>
    ['daily', 'player', ownerId ?? 'guest', 'week-history', weekStart, weekEnd] as const,
};

interface UseDailyRemoteDataOptions {
  activePlayer: PlayerIdentity | null;
  dayKey: string;
}

interface UseDailyRemoteDataReturn {
  gameWords: GameWord[];
  dailySynonymEntries: SynonymEntry[];
  orthographyExercises: OrthographyExercise[];
  hieroglyphs: EroglificoEntry[];
  dailyResult: DailyResult | null;
  ranking: DailyRankingEntry[];
  weeklyRanking: DailyWeeklyRankingEntry[];
  weekHistory: DailyResult[];
  isLoadingData: boolean;
  isLoadingDailyResult: boolean;
  weekStart: string;
  weekEnd: string;
}

export function useDailyRemoteData({
  activePlayer,
  dayKey,
}: UseDailyRemoteDataOptions): UseDailyRemoteDataReturn {
  const isSuperUser = isSuperPlayer(activePlayer);
  const { start: weekStart, end: weekEnd } = getWeekRange();
  const ownerId = activePlayer?.userId;

  const gameWordsQuery = useQuery({
    queryKey: dailyQueryKeys.gameWords,
    queryFn: () => measureAsyncOperation('query', 'daily-game-words', loadGameWords),
    staleTime: 10 * 60_000,
  });

  const dailySynonymEntriesQuery = useQuery({
    queryKey: dailyQueryKeys.synonymEntries,
    queryFn: () => measureAsyncOperation('query', 'daily-synonym-entries', loadDailySynonymEntries),
    staleTime: 10 * 60_000,
  });

  const orthographyExercisesQuery = useQuery({
    queryKey: dailyQueryKeys.orthographyExercises,
    queryFn: () => measureAsyncOperation('query', 'daily-orthography-exercises', loadOrthographyExercises),
    staleTime: 10 * 60_000,
  });

  const hieroglyphsQuery = useQuery({
    queryKey: dailyQueryKeys.hieroglyphs,
    queryFn: () => measureAsyncOperation('query', 'daily-hieroglyphs', loadDailyHieroglyphs),
    staleTime: 10 * 60_000,
  });

  const dailyResultQuery = useQuery({
    queryKey: dailyQueryKeys.myResult(ownerId, dayKey),
    queryFn: () =>
      measureAsyncOperation('query', 'daily-my-result', () => loadMyDailyResult(ownerId!, dayKey), {
        details: { ownerId, dayKey },
      }),
    enabled: Boolean(ownerId) && !isSuperUser,
  });

  const rankingQuery = useQuery({
    queryKey: dailyQueryKeys.ranking(dayKey),
    queryFn: () => measureAsyncOperation('query', 'daily-ranking', () => loadDailyRanking(dayKey), { details: { dayKey } }),
    enabled: Boolean(activePlayer),
  });

  const weeklyRankingQuery = useQuery({
    queryKey: dailyQueryKeys.weeklyRanking(weekStart, weekEnd),
    queryFn: () =>
      measureAsyncOperation('query', 'daily-weekly-ranking', () => loadWeeklyRanking(weekStart, weekEnd), {
        details: { weekStart, weekEnd },
      }),
    enabled: Boolean(activePlayer),
  });

  const weekHistoryQuery = useQuery({
    queryKey: dailyQueryKeys.weekHistory(ownerId, weekStart, weekEnd),
    queryFn: () =>
      measureAsyncOperation('query', 'daily-week-history', () => loadMyWeekHistory(ownerId!, weekStart, weekEnd), {
        details: { ownerId, weekStart, weekEnd },
      }),
    enabled: Boolean(ownerId) && !isSuperUser,
  });

  return {
    gameWords: gameWordsQuery.data ?? [],
    dailySynonymEntries: dailySynonymEntriesQuery.data ?? [],
    orthographyExercises: orthographyExercisesQuery.data ?? [],
    hieroglyphs: hieroglyphsQuery.data ?? [],
    dailyResult: isSuperUser ? null : (dailyResultQuery.data ?? null),
    ranking: rankingQuery.data ?? [],
    weeklyRanking: weeklyRankingQuery.data ?? [],
    weekHistory: isSuperUser ? [] : (weekHistoryQuery.data ?? []),
    isLoadingData:
      (Boolean(activePlayer) &&
        (rankingQuery.isLoading ||
          rankingQuery.isFetching ||
          weeklyRankingQuery.isLoading ||
          weeklyRankingQuery.isFetching ||
          dailySynonymEntriesQuery.isLoading ||
          dailySynonymEntriesQuery.isFetching ||
          (!isSuperUser &&
            (dailyResultQuery.isLoading ||
              dailyResultQuery.isFetching ||
              weekHistoryQuery.isLoading ||
              weekHistoryQuery.isFetching)))) ||
      false,
    isLoadingDailyResult:
      (!isSuperUser &&
        Boolean(ownerId) &&
        (dailyResultQuery.isLoading || dailyResultQuery.isFetching)) ||
      false,
    weekStart,
    weekEnd,
  };
}
