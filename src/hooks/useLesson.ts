import { useEffect, useState } from 'react';
import { clearLessonCache, getLessonSnapshot, loadFirstPublishedLesson, loadLessonBySlug } from '../lib/lessons';
import type { Lesson } from '../lib/lessons';

interface LessonState {
  isLoading: boolean;
  isReady: boolean;
  lesson: Lesson | null;
  message: string;
}

const initialState: LessonState = {
  isLoading: true,
  isReady: false,
  lesson: null,
  message: 'Ikasgaia kargatzen...',
};

export function useLesson(slug: string | null, isEnabled: boolean) {
  const [state, setState] = useState<LessonState>(() => {
    const snapshot = slug ? getLessonSnapshot(slug) : null;
    if (!snapshot) return initialState;

    return {
      isLoading: false,
      isReady: snapshot.ok,
      lesson: snapshot.lesson,
      message: snapshot.message,
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
      message: current.lesson ? current.message : 'Ikasgaia kargatzen...',
    }));

    const request = slug ? loadLessonBySlug(slug) : loadFirstPublishedLesson();

    void request.then((result) => {
      if (!active) return;
      setState({
        isLoading: false,
        isReady: result.ok,
        lesson: result.lesson,
        message: result.message,
      });
    });

    return () => {
      active = false;
    };
  }, [isEnabled, slug]);

  const refresh = async () => {
    if (slug) {
      clearLessonCache(slug);
    } else {
      clearLessonCache();
    }
    setState((current) => ({
      ...current,
      isLoading: true,
      message: current.lesson ? current.message : 'Ikasgaia kargatzen...',
    }));

    const result = slug ? await loadLessonBySlug(slug) : await loadFirstPublishedLesson();
    setState({
      isLoading: false,
      isReady: result.ok,
      lesson: result.lesson,
      message: result.message,
    });
  };

  return {
    ...state,
    refresh,
  };
}
