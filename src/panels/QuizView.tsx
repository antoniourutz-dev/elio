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

  const isAnswered = Boolean(currentAnswer);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="grid w-full h-full gap-3 p-[18px] rounded-[36px] max-w-[600px] mx-auto content-start auto-rows-min"
    >
      <div className="flex items-center gap-3 justify-start">
        <span className="inline-flex items-center justify-center gap-2 min-h-[36px] px-[13px] rounded-full text-[0.82rem] font-black tracking-[-0.02em] bg-gradient-to-br from-[#58c2c0] via-[#7fd3ac] to-[#cfe07e] text-white shadow-[0_4px_14px_rgba(95,200,180,0.2)]">
          {quiz.currentIndex + 1}/{quiz.questions.length}
        </span>
        <SegmentBar total={quiz.questions.length} answers={quiz.answers} currentIndex={quiz.currentIndex} />
      </div>

      <div className="text-[#35b1d4] tracking-[0.18em] font-bold text-[0.76rem] uppercase ml-1">Hitza</div>
      <div className="min-h-[108px] p-5 rounded-[28px] bg-gradient-to-b from-white to-[rgba(248,251,253,0.96)] border border-[rgba(216,226,241,0.75)] grid place-items-center shadow-[0_8px_24px_rgba(107,148,165,0.09),inset_0_1px_0_white]">
        <div className="text-center font-display text-[clamp(2rem,8vw,2.9rem)] font-bold tracking-[-0.05em] text-[#223748]" aria-live="polite" aria-atomic="true">
          {currentQuestion.word}
        </div>
      </div>

      <div className="grid gap-2.5 mt-2" role="group" aria-label="Erantzun aukerak">
        {currentQuestion.options.map((option, index) => {
          const isSelected = currentAnswer?.selectedAnswer === option;
          const isCorrectAtThisOption = currentQuestion.correctAnswer === option;
          const isCorrectAnswered = isAnswered && isCorrectAtThisOption;
          const isWrongAnswered = isAnswered && isSelected && !isCorrectAtThisOption;

          return (
            <button
              key={option}
              ref={index === 0 ? firstOptionRef : undefined}
              type="button"
              className={clsx(
                'flex items-center gap-3 w-full min-h-[60px] px-4 rounded-[20px] border-[1.5px] border-[#e1e5ee] bg-white text-[#223748] text-left transition-all duration-150 cursor-pointer outline-none font-extrabold shadow-[0_4px_14px_rgba(107,148,165,0.04)]',
                !isAnswered && 'hover:-translate-y-[1px] hover:border-[rgba(107,184,217,0.4)] hover:bg-[#f2f8fd] hover:shadow-[0_10px_20px_rgba(107,184,217,0.1)] active:translate-y-0',
                isCorrectAnswered && 'border-[#5fc7a1] border-2 bg-[linear-gradient(180deg,#ebfbf3,#d7f8e8)] shadow-[0_14px_24px_rgba(95,200,160,0.16)] animate-[answer-celebrate_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]',
                isWrongAnswered && 'border-[#e08f82] border-2 bg-[linear-gradient(180deg,#fff4f1,#fdebe6)] shadow-[0_10px_18px_rgba(217,134,122,0.11)]',
                isSelected && !isAnswered && 'border-[#9bdcc1] bg-[#e5f9f0]',
                isAnswered && !isSelected && !isCorrectAtThisOption && 'opacity-55 grayscale-[0.15]',
                isAnswered && 'cursor-default'
              )}
              disabled={isAnswered}
              onClick={() => onAnswer(option)}
            >
              <span
                className={clsx(
                  'shrink-0 w-[30px] h-[30px] rounded-full grid place-items-center text-[0.82rem] font-black transition-colors duration-150',
                  !isAnswered && 'bg-[#edf2f4] text-[#95a1ae]',
                  isCorrectAnswered && 'bg-[#5fc7a1] text-white',
                  isWrongAnswered && 'bg-[#e4998b] text-white'
                )}
              >
                {OPTION_LABELS[index] ?? index + 1}
              </span>
              <span className="flex-1 text-[1rem] tracking-tight leading-[1.3]">{option}</span>
            </button>
          );
        })}
      </div>

      <div className="grid pt-2 sm:pt-4">
        <button
          ref={advanceRef}
          className={clsx(
            'inline-flex items-center justify-center gap-2.5 w-full min-h-[54px] px-[18px] rounded-full font-black text-white transition-all duration-150 cursor-pointer shadow-[0_14px_30px_rgba(100,200,174,0.26)]',
            !isAnswered ? 'opacity-50 cursor-not-allowed bg-[#a0bfc4] shadow-none' : 'bg-gradient-to-r from-[#52bec2] via-[#7ed4ae] to-[#cfe07e] hover:-translate-y-px hover:shadow-[0_16px_34px_rgba(100,200,174,0.32)] active:scale-[0.985]'
          )}
          type="button"
          disabled={!isAnswered}
          onClick={onAdvance}
        >
          <CirclePlay className="w-5 h-5" />
          <span className="text-[1.1rem]">{quizAdvanceLabel}</span>
        </button>
      </div>
    </motion.section>
  );
});
