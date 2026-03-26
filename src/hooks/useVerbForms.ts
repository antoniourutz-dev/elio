import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadVerbForms } from '../lib/verbs';
import type { VerbFormRecord } from '../lib/verbs';
import { measureAsyncOperation } from '../lib/performanceMetrics';

interface VerbFormsState {
  isLoading: boolean;
  forms: VerbFormRecord[];
  message: string;
  isReady: boolean;
}

const initialState: VerbFormsState = {
  isLoading: true,
  forms: [],
  message: 'Aditzak kargatzen...',
  isReady: false,
};

const verbFormsQueryKey = ['verbs', 'forms'] as const;

export function useVerbForms(isEnabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: verbFormsQueryKey,
    queryFn: () => measureAsyncOperation('query', 'verb-forms', loadVerbForms),
    enabled: isEnabled,
    staleTime: 10 * 60_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: verbFormsQueryKey });
    await query.refetch();
  };

  const state: VerbFormsState = query.data
    ? {
        isLoading: query.isLoading || query.isFetching,
        forms: query.data.forms,
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
