import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadVocabularyTopics } from '../lib/vocabulary';
import type { VocabularyTopic } from '../lib/vocabulary';
import { measureAsyncOperation } from '../lib/performanceMetrics';

interface VocabularyState {
  isLoading: boolean;
  topics: VocabularyTopic[];
  message: string;
  isReady: boolean;
}

const initialState: VocabularyState = {
  isLoading: true,
  topics: [],
  message: 'Hiztegia kargatzen...',
  isReady: false,
};

const vocabularyTopicsQueryKey = ['vocabulary', 'topics'] as const;

export function useVocabularyTopics(isEnabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: vocabularyTopicsQueryKey,
    queryFn: () => measureAsyncOperation('query', 'vocabulary-topics', loadVocabularyTopics),
    enabled: isEnabled,
    staleTime: 10 * 60_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: vocabularyTopicsQueryKey });
    await query.refetch();
  };

  const state: VocabularyState = query.data
    ? {
        isLoading: query.isLoading || query.isFetching,
        topics: query.data.topics,
        message: query.data.message,
        isReady: query.data.ok,
      }
    : {
        ...initialState,
        isLoading: isEnabled,
      };

  return {
    ...state,
    refresh,
  };
}
