import { useState, useCallback, useEffect } from 'react';
import {
  getResolvedLevelRecord,
  isLevelUnlocked,
  recordLevelResult,
} from '../lib/progress';
import { getLevelUnlockTargetCount } from '../lib/stats';
import { buildLevelChallenge } from '../lib/quiz';
import { savePlayerProgress } from '../lib/storage';
import type { GameLevel, GameProgress, PlayerIdentity } from '../lib/types';
import type { ActiveQuiz, BankState, LevelSummary, SessionAnswer } from '../appTypes';
import type { MainScreen } from '../components/app/appChrome';

export interface UseSynonymGameProps {
  progress: GameProgress;
  setProgress: (p: GameProgress) => void;
  bankState: BankState;
  activePlayer: PlayerIdentity | null;
  setUiMessage: (msg: string | null) => void;
  setMainScreen: (screen: MainScreen) => void;
}

export function useSynonymGame({
  progress,
  setProgress,
  bankState,
  activePlayer,
  setUiMessage,
  setMainScreen,
}: UseSynonymGameProps) {
  const [quiz, setQuiz] = useState<ActiveQuiz | null>(null);
  const [summary, setSummary] = useState<LevelSummary | null>(null);


  useEffect(() => {
    if (!activePlayer) {
      queueMicrotask(() => {
        setQuiz(null);
        setSummary(null);
      });
    }
  }, [activePlayer]);

  const startLevel = useCallback(
    (level: GameLevel) => {
      if (!isLevelUnlocked(progress, level.index, bankState.entries)) return;

      const levelRecord = getResolvedLevelRecord(progress, bankState.entries, level);
      const result = buildLevelChallenge(bankState.entries, level, levelRecord);
      if (!result.ok) {
        setUiMessage(result.message);
        return;
      }

      setUiMessage(null);
      setSummary(null);
      setMainScreen('daily');
      setQuiz({
        level,
        levelTotalQuestions: result.totalAvailableQuestions,
        questions: result.questions.map((question) => ({
          id: question.id,
          word: question.word,
          correctAnswer: question.correctAnswer,
          options: question.options,
        })),
        currentIndex: 0,
        answers: [],
      });
    },
    [progress, bankState.entries, setUiMessage, setMainScreen]
  );

  const leaveGame = useCallback(() => {
    setQuiz(null);
    setSummary(null);
  }, []);

  const answerCurrentQuestion = useCallback((selectedAnswer: string) => {
    setQuiz((current) => {
      if (!current) return current;
      if (current.answers[current.currentIndex]) return current;

      const question = current.questions[current.currentIndex];
      const nextAnswer: SessionAnswer = {
        questionId: question.id,
        word: question.word,
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: selectedAnswer === question.correctAnswer,
      };

      return { ...current, answers: [...current.answers, nextAnswer] };
    });
  }, []);

  const finishLevel = useCallback(() => {
    if (!quiz) return;

    const correctCount = quiz.answers.filter((answer) => answer.isCorrect).length;
    const totalQuestions = quiz.questions.length;
    const sessionPercentage = Math.round((correctCount / totalQuestions) * 100);
    const correctQuestionIds = quiz.answers.filter((a) => a.isCorrect).map((a) => a.questionId);
    const incorrectQuestionIds = quiz.answers.filter((a) => !a.isCorrect).map((a) => a.questionId);
    const nextProgress = recordLevelResult(
      progress,
      quiz.level,
      sessionPercentage,
      correctCount,
      totalQuestions,
      quiz.levelTotalQuestions,
      correctQuestionIds,
      incorrectQuestionIds
    );
    const nextRecord = getResolvedLevelRecord(nextProgress, bankState.entries, quiz.level);
    const progressPercentage = nextRecord?.bestScore ?? 0;
    const masteredCount = nextRecord?.bestCorrectCount ?? 0;
    const unlockTargetCount = getLevelUnlockTargetCount(quiz.levelTotalQuestions);

    setProgress(nextProgress);
    setSummary({
      level: quiz.level,
      answers: quiz.answers,
      correctCount,
      totalQuestions,
      percentage: sessionPercentage,
      progressPercentage,
      masteredCount,
      levelTotalQuestions: quiz.levelTotalQuestions,
      unlockTargetCount,
    });
    setQuiz(null);

    if (activePlayer) {
      void savePlayerProgress(activePlayer, nextProgress).then((result) => {
        if (!result.ok && result.message) setUiMessage(result.message);
      });
    }
  }, [quiz, progress, bankState.entries, activePlayer, setProgress, setUiMessage]);

  const advanceQuiz = useCallback(() => {
    if (!quiz) return;
    if (!quiz.answers[quiz.currentIndex]) return;

    if (quiz.currentIndex === quiz.questions.length - 1) {
      finishLevel();
      return;
    }

    setQuiz((current) => (current ? { ...current, currentIndex: current.currentIndex + 1 } : current));
  }, [quiz, finishLevel]);

  return {
    quiz,
    summary,
    startLevel,
    leaveGame,
    answerCurrentQuestion,
    advanceQuiz,
  };
}
