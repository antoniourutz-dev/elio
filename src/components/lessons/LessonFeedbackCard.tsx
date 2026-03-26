import { CheckCircle2, RotateCcw, Sparkles, XCircle } from 'lucide-react';

interface LessonFeedbackCardProps {
  isCorrect: boolean;
  title: string;
  message: string;
  helperText?: string | null;
  onContinue: () => void;
  compact?: boolean;
  embedded?: boolean;
}

export function LessonFeedbackCard({
  isCorrect,
  title,
  message,
  helperText,
  onContinue,
  compact = false,
  embedded = false,
}: LessonFeedbackCardProps) {
  return (
    <article
      className={`grid overflow-hidden ${
        compact ? 'gap-4 rounded-[1.6rem] px-4 py-4' : 'gap-5 rounded-[2rem] px-5 py-5'
      } ${
        isCorrect
          ? embedded
            ? 'border-0 bg-[linear-gradient(180deg,rgba(246,253,247,0.74),rgba(240,249,242,0.68))] shadow-none'
            : 'border border-[rgba(140,215,173,0.34)] bg-[linear-gradient(180deg,rgba(246,253,247,0.99),rgba(240,249,242,0.96))] shadow-[0_14px_28px_rgba(107,132,154,0.08)]'
          : embedded
            ? 'border-0 bg-[linear-gradient(180deg,rgba(255,251,250,0.74),rgba(250,245,244,0.68))] shadow-none'
            : 'border border-[rgba(226,198,190,0.3)] bg-[linear-gradient(180deg,rgba(255,251,250,0.99),rgba(249,244,242,0.96))] shadow-[0_14px_28px_rgba(107,132,154,0.08)]'
      }`}
    >
      <div className="grid gap-3">
        <span className={`inline-flex items-center justify-center rounded-[1rem] border bg-white/84 ${compact ? 'h-10 w-10' : 'h-13 w-13'} ${isCorrect ? 'border-[rgba(94,198,141,0.3)] motion-safe:animate-[success-bounce_320ms_ease-out]' : 'border-[rgba(208,159,146,0.24)]'}`}>
          {isCorrect ? (
            <CheckCircle2 className={`text-[#36956b] ${compact ? 'h-[1.5rem] w-[1.5rem]' : 'h-[1.8rem] w-[1.8rem]'}`} />
          ) : (
            <XCircle className={`text-[#ba6f62] ${compact ? 'h-[1.25rem] w-[1.25rem]' : 'h-[1.5rem] w-[1.5rem]'}`} />
          )}
        </span>
        <div className="grid gap-2">
          <h3 className={`m-0 font-display leading-[0.94] tracking-[-0.06em] text-[var(--text)] ${compact ? 'text-[1.28rem]' : 'text-[1.55rem]'}`}>
            {title}
          </h3>
          <p className={`m-0 font-semibold leading-relaxed text-[var(--text)] ${compact ? 'text-[0.93rem]' : 'text-[1rem]'}`}>{message}</p>
        </div>
      </div>

      {helperText ? (
        <div className={`grid gap-2 border-l-[3px] border-[rgba(201,167,143,0.34)] bg-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${compact ? 'rounded-[1.05rem] px-3.5 py-3' : 'rounded-[1.25rem] px-4 py-4'}`}>
          <span className="inline-flex items-center gap-2 text-[0.66rem] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">
            <Sparkles className="h-[0.82rem] w-[0.82rem]" />
            Pista gehiago
          </span>
          <p className="m-0 text-[0.92rem] font-semibold leading-relaxed text-[var(--text)]">{helperText}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onContinue}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-6 font-black text-white shadow-[0_14px_26px_rgba(12,132,123,0.18)] ${
          compact ? 'min-h-[2.85rem] text-[0.94rem]' : 'min-h-[3rem] text-[0.98rem]'
        } ${
          isCorrect
            ? 'bg-[linear-gradient(180deg,#0b6f69,#0c847b)]'
            : 'bg-[linear-gradient(180deg,#b8786b,#c7887c)]'
        }`}
      >
        {isCorrect ? 'Jarraitu' : 'Saiatu berriro'}
        {!isCorrect ? <RotateCcw className="h-4 w-4" /> : null}
      </button>
    </article>
  );
}
