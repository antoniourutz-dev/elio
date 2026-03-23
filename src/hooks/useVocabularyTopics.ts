import { useEffect, useState } from 'react';
import { loadVocabularyTopics } from '../lib/vocabulary';
import type { VocabularyTopic } from '../lib/vocabulary';

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

export function useVocabularyTopics(isEnabled: boolean) {
  const [state, setState] = useState<VocabularyState>(initialState);

  useEffect(() => {
    if (!isEnabled) {
      setState(initialState);
      return;
    }

    let active = true;

    setState((current) => ({
      ...current,
      isLoading: true,
      message: current.topics.length > 0 ? current.message : 'Hiztegia kargatzen...',
    }));

    void loadVocabularyTopics().then((result) => {
      if (!active) return;
      setState({
        isLoading: false,
        topics: result.topics,
        message: result.message,
        isReady: result.ok,
      });
    });

    return () => {
      active = false;
    };
  }, [isEnabled]);

  const refresh = async () => {
    setState((current) => ({
      ...current,
      isLoading: true,
      message: current.topics.length > 0 ? current.message : 'Hiztegia kargatzen...',
    }));

    const result = await loadVocabularyTopics();
    setState({
      isLoading: false,
      topics: result.topics,
      message: result.message,
      isReady: result.ok,
    });
  };

  return {
    ...state,
    refresh,
  };
}
