import { useState, useEffect, useRef, useCallback } from 'react';
import type { SynonymEntry, PlayerIdentity } from '../lib/types';
import type {
  GameWord,
  EroglificoEntry,
  DailyAnswer,
  DailyGameSession,
  DailyResult,
  DailyRankingEntry,
  DailyWeeklyRankingEntry,
  DailyStoredAnswer,
} from '../appTypes';
import {
  getDayKey,
  getWeekRange,
  loadGameWords,
  loadDailyHieroglyphs,
  buildDailyGame,
  calculateDailyScore,
  loadMyDailyResult,
  saveDailyResult,
  loadDailyRanking,
  loadMyWeekHistory,
  loadWeeklyRanking,
} from '../lib/daily';
import { isSuperPlayer } from '../lib/auth';
import { normalizeTextKey } from '../lib/parsing';

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
  synonymEntries: SynonymEntry[];
}

export interface UseDailyGameReturn {
  dayKey: string;
  gameWords: GameWord[];
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

function buildStoredAnswers(session: DailyGameSession): DailyStoredAnswer[] {
  return session.answers.map((ans, index) => {
    const question = session.questions[index];
    return {
      type: ans.questionType,
      word: question.type === 'spelling' ? question.displayText : question.type === 'synonym' ? question.word : question.clue,
      selected: ans.wasSolved ? 'Ebatzita' : ans.selectedAnswer,
      correct: ans.correctAnswer,
      isCorrect: ans.isCorrect,
      wasSolved: ans.wasSolved,
    };
  });
}

export function useDailyGame({ activePlayer, synonymEntries }: UseDailyGameOptions): UseDailyGameReturn {
  const dayKey = getDayKey();
  const isSuperUser = isSuperPlayer(activePlayer);
  const [gameWords, setGameWords] = useState<GameWord[]>([]);
  const [hieroglyphs, setHieroglyphs] = useState<EroglificoEntry[]>([]);
  const [dailySession, setDailySession] = useState<DailyGameSession | null>(null);
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);
  const [ranking, setRanking] = useState<DailyRankingEntry[]>([]);
  const [weeklyRanking, setWeeklyRanking] = useState<DailyWeeklyRankingEntry[]>([]);
  const [weekHistory, setWeekHistory] = useState<DailyResult[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { start: weekStart, end: weekEnd } = getWeekRange();

  useEffect(() => {
    void loadGameWords().then(setGameWords);
    void loadDailyHieroglyphs().then(setHieroglyphs);
  }, []);

  useEffect(() => {
    if (!activePlayer) return;
    const fetch = async () => {
      setIsLoadingData(true);
      const [result, entries, weekEntries, history] = isSuperUser
        ? await Promise.all([
            Promise.resolve(null),
            loadDailyRanking(dayKey),
            loadWeeklyRanking(weekStart, weekEnd),
            Promise.resolve([]),
          ])
        : await Promise.all([
            loadMyDailyResult(activePlayer.userId, dayKey),
            loadDailyRanking(dayKey),
            loadWeeklyRanking(weekStart, weekEnd),
            loadMyWeekHistory(activePlayer.userId, weekStart, weekEnd),
          ]);
      setDailyResult(result);
      setRanking(entries);
      setWeeklyRanking(weekEntries);
      setWeekHistory(history);
      setIsLoadingData(false);
    };
    void fetch();
  }, [activePlayer?.userId, dayKey, weekStart, weekEnd, isSuperUser]); // eslint-disable-line react-hooks/exhaustive-deps

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

    let cancelled = false;

    void loadMyDailyResult(activePlayer.userId, dayKey).then((existingResult) => {
      if (cancelled) return;

      clearDailySessionMarker();

      if (existingResult) {
        setDailyResult(existingResult);
        return;
      }

      const abandonedResult: DailyResult = {
        dayKey: marker.dayKey,
        score: 0,
        correctCount: 0,
        totalQuestions: marker.totalQuestions,
        secondsElapsed: Math.max(0, Math.floor((Date.now() - marker.startedAt) / 1000)),
        completedAt: new Date().toISOString(),
        answers: [],
      };

      setDailyResult(abandonedResult);

      void saveDailyResult(activePlayer.userId, activePlayer.code, abandonedResult).then(() => {
        void Promise.all([
          loadDailyRanking(dayKey).then(setRanking),
          loadWeeklyRanking(weekStart, weekEnd).then(setWeeklyRanking),
          loadMyWeekHistory(activePlayer.userId, weekStart, weekEnd).then(setWeekHistory),
        ]);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activePlayer, dailyResult, dailySession, dayKey, isSuperUser, weekEnd, weekStart]);

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
    if (synonymEntries.length === 0) return;
    const questions = buildDailyGame(dayKey, gameWords, synonymEntries, hieroglyphs);
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
      questions,
      currentIndex: 0,
      answers: [],
      startedAt,
    });
  }, [activePlayer, dayKey, gameWords, synonymEntries, hieroglyphs, isSuperUser]);

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
    const storedAnswers = buildStoredAnswers(dailySession);
    const result: DailyResult = {
      dayKey: dailySession.dayKey,
      score,
      correctCount,
      totalQuestions,
      secondsElapsed,
      completedAt: new Date().toISOString(),
      answers: storedAnswers,
    };

    clearDailySessionMarker();
    setDailyResult(isSuperUser ? null : result);
    setDailySession(null);

    if (activePlayer) {
      void saveDailyResult(activePlayer.userId, activePlayer.code, result).then(() => {
        void Promise.all([
          loadDailyRanking(dayKey).then(setRanking),
          loadWeeklyRanking(weekStart, weekEnd).then(setWeeklyRanking),
          isSuperUser ? Promise.resolve([]).then(setWeekHistory) : loadMyWeekHistory(activePlayer.userId, weekStart, weekEnd).then(setWeekHistory),
        ]);
      });
    }
  }, [dailySession, activePlayer, dayKey, weekStart, weekEnd, isSuperUser]);

  const abandonDailyGame = useCallback(() => {
    if (!dailySession) {
      clearDailySessionMarker();
      setElapsedSeconds(0);
      return;
    }

    const secondsElapsed = Math.floor((Date.now() - dailySession.startedAt) / 1000);
    const correctCount = dailySession.answers.filter((answer) => answer.isCorrect).length;
    const result: DailyResult = {
      dayKey: dailySession.dayKey,
      score: 0,
      correctCount,
      totalQuestions: dailySession.questions.length,
      secondsElapsed,
      completedAt: new Date().toISOString(),
      answers: buildStoredAnswers(dailySession),
    };

    clearDailySessionMarker();
    setDailySession(null);
    setElapsedSeconds(0);
    setDailyResult(isSuperUser ? null : result);

    if (!activePlayer || isSuperUser) {
      return;
    }

    void saveDailyResult(activePlayer.userId, activePlayer.code, result).then(() => {
      void Promise.all([
        loadDailyRanking(dayKey).then(setRanking),
        loadWeeklyRanking(weekStart, weekEnd).then(setWeeklyRanking),
        loadMyWeekHistory(activePlayer.userId, weekStart, weekEnd).then(setWeekHistory),
      ]);
    });
  }, [activePlayer, dailySession, dayKey, isSuperUser, weekEnd, weekStart]);

  const myRankEntry = activePlayer
    ? (ranking.find((r) => r.playerCode === activePlayer.code) ?? null)
    : null;

  const myWeekRankEntry = activePlayer
    ? (weeklyRanking.find((r) => r.playerCode === activePlayer.code) ?? null)
    : null;

  return {
    dayKey,
    gameWords,
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
    answerDailyQuestion,
    solveDailyQuestion,
    advanceDailyQuestion,
    abandonDailyGame,
  };
}
