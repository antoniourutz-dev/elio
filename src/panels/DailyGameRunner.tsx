import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { CheckCircle2, CirclePlay, XCircle } from 'lucide-react';
import { SegmentBar } from '../components/SegmentBar';
import type { DailyGameSession, DailyAnswer } from '../appTypes';

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
const SPELLING_OPTIONS = ['ZUZEN', 'OKERRA'] as const;

interface DailyGameRunnerProps {
  session: DailyGameSession;
  elapsedSeconds: number;
  onAnswer: (answer: string) => void;
  onAdvance: () => void;
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

export const DailyGameRunner = memo(function DailyGameRunner({
  session,
  elapsedSeconds,
  onAnswer,
  onAdvance,
}: DailyGameRunnerProps) {
  const currentQuestion = session.questions[session.currentIndex];
  const currentAnswer: DailyAnswer | undefined = session.answers[session.currentIndex];
  const isAnswered = Boolean(currentAnswer);
  const isLastQuestion = session.currentIndex === session.questions.length - 1;
  const advanceLabel = isLastQuestion ? 'Amaitu' : 'Hurrengoa';

  const firstOptionRef = useRef<HTMLButtonElement | null>(null);
  const advanceRef = useRef<HTMLButtonElement | null>(null);

  // Focus first option on new question
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      firstOptionRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [session.currentIndex]);

  // Focus advance button after answer
  useEffect(() => {
    if (!isAnswered) return;
    const frame = requestAnimationFrame(() => {
      advanceRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isAnswered]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="screen-card screen-card-quiz"
    >
      <div className="screen-progress">
        <span className="progress-pill">
          {session.currentIndex + 1}/{session.questions.length}
        </span>
        <SegmentBar
          total={session.questions.length}
          answers={session.answers.map((a) => ({
            questionId: a.questionId,
            word: '',
            selectedAnswer: a.selectedAnswer,
            correctAnswer: a.correctAnswer,
            isCorrect: a.isCorrect,
          }))}
          currentIndex={session.currentIndex}
        />
        <span className={clsx('daily-timer', {
          'daily-timer-warn': elapsedSeconds >= 30 && elapsedSeconds < 60,
          'daily-timer-hot':  elapsedSeconds >= 60,
        })}>{formatSeconds(elapsedSeconds)}</span>
      </div>

      {currentQuestion.type === 'spelling' ? (
        <>
          <div className="section-kicker">Ortografia</div>
          <div className="word-card">
            <div className="question-word" aria-live="polite" aria-atomic="true">
              {currentQuestion.displayText}
            </div>
            <p className="spelling-hint">Zuzena ala okerra?</p>
          </div>

          <div className="options-stack spelling-options" role="group" aria-label="Erantzun aukerak">
            {SPELLING_OPTIONS.map((option, index) => {
              const isSelected = currentAnswer?.selectedAnswer === option;
              const isCorrect = currentQuestion.correctAnswer === option;

              return (
                <button
                  key={option}
                  ref={index === 0 ? firstOptionRef : undefined}
                  type="button"
                  className={clsx('answer-option', 'spelling-option', `spelling-option-${option.toLowerCase()}`, {
                    'answer-option-correct': isAnswered && isCorrect,
                    'answer-option-wrong': isAnswered && isSelected && !isCorrect,
                  })}
                  disabled={isAnswered}
                  onClick={() => onAnswer(option)}
                >
                  {option === 'ZUZEN'
                    ? <CheckCircle2 className="spelling-result-icon" />
                    : <XCircle className="spelling-result-icon" />}
                  <span className="spelling-option-text">{option}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="section-kicker">Sinonimoa</div>
          <div className="word-card">
            <div className="question-word" aria-live="polite" aria-atomic="true">
              {currentQuestion.word}
            </div>
          </div>

          <div className="options-stack" role="group" aria-label="Erantzun aukerak">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentAnswer?.selectedAnswer === option;
              const isCorrect = currentQuestion.correctAnswer === option;

              return (
                <button
                  key={option}
                  ref={index === 0 ? firstOptionRef : undefined}
                  type="button"
                  className={clsx('answer-option', {
                    'answer-option-correct': isAnswered && isCorrect,
                    'answer-option-wrong': isAnswered && isSelected && !isCorrect,
                  })}
                  disabled={isAnswered}
                  onClick={() => onAnswer(option)}
                >
                  <span
                    className={clsx('answer-letter', {
                      'answer-letter-correct': isAnswered && isCorrect,
                      'answer-letter-wrong': isAnswered && isSelected && !isCorrect,
                    })}
                  >
                    {OPTION_LABELS[index] ?? index + 1}
                  </span>
                  <span className="answer-text">{option}</span>
                </button>
              );
            })}
          </div>
        </>
      )}


      <div className="quiz-action-row">
        <button
          ref={advanceRef}
          className="primary-button quiz-next-button"
          type="button"
          disabled={!isAnswered}
          onClick={onAdvance}
        >
          <CirclePlay className="dock-svg" />
          <span>{advanceLabel}</span>
        </button>
      </div>
    </motion.section>
  );
});
