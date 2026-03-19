import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { CirclePlay } from 'lucide-react';
import { SegmentBar } from '../components/SegmentBar';
import type { ActiveQuiz, SessionAnswer } from '../appTypes';

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

interface QuizViewProps {
  quiz: ActiveQuiz;
  currentQuestion: ActiveQuiz['questions'][number];
  currentAnswer: SessionAnswer | null;
  quizAdvanceLabel: string;
  onAnswer: (answer: string) => void;
  onAdvance: () => void;
}

export const QuizView = memo(function QuizView({ quiz, currentQuestion, currentAnswer, quizAdvanceLabel, onAnswer, onAdvance }: QuizViewProps) {
  const firstOptionRef = useRef<HTMLButtonElement | null>(null);
  const advanceRef = useRef<HTMLButtonElement | null>(null);

  // Focus first option when question changes (new question)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      firstOptionRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [quiz.currentIndex]);

  // Focus advance button when answer is submitted
  useEffect(() => {
    if (!currentAnswer) return;
    const frame = requestAnimationFrame(() => {
      advanceRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [currentAnswer]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="screen-card screen-card-quiz"
    >
      <div className="screen-progress">
        <span className="progress-pill">
          {quiz.currentIndex + 1}/{quiz.questions.length}
        </span>
        <SegmentBar total={quiz.questions.length} answers={quiz.answers} currentIndex={quiz.currentIndex} />
      </div>

      <div className="section-kicker">Hitza</div>
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
                'answer-option-selected': isSelected && !currentAnswer,
                'answer-option-correct': currentAnswer && isCorrect,
                'answer-option-wrong': currentAnswer && isSelected && !isCorrect,
              })}
              disabled={Boolean(currentAnswer)}
              onClick={() => onAnswer(option)}
            >
              <span
                className={clsx('answer-letter', {
                  'answer-letter-correct': currentAnswer && isCorrect,
                  'answer-letter-wrong': currentAnswer && isSelected && !isCorrect,
                })}
              >
                {OPTION_LABELS[index] ?? index + 1}
              </span>
              <span className="answer-text">{option}</span>
            </button>
          );
        })}
      </div>

      <div className="quiz-action-row">
        <button
          ref={advanceRef}
          className="primary-button quiz-next-button"
          type="button"
          disabled={!currentAnswer}
          onClick={onAdvance}
        >
          <CirclePlay className="dock-svg" />
          <span>{quizAdvanceLabel}</span>
        </button>
      </div>
    </motion.section>
  );
});
