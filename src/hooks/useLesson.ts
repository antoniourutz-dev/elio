import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadFirstPublishedLesson, loadLessonBySlug } from '../lib/lessons';
import { measureAsyncOperation } from '../lib/performanceMetrics';

const lessonQueryKeys = {
  detail: (slug: string | null) => ['lessons', 'detail', slug ?? 'first-published'] as const,
};

export function useLesson(slug: string | null, isEnabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: lessonQueryKeys.detail(slug),
    queryFn: () =>
      measureAsyncOperation(
        'query',
        'lesson-detail',
        () => (slug ? loadLessonBySlug(slug) : loadFirstPublishedLesson()),
        { details: { slug: slug ?? 'first-published' } }
      ),
    enabled: isEnabled,
    staleTime: 5 * 60_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: lessonQueryKeys.detail(slug) });
    await query.refetch();
  };

  return {
    isLoading: query.isLoading || query.isFetching,
    isReady: query.data?.ok ?? false,
    lesson: query.data?.lesson ?? null,
    message: query.data?.message ?? 'Ikasgaia kargatzen...',
    refresh,
  };
}
