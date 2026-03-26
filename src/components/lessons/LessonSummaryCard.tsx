import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { LessonCard, LessonFlow } from '../../lib/lessonFlow';
import { HighlightedLessonText } from './LessonText';

interface LessonSummaryCardProps {
  lesson: LessonFlow;
  summaryCard: LessonCard | null;
  stats: {
    attempts: number;
    correctCount: number;
    wrongCount: number;
  };
  isAlreadyCompleted: boolean;
  nextStopLabel?: string | null;
  onPrimaryAction?: (() => void) | null;
  primaryLabel?: string;
  onSecondaryAction?: (() => void) | null;
  secondaryLabel?: string;
}

function renderSummaryBody(body: string) {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [, left = '', right = ''] = line.match(/^(.+?)\s*(?:→|->)\s*(.+)$/) ?? [];
      if (!right) {
        return (
          <p key={`${line}-${index}`} className="m-0 text-[1rem] font-semibold leading-relaxed text-[var(--text)]">
            <HighlightedLessonText text={line} tone="strong" />
          </p>
        );
      }

      return (
        <div key={`${line}-${index}`} className="flex items-center gap-2 text-[0.98rem] font-semibold">
          <span className="text-[var(--text)]">
            <HighlightedLessonText text={left.trim()} tone="strong" />
          </span>
          <span className="text-[var(--muted)]">→</span>
          <span className="text-[var(--text)]">
            <HighlightedLessonText text={right.trim()} tone="strong" />
          </span>
        </div>
      );
    });
}

export function LessonSummaryCard({
  lesson,
  summaryCard,
  stats,
  isAlreadyCompleted,
  nextStopLabel = null,
  onPrimaryAction = null,
  primaryLabel,
  onSecondaryAction = null,
  secondaryLabel,
}: LessonSummaryCardProps) {
  const totalAnswers = Math.max(0, stats.correctCount + stats.wrongCount);
  const correctRate = totalAnswers > 0 ? Math.round((stats.correctCount / totalAnswers) * 100) : 0;
  const highlightExamples = lesson.examples.slice(0, 2);
  const emotionalTitle =
    correctRate >= 100 ? 'Primeran!' : correctRate >= 75 ? 'Ondo egin duzu!' : isAlreadyCompleted ? 'Berriz ere ondo.' : 'Aurrera zoaz!';
  const emotionalText =
    correctRate >= 100
      ? 'Garbi iritsi zara amaierara. Hurrengoa egiteko moduan zaude.'
      : correctRate >= 75
        ? 'Oinarri ona daukazu. Beste bat egiteak sendotu egingo zaitu.'
        : isAlreadyCompleted
          ? 'Berrikuspen honek ere balio du. Segi erritmoa hartzen.'
          : 'Ikasgaia argiago daukazu orain. Beste saio labur batekin gehiago finkatuko duzu.';
  const statsLine = `${stats.correctCount} zuzen · ${stats.attempts} saiakera · ${correctRate}% asmatuta`;

  return (
    <article className="grid gap-5 overflow-hidden rounded-[2rem] border border-[rgba(218,226,232,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,250,0.96))] px-5 py-5 shadow-[0_14px_28px_rgba(107,132,154,0.08)]">
      <header className="grid gap-3">
        <div className="grid gap-1">
          <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#17897d]">
            {summaryCard?.titleEu || 'Amaiera'}
          </span>
          <h2 className="m-0 font-display text-[clamp(2.1rem,8vw,2.7rem)] leading-[0.94] tracking-[-0.07em] text-[var(--text)]">
            {emotionalTitle}
          </h2>
          <p className="m-0 text-[0.98rem] font-medium leading-relaxed text-[var(--muted)]">
            {emotionalText}
          </p>
        </div>
        <div className="inline-flex w-fit items-center rounded-full bg-[rgba(246,250,250,0.92)] px-3.5 py-1.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          {statsLine}
        </div>
      </header>

      {summaryCard?.bodyEu ? (
        <section className="grid gap-3 rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(252,253,253,0.88),rgba(247,250,250,0.84))] px-4 py-4">
          {renderSummaryBody(summaryCard.bodyEu)}
        </section>
      ) : null}

      {highlightExamples.length > 0 ? (
        <section className="grid gap-2 rounded-[1.35rem] bg-[rgba(248,250,250,0.72)] px-3.5 py-3.5">
          <span className="text-[0.66rem] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">Adibide azkarrak</span>
          <div className="grid gap-2">
            {highlightExamples.map((example) => (
              <div key={example.id} className="rounded-[1.05rem] bg-white/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
                <p className="m-0 text-[0.94rem] font-semibold leading-[1.5] tracking-[-0.02em] text-[var(--text)]">
                  <HighlightedLessonText text={example.sentenceEu} />
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {nextStopLabel ? (
        <button
          type="button"
          onClick={onPrimaryAction ?? undefined}
          disabled={!onPrimaryAction}
          className="grid gap-1.5 rounded-[1.25rem] border border-[rgba(196,228,220,0.72)] bg-[linear-gradient(180deg,rgba(242,251,248,0.98),rgba(234,247,241,0.94))] px-4 py-3.5 text-left shadow-[0_12px_24px_rgba(84,170,147,0.08)] transition-transform duration-150 hover:-translate-y-[1px] disabled:cursor-default disabled:opacity-80"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.64rem] font-extrabold uppercase tracking-[0.16em] text-[#17897d]">Hurrengo geltokia</span>
            {onPrimaryAction ? <ChevronRight className="h-4 w-4 text-[#17897d]" /> : null}
          </div>
          <p className="m-0 font-display text-[1.45rem] leading-none tracking-[-0.055em] text-[var(--text)]">
            {nextStopLabel}
          </p>
          <span className="text-[0.78rem] font-bold text-[var(--muted)]">
            Jarraitu bidea hurrengo herrira
          </span>
        </button>
      ) : null}

      <div className="grid gap-2">
        {onPrimaryAction && !nextStopLabel ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#0b6f69,#0c847b)] px-6 text-[0.98rem] font-black text-white shadow-[0_14px_26px_rgba(12,132,123,0.2)]"
          >
            {primaryLabel || (isAlreadyCompleted ? 'Berrikusi eginda' : 'Ikasgaia ulertuta')}
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
        {onSecondaryAction ? (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="inline-flex min-h-[2.8rem] w-full items-center justify-center rounded-full border border-[rgba(220,228,235,0.86)] bg-white px-5 text-[0.92rem] font-black text-[var(--text)]"
          >
            {secondaryLabel || 'Berriro egin'}
          </button>
        ) : null}
      </div>
    </article>
  );
}
