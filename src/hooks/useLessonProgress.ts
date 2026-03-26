import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeLessonProgress,
  loadLessonUserProgress,
  markLessonInProgress,
  recordLessonExerciseAttempt,
  type LessonAttemptInput,
  type LessonUserProgress,
} from '../lib/lessonFlow';
import { measureAsyncOperation } from '../lib/performanceMetrics';

const lessonProgressQueryKeys = {
  detail: (userId: string | null, lessonId: number | string | null) => ['lesson-progress', userId ?? 'anon', lessonId ?? 'unknown'] as const,
};

interface CompleteLessonStats {
  attempts: number;
  correctCount: number;
  wrongCount: number;
}

export function useLessonProgress(userId: string | null, lessonId: number | string | null, isEnabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: lessonProgressQueryKeys.detail(userId, lessonId),
    queryFn: () =>
      measureAsyncOperation(
        'query',
        'lesson-progress',
        () => loadLessonUserProgress(userId!, lessonId!),
        { details: { userId, lessonId } }
      ),
    enabled: isEnabled && Boolean(userId) && lessonId !== null && lessonId !== undefined,
    staleTime: 30_000,
  });

  const markInProgressMutation = useMutation({
    mutationFn: (previousProgress: LessonUserProgress | null) =>
      measureAsyncOperation(
        'mutation',
        'lesson-progress-in-progress',
        () => markLessonInProgress(userId!, lessonId!, previousProgress),
        { details: { userId, lessonId } }
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: lessonProgressQueryKeys.detail(userId, lessonId) });
    },
  });

  const attemptMutation = useMutation({
    mutationFn: (payload: Omit<LessonAttemptInput, 'userId' | 'lessonId'>) =>
      measureAsyncOperation(
        'mutation',
        'lesson-attempt',
        () =>
          recordLessonExerciseAttempt({
            ...payload,
            userId: userId!,
            lessonId: lessonId!,
          }),
        { details: { userId, lessonId, exerciseId: payload.exerciseId } }
      ),
  });

  const completeMutation = useMutation({
    mutationFn: ({ stats, previousProgress }: { stats: CompleteLessonStats; previousProgress: LessonUserProgress | null }) =>
      measureAsyncOperation(
        'mutation',
        'lesson-progress-complete',
        () => completeLessonProgress(userId!, lessonId!, stats, previousProgress),
        { details: { userId, lessonId, ...stats } }
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: lessonProgressQueryKeys.detail(userId, lessonId) });
    },
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: lessonProgressQueryKeys.detail(userId, lessonId) });
    await query.refetch();
  };

  return {
    isLoading: query.isLoading || query.isFetching,
    isReady: query.data?.ok ?? false,
    progress: query.data?.progress ?? null,
    message: query.data?.message ?? 'Aurrerapena kargatzen...',
    refresh,
    markInProgress: markInProgressMutation.mutateAsync,
    recordAttempt: attemptMutation.mutateAsync,
    completeLesson: completeMutation.mutateAsync,
  };
}
