import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadSynonymBank } from '../lib/bank';
import type { BankState } from '../appTypes';
import { measureAsyncOperation } from '../lib/performanceMetrics';

const initialBankState: BankState = {
  isLoading: true,
  isReady: false,
  entries: [],
  message: 'Supabasera konektatzen...',
};

const synonymBankQueryKey = (playerUserId: string | null | undefined) => ['synonym-bank', playerUserId ?? 'guest'] as const;

export function useSynonymBank(playerUserId: string | null | undefined, isSessionLoading: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: synonymBankQueryKey(playerUserId),
    queryFn: () =>
      measureAsyncOperation('query', 'synonym-bank', loadSynonymBank, {
        details: { playerUserId: playerUserId ?? 'guest' },
      }),
    enabled: !isSessionLoading && Boolean(playerUserId),
    staleTime: 5 * 60_000,
  });

  const refreshBank = async () => {
    await queryClient.invalidateQueries({ queryKey: synonymBankQueryKey(playerUserId) });
    await query.refetch();
  };

  const bankState: BankState = query.data
    ? {
        isLoading: query.isLoading || query.isFetching,
        isReady: query.data.ok,
        entries: query.data.entries,
        message: query.data.message,
      }
    : {
        ...initialBankState,
        isLoading: !isSessionLoading && Boolean(playerUserId),
      };

  return {
    bankState,
    refreshBank,
  };
}
