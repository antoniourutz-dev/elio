import { ChevronRight } from 'lucide-react';
import type { LessonCard, LessonFlow } from '../../lib/lessonFlow';
import { HighlightedLessonText } from './LessonText';

interface LessonIntroCardProps {
  lesson: LessonFlow;
  hookCard: LessonCard | null;
  onStart: () => void;
}

function renderContrastBody(body: string) {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="grid gap-2.5">
      {lines.map((line, index) => (
        <div
          key={`${line}-${index}`}
          className="rounded-[1.35rem] bg-[rgba(255,255,255,0.72)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.66)]"
        >
          <p className="m-0 text-[1.02rem] font-semibold leading-[1.48] tracking-[-0.03em] text-[var(--text)]">
            <HighlightedLessonText text={line} />
          </p>
        </div>
      ))}
    </div>
  );
}

export function LessonIntroCard({ lesson, hookCard, onStart }: LessonIntroCardProps) {
  const translationHints = Array.isArray(hookCard?.extraData.translation_hints)
    ? (hookCard?.extraData.translation_hints as Array<Record<string, unknown>>)
    : [];
  const microQuestion =
    (typeof hookCard?.extraData.micro_question_eu === 'string' && hookCard.extraData.micro_question_eu.trim()) ||
    (hookCard?.displayMode === 'contrast' ? 'Zein da aldea?' : 'Zer nabaritzen duzu?');

  return (
    <article className="flex flex-1 flex-col gap-5 overflow-hidden rounded-[2rem] border border-[rgba(218,226,232,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.995),rgba(248,250,250,0.97))] px-5 py-5 shadow-[0_14px_28px_rgba(107,132,154,0.08)]">
      <div className="flex flex-1 flex-col gap-5">
        <header className="grid gap-1.5">
          <h2 className="m-0 font-display text-[clamp(2rem,8vw,2.85rem)] leading-[0.92] tracking-[-0.07em] text-[var(--text)]">
            {lesson.titleEu}
          </h2>
          {lesson.subtitleEu ? (
            <p className="m-0 text-[0.95rem] font-medium leading-relaxed text-[var(--muted)]">{lesson.subtitleEu}</p>
          ) : null}
        </header>

        {hookCard?.bodyEu ? (
          <section className="grid gap-3">
            {hookCard.displayMode === 'contrast' ? (
              renderContrastBody(hookCard.bodyEu)
            ) : (
              <div className="rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(239,251,248,0.86),rgba(232,247,241,0.82))] px-4 py-4">
                <p className="m-0 text-[1rem] font-semibold leading-[1.5] tracking-[-0.03em] text-[var(--text)]">
                  <HighlightedLessonText text={hookCard.bodyEu} />
                </p>
              </div>
            )}
          </section>
        ) : null}

        {translationHints.length > 0 ? (
          <section className="grid gap-1 rounded-[1.1rem] bg-[rgba(248,250,251,0.62)] px-4 py-3">
            {translationHints.map((hint, index) => (
              <div key={index} className="flex items-baseline gap-2 py-[0.18rem] text-[0.82rem] font-semibold">
                <span className="text-[var(--text)]">{String(hint.eu ?? '')}</span>
                <span className="text-[var(--muted)]">→</span>
                <span className="text-[var(--muted)]">{String(hint.es ?? '')}</span>
              </div>
            ))}
          </section>
        ) : null}

        <section className="grid gap-2 rounded-[1.35rem] bg-[linear-gradient(135deg,rgba(236,250,247,0.94),rgba(228,246,241,0.84))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[#0e9284]">Galdera txikia</span>
          <p className="m-0 font-display text-[1.42rem] leading-none tracking-[-0.05em] text-[var(--text)]">
            {microQuestion}
          </p>
        </section>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="inline-flex min-h-[3.1rem] w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#0b6f69,#0c847b)] px-6 text-[1rem] font-black text-white shadow-[0_14px_26px_rgba(12,132,123,0.22)] transition-transform duration-150 hover:-translate-y-[1px]"
      >
        {hookCard?.ctaLabelEu || 'Saiatu'}
        <ChevronRight className="h-4 w-4" />
      </button>
    </article>
  );
}
