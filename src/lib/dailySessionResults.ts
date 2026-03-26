import type { DailyGameSession, DailyResult, DailyStoredAnswer } from '../appTypes';

export interface DailySessionMarkerSnapshot {
  dayKey: string;
  startedAt: number;
  totalQuestions: number;
}

export function buildStoredAnswers(session: DailyGameSession): DailyStoredAnswer[] {
  return session.answers.map((answer, index) => {
    const question = session.questions[index];
    const word =
      question.type === 'spelling'
        ? question.displayText
        : question.type === 'orthography'
          ? `Ariketa ${question.exerciseNumber}`
          : question.type === 'synonym'
            ? question.word
            : question.clue;

    return {
      type: answer.questionType,
      word,
      selected: answer.wasSolved ? 'Ebatzita' : answer.selectedAnswer,
      correct: answer.correctAnswer,
      isCorrect: answer.isCorrect,
      wasSolved: answer.wasSolved,
    };
  });
}

export function buildCompletedDailyResult(
  session: DailyGameSession,
  score: number,
  secondsElapsed: number,
  completedAt = new Date().toISOString()
): DailyResult {
  return {
    dayKey: session.dayKey,
    score,
    correctCount: session.answers.filter((answer) => answer.isCorrect).length,
    totalQuestions: session.questions.length,
    secondsElapsed,
    completedAt,
    answers: buildStoredAnswers(session),
  };
}

export function buildAbandonedDailyResult(
  session: DailyGameSession,
  completedAt = new Date().toISOString()
): DailyResult {
  return {
    dayKey: session.dayKey,
    score: 0,
    correctCount: session.answers.filter((answer) => answer.isCorrect).length,
    totalQuestions: session.questions.length,
    secondsElapsed: Math.floor((Date.now() - session.startedAt) / 1000),
    completedAt,
    answers: buildStoredAnswers(session),
  };
}

export function buildRecoveredAbandonedDailyResult(
  marker: DailySessionMarkerSnapshot,
  now = Date.now(),
  completedAt = new Date().toISOString()
): DailyResult {
  return {
    dayKey: marker.dayKey,
    score: 0,
    correctCount: 0,
    totalQuestions: marker.totalQuestions,
    secondsElapsed: Math.max(0, Math.floor((now - marker.startedAt) / 1000)),
    completedAt,
    answers: [],
  };
}
