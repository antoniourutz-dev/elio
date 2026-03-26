import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadFirstPublishedLessonFlow, loadLessonFlowBySlug } from '../lib/lessonFlow';
import { measureAsyncOperation } from '../lib/performanceMetrics';

const lessonFlowQueryKeys = {
  detail: (slug: string | null) => ['lesson-flow', slug ?? 'first-published'] as const,
};

async function fetchLessonFlow(slug: string | null) {
  return measureAsyncOperation(
    'query',
    'lesson-flow',
    () => (slug ? loadLessonFlowBySlug(slug) : loadFirstPublishedLessonFlow()),
    { details: { slug: slug ?? 'first-published' } }
  );
}

export function useLessonFlow(slug: string | null, isEnabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: lessonFlowQueryKeys.detail(slug),
    queryFn: () => fetchLessonFlow(slug),
    enabled: isEnabled,
    staleTime: 5 * 60_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: lessonFlowQueryKeys.detail(slug) });
    await query.refetch();
  };

  const prefetch = async (nextSlug: string | null) => {
    await queryClient.prefetchQuery({
      queryKey: lessonFlowQueryKeys.detail(nextSlug),
      queryFn: () => fetchLessonFlow(nextSlug),
      staleTime: 5 * 60_000,
    });
  };

  return {
    isLoading: query.isLoading || query.isFetching,
    isReady: query.data?.ok ?? false,
    lesson: query.data?.lesson ?? null,
    message: query.data?.message ?? 'Ikasgaia kargatzen...',
    refresh,
    prefetch,
  };
}
