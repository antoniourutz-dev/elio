import { useEffect, useState } from 'react';
import { clearVerbFormsCache, getVerbFormsSnapshot, loadVerbForms, preloadVerbForms } from '../lib/verbs';
import type { VerbFormRecord } from '../lib/verbs';

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

preloadVerbForms();

export function useVerbForms(isEnabled: boolean) {
  const [state, setState] = useState<VerbFormsState>(() => {
    const snapshot = getVerbFormsSnapshot();
    if (!snapshot) return initialState;

    return {
      isLoading: false,
      forms: snapshot.forms,
      message: snapshot.message,
      isReady: snapshot.ok,
    };
  });

  useEffect(() => {
    if (!isEnabled) {
      setState(initialState);
      return;
    }

    let active = true;

    setState((current) => ({
      ...current,
      isLoading: true,
      message: current.forms.length > 0 ? current.message : 'Aditzak kargatzen...',
    }));

    void loadVerbForms().then((result) => {
      if (!active) return;
      setState({
        isLoading: false,
        forms: result.forms,
        message: result.message,
        isReady: result.ok,
      });
    });

    return () => {
      active = false;
    };
  }, [isEnabled]);

  const refresh = async () => {
    clearVerbFormsCache();
    setState((current) => ({
      ...current,
      isLoading: true,
      message: current.forms.length > 0 ? current.message : 'Aditzak kargatzen...',
    }));

    const result = await loadVerbForms();
    setState({
      isLoading: false,
      forms: result.forms,
      message: result.message,
      isReady: result.ok,
    });
  };

  return {
    ...state,
    refresh,
  };
}
