import { memo } from 'react';
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
  const isAnswered = Boolean(currentAnswer);

  return (
    <section className="grid w-full h-full max-w-[600px] mx-auto content-start auto-rows-min gap-3 rounded-[36px] p-[18px] animate-[fade-up_220ms_ease-out]">
      <div className="flex items-center justify-start">
        <SegmentBar total={quiz.questions.length} answers={quiz.answers} currentIndex={quiz.currentIndex} />
      </div>

      <div className="min-h-[108px] p-5 rounded-[28px] bg-gradient-to-b from-white to-[rgba(248,251,253,0.96)] border border-[rgba(216,226,241,0.75)] grid place-items-center shadow-[0_8px_24px_rgba(107,148,165,0.09),inset_0_1px_0_white]">
        <div className="text-center font-display text-[clamp(2rem,8vw,2.9rem)] font-bold tracking-[-0.05em] text-[var(--text)]" aria-live="polite" aria-atomic="true">
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
              type="button"
              autoFocus={index === 0 && !isAnswered}
              className={clsx(
                'flex items-center gap-3 w-full min-h-[60px] px-4 rounded-[20px] border-[1.5px] border-[#e1e5ee] bg-white text-[var(--text)] text-left transition-all duration-150 cursor-pointer outline-none font-extrabold shadow-[0_4px_14px_rgba(107,148,165,0.04)]',
                !isAnswered && 'hover:-translate-y-[1px] hover:border-[rgba(107,184,217,0.4)] hover:bg-[#f2f8fd] hover:shadow-[0_10px_20px_rgba(107,184,217,0.1)] active:translate-y-0',
                isCorrectAnswered &&
                  'border-[#37b788] border-2 bg-[linear-gradient(180deg,#dffaf0,#bff0d7)] text-[#173a33] shadow-[0_16px_30px_rgba(55,183,136,0.24)] ring-1 ring-[rgba(55,183,136,0.22)] animate-[answer-celebrate_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]',
                isWrongAnswered && 'border-[#db7768] border-2 bg-[linear-gradient(180deg,#fff0ec,#f9d8d0)] text-[#5b241d] shadow-[0_12px_24px_rgba(217,134,122,0.16)]',
                isSelected && !isAnswered && 'border-[#55c59b] bg-[linear-gradient(180deg,#e2fbf0,#c8f3dd)] text-[#173a33] shadow-[0_12px_24px_rgba(85,197,155,0.18)]',
                isAnswered && !isSelected && !isCorrectAtThisOption && 'opacity-55 grayscale-[0.15]',
                isAnswered && 'cursor-default'
              )}
              disabled={isAnswered}
              onClick={() => onAnswer(option)}
            >
              <span
                className={clsx(
                  'shrink-0 w-[30px] h-[30px] rounded-full grid place-items-center text-[0.82rem] font-black transition-colors duration-150',
                  !isAnswered && 'bg-[#edf2f4] text-[var(--muted)]',
                  isCorrectAnswered && 'bg-[#2fb483] text-white',
                  isWrongAnswered && 'bg-[#dd7f70] text-white',
                  isSelected && !isAnswered && 'bg-[#43bf90] text-white'
                )}
              >
                {OPTION_LABELS[index] ?? index + 1}
              </span>
              <span className="flex-1 text-[1.05rem] font-black tracking-[-0.02em] leading-[1.25]">{option}</span>
            </button>
          );
        })}
      </div>

      <div className="grid pt-2 sm:pt-4">
        <button
          className={clsx(
            'inline-flex items-center justify-center gap-2.5 w-full min-h-[54px] px-[18px] rounded-full font-black text-white transition-all duration-150 cursor-pointer shadow-[0_14px_30px_rgba(100,200,174,0.26)]',
            !isAnswered ? 'opacity-50 cursor-not-allowed bg-[#a0bfc4] shadow-none' : 'bg-gradient-to-r from-[#52bec2] via-[#7ed4ae] to-[#cfe07e] hover:-translate-y-px hover:shadow-[0_16px_34px_rgba(100,200,174,0.32)] active:scale-[0.985]'
          )}
          type="button"
          autoFocus={isAnswered}
          disabled={!isAnswered}
          onClick={onAdvance}
        >
          <CirclePlay className="w-5 h-5" />
          <span className="text-[1.1rem]">{quizAdvanceLabel}</span>
        </button>
      </div>
    </section>
  );
});
