import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadPublishedLessons } from '../lib/lessons';
import { measureAsyncOperation } from '../lib/performanceMetrics';

const lessonQueryKeys = {
  list: (limit: number) => ['lessons', 'list', limit] as const,
};

export function usePublishedLessons(limit: number, isEnabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: lessonQueryKeys.list(limit),
    queryFn: () =>
      measureAsyncOperation('query', 'published-lessons', () => loadPublishedLessons(limit), {
        details: { limit },
      }),
    enabled: isEnabled,
    staleTime: 5 * 60_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: lessonQueryKeys.list(limit) });
    await query.refetch();
  };

  return {
    isLoading: query.isLoading || query.isFetching,
    isReady: query.data?.ok ?? false,
    lessons: query.data?.lessons ?? [],
    message: query.data?.message ?? 'Ikasgaiak kargatzen...',
    refresh,
  };
}
