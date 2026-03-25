import { useEffect, useState } from 'react';
import { clearLessonCache, loadPublishedLessons } from '../lib/lessons';
import type { LessonSummary } from '../lib/lessons';

interface PublishedLessonsState {
  isLoading: boolean;
  isReady: boolean;
  lessons: LessonSummary[];
  message: string;
}

const initialState: PublishedLessonsState = {
  isLoading: true,
  isReady: false,
  lessons: [],
  message: 'Ikasgaiak kargatzen...',
};

export function usePublishedLessons(limit: number, isEnabled: boolean) {
  const [state, setState] = useState<PublishedLessonsState>(initialState);

  useEffect(() => {
    if (!isEnabled) {
      setState(initialState);
      return;
    }

    let active = true;
    setState((current) => ({
      ...current,
      isLoading: true,
      message: current.lessons.length > 0 ? current.message : 'Ikasgaiak kargatzen...',
    }));

    void loadPublishedLessons(limit).then((result) => {
      if (!active) return;
      setState({
        isLoading: false,
        isReady: result.ok,
        lessons: result.lessons,
        message: result.message,
      });
    });

    return () => {
      active = false;
    };
  }, [isEnabled, limit]);

  const refresh = async () => {
    clearLessonCache();
    setState((current) => ({
      ...current,
      isLoading: true,
      message: current.lessons.length > 0 ? current.message : 'Ikasgaiak kargatzen...',
    }));

    const result = await loadPublishedLessons(limit);
    setState({
      isLoading: false,
      isReady: result.ok,
      lessons: result.lessons,
      message: result.message,
    });
  };

  return {
    ...state,
    refresh,
  };
}
