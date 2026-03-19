import { useState, useEffect, useRef, useCallback } from 'react';
import type { SynonymEntry, PlayerIdentity } from '../lib/types';
import type { GameWord, DailyAnswer, DailyGameSession, DailyResult, DailyRankingEntry, DailyWeeklyRankingEntry, DailyStoredAnswer } from '../appTypes';
import {
  getDayKey,
  getWeekRange,
  loadGameWords,
  buildDailyGame,
  calculateDailyScore,
  loadMyDailyResult,
  saveDailyResult,
  loadDailyRanking,
  loadMyWeekHistory,
  loadWeeklyRanking,
} from '../lib/daily';
import { isSuperPlayer } from '../lib/auth';

interface UseDailyGameOptions {
  activePlayer: PlayerIdentity | null;
  synonymEntries: SynonymEntry[];
}

export interface UseDailyGameReturn {
  dayKey: string;
  gameWords: GameWord[];
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
  advanceDailyQuestion: () => void;
  abandonDailyGame: () => void;
}

export function useDailyGame({ activePlayer, synonymEntries }: UseDailyGameOptions): UseDailyGameReturn {
  const dayKey = getDayKey();
  const isSuperUser = isSuperPlayer(activePlayer);
  const [gameWords, setGameWords] = useState<GameWord[]>([]);
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
    const questions = buildDailyGame(dayKey, gameWords, synonymEntries);
    if (questions.length === 0) return;
    setElapsedSeconds(0);
    setDailySession({
      dayKey,
      questions,
      currentIndex: 0,
      answers: [],
      startedAt: Date.now(),
    });
  }, [dayKey, gameWords, synonymEntries]);

  const answerDailyQuestion = useCallback((selectedAnswer: string) => {
    setDailySession((current) => {
      if (!current) return current;
      if (current.answers[current.currentIndex]) return current;
      const question = current.questions[current.currentIndex];
      const correctAnswer = question.type === 'spelling' ? question.correctAnswer : question.correctAnswer;
      const answer: DailyAnswer = {
        questionId: question.id,
        questionType: question.type,
        selectedAnswer,
        correctAnswer,
        isCorrect: selectedAnswer === correctAnswer,
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
    const storedAnswers: DailyStoredAnswer[] = dailySession.answers.map((ans, i) => {
      const q = dailySession.questions[i];
      return {
        type: ans.questionType,
        word: q.type === 'spelling' ? q.displayText : q.word,
        selected: ans.selectedAnswer,
        correct: ans.correctAnswer,
        isCorrect: ans.isCorrect,
      };
    });
    const result: DailyResult = {
      dayKey: dailySession.dayKey,
      score,
      correctCount,
      totalQuestions,
      secondsElapsed,
      completedAt: new Date().toISOString(),
      answers: storedAnswers,
    };

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
    setDailySession(null);
    setElapsedSeconds(0);
  }, []);

  const myRankEntry = activePlayer
    ? (ranking.find((r) => r.playerCode === activePlayer.code) ?? null)
    : null;

  const myWeekRankEntry = activePlayer
    ? (weeklyRanking.find((r) => r.playerCode === activePlayer.code) ?? null)
    : null;

  return {
    dayKey,
    gameWords,
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
    advanceDailyQuestion,
    abandonDailyGame,
  };
}
