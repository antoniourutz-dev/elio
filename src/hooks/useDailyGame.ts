import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PlayerIdentity } from '../lib/types';
import type {
  GameWord,
  OrthographyExercise,
  EroglificoEntry,
  DailyAnswer,
  DailyGameSession,
  DailyResult,
  DailyRankingEntry,
  DailyWeeklyRankingEntry,
  DailyStoredAnswer,
} from '../appTypes';
import { isSuperPlayer } from '../lib/auth';
import { getDayKey } from '../lib/dailyDates';
import { buildDailyGame, buildOrthographyPracticeGame } from '../lib/dailyGameEngine';
import { logWarn } from '../lib/logger';
import { saveDailyResult } from '../lib/dailyRepository';
import { calculateDailyScore } from '../lib/dailyScoring';
import { normalizeTextKey } from '../lib/parsing';
import { useDailyRemoteData, dailyQueryKeys } from './useDailyRemoteData';
import {
  buildAbandonedDailyResult,
  buildCompletedDailyResult,
  buildRecoveredAbandonedDailyResult,
} from '../lib/dailySessionResults';

const DAILY_SESSION_MARKER_KEY = 'lexiko.daily-session-in-progress';

interface DailySessionMarker {
  ownerId: string;
  playerCode: string;
  dayKey: string;
  startedAt: number;
  totalQuestions: number;
}

interface UseDailyGameOptions {
  activePlayer: PlayerIdentity | null;
}

export interface UseDailyGameReturn {
  dayKey: string;
  gameWords: GameWord[];
  dailySynonymCount: number;
  orthographyExercises: OrthographyExercise[];
  hieroglyphs: EroglificoEntry[];
  dailySession: DailyGameSession | null;
  dailyResult: DailyResult | null;
  ranking: DailyRankingEntry[];
  weeklyRanking: DailyWeeklyRankingEntry[];
  weekHistory: DailyResult[];
  myRankEntry: DailyRankingEntry | null;
  myWeekRankEntry: DailyWeeklyRankingEntry | null;
  elapsedSeconds: number;
  isLoadingData: boolean;
  startDailyGame: () => void;
  startOrthographyPractice: () => void;
  answerDailyQuestion: (answer: string) => void;
  solveDailyQuestion: () => void;
  advanceDailyQuestion: () => void;
  abandonDailyGame: () => void;
}

function loadDailySessionMarker(): DailySessionMarker | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(DAILY_SESSION_MARKER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DailySessionMarker;
  } catch {
    return null;
  }
}

function saveDailySessionMarker(marker: DailySessionMarker): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(DAILY_SESSION_MARKER_KEY, JSON.stringify(marker));
  } catch {
    // Ignore local storage failures and keep the in-memory session running.
  }
}

function clearDailySessionMarker(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(DAILY_SESSION_MARKER_KEY);
  } catch {
    // Ignore local storage failures.
  }
}

export function useDailyGame({ activePlayer }: UseDailyGameOptions): UseDailyGameReturn {
  const queryClient = useQueryClient();
  const dayKey = getDayKey();
  const isSuperUser = isSuperPlayer(activePlayer);
  const [dailySession, setDailySession] = useState<DailyGameSession | null>(null);
  const [sessionResultOverride, setSessionResultOverride] = useState<DailyResult | null | undefined>(undefined);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const {
    gameWords,
    dailySynonymEntries,
    orthographyExercises,
    hieroglyphs,
    dailyResult: remoteDailyResult,
    ranking,
    weeklyRanking,
    weekHistory,
    isLoadingData,
    isLoadingDailyResult,
    weekStart,
    weekEnd,
  } = useDailyRemoteData({
    activePlayer,
    dayKey,
  });
  const dailyResult = isSuperUser ? null : (sessionResultOverride ?? remoteDailyResult);

  useEffect(() => {
    setSessionResultOverride(undefined);
  }, [activePlayer?.userId, dayKey]);

  useEffect(() => {
    const marker = loadDailySessionMarker();
    if (!marker) return;

    if (marker.dayKey !== dayKey || !activePlayer || marker.ownerId !== activePlayer.userId) {
      clearDailySessionMarker();
      return;
    }

    if (isSuperUser || dailySession || dailyResult) {
      clearDailySessionMarker();
      return;
    }

    if (isLoadingDailyResult) {
      return;
    }

    let cancelled = false;
    clearDailySessionMarker();

    if (remoteDailyResult) {
      setSessionResultOverride(remoteDailyResult);
      return;
    }

    const abandonedResult = buildRecoveredAbandonedDailyResult(marker);

    setSessionResultOverride(abandonedResult);

    void saveDailyResult(activePlayer.userId, activePlayer.code, abandonedResult).then(async () => {
      if (cancelled) return;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dailyQueryKeys.myResult(activePlayer.userId, dayKey) }),
        queryClient.invalidateQueries({ queryKey: dailyQueryKeys.ranking(dayKey) }),
        queryClient.invalidateQueries({ queryKey: dailyQueryKeys.weeklyRanking(weekStart, weekEnd) }),
        queryClient.invalidateQueries({
          queryKey: dailyQueryKeys.weekHistory(activePlayer.userId, weekStart, weekEnd),
        }),
      ]);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activePlayer,
    dailyResult,
    dailySession,
    dayKey,
    isLoadingDailyResult,
    isSuperUser,
    queryClient,
    remoteDailyResult,
    weekEnd,
    weekStart,
  ]);

  // Timer while a session is active
  useEffect(() => {
    if (!dailySession) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - dailySession.startedAt) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [dailySession]);

  const startDailyGame = useCallback(() => {
    if (dailySynonymEntries.length === 0) return;
    const questions = buildDailyGame(dayKey, gameWords, orthographyExercises, dailySynonymEntries, hieroglyphs);
    if (questions.length === 0) return;
    const startedAt = Date.now();
    setElapsedSeconds(0);
    if (activePlayer && !isSuperUser) {
      saveDailySessionMarker({
        ownerId: activePlayer.userId,
        playerCode: activePlayer.code,
        dayKey,
        startedAt,
        totalQuestions: questions.length,
      });
    }
    setDailySession({
      dayKey,
      mode: 'daily',
      questions,
      currentIndex: 0,
      answers: [],
      startedAt,
    });
  }, [activePlayer, dailySynonymEntries, dayKey, gameWords, orthographyExercises, hieroglyphs, isSuperUser]);

  const startOrthographyPractice = useCallback(() => {
    if (orthographyExercises.length === 0 && gameWords.length === 0) {
      logWarn('dailyGame', 'No orthography or spelling exercises are available.');
      return;
    }
    const questions = buildOrthographyPracticeGame(dayKey, orthographyExercises, gameWords);
    if (questions.length === 0) return;
    const startedAt = Date.now();
    clearDailySessionMarker();
    setElapsedSeconds(0);
    setDailySession({
      dayKey,
      mode: 'orthography_practice',
      questions,
      currentIndex: 0,
      answers: [],
      startedAt,
    });
  }, [dayKey, gameWords, orthographyExercises]);

  const answerDailyQuestion = useCallback((selectedAnswer: string) => {
    setDailySession((current) => {
      if (!current) return current;
      if (current.answers[current.currentIndex]) return current;
      const question = current.questions[current.currentIndex];
      const correctAnswer = question.correctAnswer;
      const isCorrect =
        question.type === 'eroglifico'
          ? question.acceptedAnswers.includes(normalizeTextKey(selectedAnswer))
          : selectedAnswer === correctAnswer;
      const answer: DailyAnswer = {
        questionId: question.id,
        questionType: question.type,
        selectedAnswer,
        correctAnswer,
        isCorrect,
      };
      return { ...current, answers: [...current.answers, answer] };
    });
  }, []);

  const solveDailyQuestion = useCallback(() => {
    setDailySession((current) => {
      if (!current) return current;
      if (current.answers[current.currentIndex]) return current;
      const question = current.questions[current.currentIndex];
      if (question.type !== 'eroglifico') return current;

      const answer: DailyAnswer = {
        questionId: question.id,
        questionType: question.type,
        selectedAnswer: '',
        correctAnswer: question.correctAnswer,
        isCorrect: false,
        wasSolved: true,
      };

      return { ...current, answers: [...current.answers, answer] };
    });
  }, []);

  const advanceDailyQuestion = useCallback(() => {
    if (!dailySession) return;
    if (!dailySession.answers[dailySession.currentIndex]) return;

    const isLast = dailySession.currentIndex === dailySession.questions.length - 1;

    if (!isLast) {
      setDailySession((current) =>
        current ? { ...current, currentIndex: current.currentIndex + 1 } : current
      );
      return;
    }

    // Last question — finish game
    const secondsElapsed = Math.floor((Date.now() - dailySession.startedAt) / 1000);
    const correctCount = dailySession.answers.filter((a) => a.isCorrect).length;
    const totalQuestions = dailySession.questions.length;
    const score = calculateDailyScore(correctCount, secondsElapsed);
    const result = buildCompletedDailyResult(dailySession, score, secondsElapsed);

    const isPracticeSession = dailySession.mode === 'orthography_practice';

    clearDailySessionMarker();
    if (!isPracticeSession) {
      setSessionResultOverride(isSuperUser ? null : result);
    }
    setDailySession(null);
    setElapsedSeconds(0);

    if (isPracticeSession || !activePlayer) {
      return;
    }

    void saveDailyResult(activePlayer.userId, activePlayer.code, result).then(async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dailyQueryKeys.myResult(activePlayer.userId, dayKey) }),
        queryClient.invalidateQueries({ queryKey: dailyQueryKeys.ranking(dayKey) }),
        queryClient.invalidateQueries({ queryKey: dailyQueryKeys.weeklyRanking(weekStart, weekEnd) }),
        queryClient.invalidateQueries({
          queryKey: dailyQueryKeys.weekHistory(activePlayer.userId, weekStart, weekEnd),
        }),
      ]);
    });
  }, [activePlayer, dailySession, dayKey, isSuperUser, queryClient, weekEnd, weekStart]);

  const abandonDailyGame = useCallback(() => {
    if (!dailySession) {
      clearDailySessionMarker();
      setElapsedSeconds(0);
      return;
    }

    const isPracticeSession = dailySession.mode === 'orthography_practice';
    const secondsElapsed = Math.floor((Date.now() - dailySession.startedAt) / 1000);
    const result = buildAbandonedDailyResult(dailySession);

    clearDailySessionMarker();
    setDailySession(null);
    setElapsedSeconds(0);
    if (!isPracticeSession) {
      setSessionResultOverride(isSuperUser ? null : result);
    }

    if (isPracticeSession || !activePlayer || isSuperUser) {
      return;
    }

    void saveDailyResult(activePlayer.userId, activePlayer.code, result).then(async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dailyQueryKeys.myResult(activePlayer.userId, dayKey) }),
        queryClient.invalidateQueries({ queryKey: dailyQueryKeys.ranking(dayKey) }),
        queryClient.invalidateQueries({ queryKey: dailyQueryKeys.weeklyRanking(weekStart, weekEnd) }),
        queryClient.invalidateQueries({
          queryKey: dailyQueryKeys.weekHistory(activePlayer.userId, weekStart, weekEnd),
        }),
      ]);
    });
  }, [activePlayer, dailySession, dayKey, isSuperUser, queryClient, weekEnd, weekStart]);

  const myRankEntry = activePlayer
    ? (ranking.find((r) => r.playerCode === activePlayer.code) ?? null)
    : null;

  const myWeekRankEntry = activePlayer
    ? (weeklyRanking.find((r) => r.playerCode === activePlayer.code) ?? null)
    : null;

  return {
    dayKey,
    gameWords,
    dailySynonymCount: dailySynonymEntries.length,
    orthographyExercises,
    hieroglyphs,
    dailySession,
    dailyResult,
    ranking,
    weeklyRanking,
    weekHistory,
    myRankEntry,
    myWeekRankEntry,
    elapsedSeconds,
    isLoadingData,
    startDailyGame,
    startOrthographyPractice,
    answerDailyQuestion,
    solveDailyQuestion,
    advanceDailyQuestion,
    abandonDailyGame,
  };
}
