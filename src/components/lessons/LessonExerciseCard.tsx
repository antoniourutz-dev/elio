import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import type { LessonExercise } from '../../lib/lessonFlow';
import { HighlightedLessonText, ParticlePill } from './LessonText';

interface LessonExerciseCardProps {
  exercise: LessonExercise;
  selectedOptionId: number | string | null;
  isLocked: boolean;
  revealFeedback?: boolean;
  isAnswerCorrect?: boolean;
  onSelect: (optionId: number | string) => void;
  footer?: ReactNode;
}

export function LessonExerciseCard({
  exercise,
  selectedOptionId,
  isLocked,
  revealFeedback = false,
  isAnswerCorrect = false,
  onSelect,
  footer,
}: LessonExerciseCardProps) {
  return (
    <article className="grid gap-4.5 overflow-hidden rounded-[2rem] border border-[rgba(218,226,232,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,250,0.96))] px-5 py-5 shadow-[0_14px_28px_rgba(107,132,154,0.08)]">
      <header className="grid gap-2.5">
        <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#17897d]">Ariketa</span>
        <div className="rounded-[1.4rem] bg-[rgba(250,252,252,0.92)] px-4 py-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <p className="mx-auto m-0 max-w-[15.5rem] text-center font-display text-[clamp(1.9rem,7.4vw,2.6rem)] leading-[0.9] tracking-[-0.08em] text-[var(--text)] text-balance">
            <HighlightedLessonText text={exercise.promptEu} tone="soft" />
          </p>
          {exercise.instructionEu ? (
            <p className="mt-2.5 m-0 text-center text-[0.84rem] font-semibold leading-relaxed text-[var(--muted)]">
              {exercise.instructionEu}
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid gap-2.5 rounded-[1.45rem] bg-[rgba(248,250,250,0.82)] p-1.5">
        {exercise.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrectOption = option.isCorrect;
          const optionIndex = exercise.options.findIndex((entry) => entry.id === option.id);
          const showCorrectState = revealFeedback && isCorrectOption;
          const showWrongState = revealFeedback && isSelected && !isAnswerCorrect;
          const optionStateClass = showCorrectState
            ? 'border-[rgba(94,198,141,0.72)] bg-[linear-gradient(180deg,rgba(241,252,245,0.99),rgba(233,247,238,0.96))] shadow-[0_8px_18px_rgba(95,184,129,0.08)]'
            : showWrongState
              ? 'border-[rgba(222,129,129,0.62)] bg-[linear-gradient(180deg,rgba(255,248,248,0.99),rgba(251,238,238,0.96))] shadow-[0_8px_18px_rgba(191,118,118,0.07)]'
              : isSelected
                ? 'border-[rgba(88,213,201,0.68)] bg-[linear-gradient(180deg,rgba(236,252,249,0.98),rgba(227,247,243,0.96))] shadow-[0_8px_18px_rgba(74,184,171,0.08)]'
                : 'border-transparent bg-[rgba(255,255,255,0.92)] hover:border-[rgba(177,212,226,0.52)] hover:bg-[rgba(250,252,252,0.96)]';
          const badgeStateClass = showCorrectState
            ? 'bg-[rgba(94,198,141,0.14)] text-[#2f8d60]'
            : showWrongState
              ? 'bg-[rgba(222,129,129,0.14)] text-[#bb5b5b]'
              : isSelected
                ? 'bg-[rgba(88,213,201,0.16)] text-[#17897d]'
                : 'bg-[#eef3f6] text-[var(--muted)]';

          return (
            <button
              key={option.id}
              type="button"
              disabled={isLocked}
              onClick={() => onSelect(option.id)}
              className={`grid min-h-[4rem] w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.3rem] border px-4 py-2.5 text-left transition-all duration-150 ${optionStateClass} ${showCorrectState ? 'motion-safe:animate-[answer-reveal_260ms_ease-out]' : ''} ${isLocked ? 'cursor-not-allowed' : ''}`}
            >
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[0.75rem] font-black ${badgeStateClass}`}>
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span className="text-[1rem] font-black leading-[1.12] tracking-[-0.035em] text-[var(--text)]">
                {option.optionValue === 'la' || option.optionValue === 'nik'
                  ? <ParticlePill value={`-${option.optionValue}`} />
                  : option.optionText}
              </span>
              {revealFeedback ? (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full">
                  {showCorrectState ? <Check className="h-5 w-5 text-[#2f8d60] motion-safe:animate-[success-bounce_260ms_ease-out]" /> : null}
                  {showWrongState ? <X className="h-5 w-5 text-[#bb5b5b]" /> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {footer ? <div className="grid gap-2">{footer}</div> : null}
    </article>
  );
}
