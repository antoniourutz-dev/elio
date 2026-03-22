import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSynonymBank } from '../euskeraLearning';
import type { BankState } from '../appTypes';

const initialBankState: BankState = {
  isLoading: true,
  isReady: false,
  entries: [],
  message: 'Supabasera konektatzen...',
};

export function useSynonymBank(playerUserId: string | null | undefined, isSessionLoading: boolean) {
  const [bankState, setBankState] = useState<BankState>(initialBankState);
  const hydratedUserIdRef = useRef<string | null | undefined>(undefined);

  const refreshBank = useCallback(async () => {
    setBankState((current) => ({
      ...current,
      isLoading: true,
      message: current.entries.length > 0 ? current.message : 'Supabasera konektatzen...',
    }));

    const result = await loadSynonymBank();

    setBankState({
      isLoading: false,
      isReady: result.ok,
      entries: result.entries,
      message: result.message,
    });
  }, []);

  useEffect(() => {
    if (isSessionLoading) return;

    const nextUserId = playerUserId ?? null;
    if (hydratedUserIdRef.current === nextUserId) return;

    hydratedUserIdRef.current = nextUserId;
    queueMicrotask(() => {
      void refreshBank();
    });
  }, [isSessionLoading, playerUserId, refreshBank]);

  return {
    bankState,
    refreshBank,
  };
}
