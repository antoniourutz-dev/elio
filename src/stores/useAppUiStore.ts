import { create } from 'zustand';
import type { GameLevel } from '../lib/types';
import type { MainScreen } from '../components/app/appChrome';

interface AppUiState {
  mainScreen: MainScreen;
  studyLevel: GameLevel | null;
  isDailyExitWarningOpen: boolean;
  activeGrammarLessonSlug: string | null;
  grammarCompletedStops: number;
  setMainScreen: (screen: MainScreen) => void;
  setStudyLevel: (level: GameLevel | null) => void;
  setDailyExitWarningOpen: (isOpen: boolean) => void;
  setActiveGrammarLessonSlug: (slug: string | null) => void;
  setGrammarCompletedStops: (value: number) => void;
  advanceGrammarCompletedStops: (maxStops?: number) => void;
  resetNavigationState: () => void;
}

const initialState = {
  mainScreen: 'daily' as MainScreen,
  studyLevel: null as GameLevel | null,
  isDailyExitWarningOpen: false,
  activeGrammarLessonSlug: null as string | null,
  grammarCompletedStops: 0,
};

export const useAppUiStore = create<AppUiState>((set) => ({
  ...initialState,
  setMainScreen: (mainScreen) => set({ mainScreen }),
  setStudyLevel: (studyLevel) => set({ studyLevel }),
  setDailyExitWarningOpen: (isDailyExitWarningOpen) => set({ isDailyExitWarningOpen }),
  setActiveGrammarLessonSlug: (activeGrammarLessonSlug) => set({ activeGrammarLessonSlug }),
  setGrammarCompletedStops: (grammarCompletedStops) => set({ grammarCompletedStops: Math.max(0, grammarCompletedStops) }),
  advanceGrammarCompletedStops: (maxStops = 10) =>
    set((state) => ({
      grammarCompletedStops: Math.min(Math.max(0, maxStops), state.grammarCompletedStops + 1),
    })),
  resetNavigationState: () => set(initialState),
}));
