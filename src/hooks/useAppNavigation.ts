import { useCallback, type RefObject } from 'react';
import { writeGrammarProgress } from '../lib/grammarProgress';
import { useAppUiStore } from '../stores/useAppUiStore';
import type { DailyGameSession } from '../appTypes';
import type { PlayerIdentity } from '../lib/types';
import type { MainScreen } from '../components/app/appChrome';

interface UseAppNavigationArgs {
  shellRef: RefObject<HTMLDivElement | null>;
  activePlayer: PlayerIdentity | null;
  dailySession: DailyGameSession | null;
  grammarCompletedStops: number;
  leaveGame: () => void;
  startOrthographyPractice: () => void;
  abandonDailyGame: () => void;
}

const TOTAL_GRAMMAR_STOPS = 10;

export function useAppNavigation({
  shellRef,
  activePlayer,
  dailySession,
  grammarCompletedStops,
  leaveGame,
  startOrthographyPractice,
  abandonDailyGame,
}: UseAppNavigationArgs) {
  const mainScreen = useAppUiStore((state) => state.mainScreen);
  const setMainScreen = useAppUiStore((state) => state.setMainScreen);
  const setStudyLevel = useAppUiStore((state) => state.setStudyLevel);
  const setDailyExitWarningOpen = useAppUiStore((state) => state.setDailyExitWarningOpen);
  const setActiveGrammarLessonSlug = useAppUiStore((state) => state.setActiveGrammarLessonSlug);
  const setGrammarCompletedStops = useAppUiStore((state) => state.setGrammarCompletedStops);

  const openMainScreen = useCallback((screen: MainScreen) => {
    setMainScreen(screen);
    shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setMainScreen, shellRef]);

  const scrollTop = useCallback(() => {
    shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [shellRef]);

  const goHome = useCallback(() => openMainScreen('daily'), [openMainScreen]);

  const goLearn = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('learn');
  }, [leaveGame, openMainScreen, setStudyLevel]);

  const goSynonyms = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('synonyms');
  }, [leaveGame, openMainScreen, setStudyLevel]);

  const goGrammar = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    setActiveGrammarLessonSlug(null);
    openMainScreen('grammar');
  }, [leaveGame, openMainScreen, setActiveGrammarLessonSlug, setStudyLevel]);

  const openGrammarLesson = useCallback((slug?: string | null) => {
    leaveGame();
    setStudyLevel(null);
    setActiveGrammarLessonSlug(slug ?? null);
    openMainScreen('grammar-lesson');
  }, [leaveGame, openMainScreen, setActiveGrammarLessonSlug, setStudyLevel]);

  const completeGrammarStop = useCallback(() => {
    if (!activePlayer?.userId) return;

    const next = Math.min(grammarCompletedStops + 1, TOTAL_GRAMMAR_STOPS);
    setGrammarCompletedStops(next);
    writeGrammarProgress(activePlayer.userId, next);
  }, [activePlayer?.userId, grammarCompletedStops, setGrammarCompletedStops]);

  const goVocabulary = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('vocabulary');
  }, [leaveGame, openMainScreen, setStudyLevel]);

  const goTopics = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('topics');
  }, [leaveGame, openMainScreen, setStudyLevel]);

  const goVerbs = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('verbs');
  }, [leaveGame, openMainScreen, setStudyLevel]);

  const goOrthographyPractice = useCallback(() => {
    leaveGame();
    setStudyLevel(null);
    openMainScreen('learn');
    startOrthographyPractice();
  }, [leaveGame, openMainScreen, setStudyLevel, startOrthographyPractice]);

  const goStats = useCallback(() => openMainScreen('stats'), [openMainScreen]);
  const goAdmin = useCallback(() => openMainScreen('admin'), [openMainScreen]);
  const goProfile = useCallback(() => openMainScreen('profile'), [openMainScreen]);

  const handleBackFromSynonymsGame = useCallback(() => {
    leaveGame();
    setMainScreen('synonyms');
    shellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [leaveGame, setMainScreen, shellRef]);

  const handleTopBarBack = useCallback(() => {
    if (dailySession) {
      if (dailySession.mode === 'orthography_practice') {
        abandonDailyGame();
        return;
      }

      setDailyExitWarningOpen(true);
      return;
    }

    if (mainScreen === 'grammar-lesson') {
      setMainScreen('grammar');
      return;
    }

    handleBackFromSynonymsGame();
  }, [abandonDailyGame, dailySession, handleBackFromSynonymsGame, mainScreen, setDailyExitWarningOpen, setMainScreen]);

  const confirmDailyExit = useCallback(() => {
    setDailyExitWarningOpen(false);
    abandonDailyGame();
  }, [abandonDailyGame, setDailyExitWarningOpen]);

  return {
    scrollTop,
    goHome,
    goLearn,
    goSynonyms,
    goGrammar,
    openGrammarLesson,
    completeGrammarStop,
    goVocabulary,
    goTopics,
    goVerbs,
    goOrthographyPractice,
    goStats,
    goAdmin,
    goProfile,
    handleTopBarBack,
    confirmDailyExit,
  };
}
