import { memo } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, BookOpenText, CheckCircle2, ChevronRight, Lightbulb, Sparkles } from 'lucide-react';
import { useLesson } from '../hooks/useLesson';
import { usePublishedLessons } from '../hooks/usePublishedLessons';
import type { LessonBlock, LessonBlockType } from '../lib/lessons';

interface GrammarLessonViewProps {
  lessonSlug: string | null;
  completedStops: number;
  onCompleteStop: () => void;
}

const PARTICLE_STYLES: Record<
  string,
  {
    strongClassName: string;
    subtleClassName: string;
    arrowClassName: string;
  }
> = {
  '-la': {
    strongClassName:
      'inline-flex items-center rounded-full border border-[rgba(144,195,138,0.32)] bg-[linear-gradient(180deg,rgba(245,252,236,0.98),rgba(234,246,223,0.96))] px-2.5 py-1 font-black tracking-[-0.02em] text-[#4e8650] shadow-[0_4px_10px_rgba(131,176,121,0.08)]',
    subtleClassName: 'rounded-[0.45rem] bg-[rgba(192,225,183,0.22)] px-[0.28rem] py-[0.02rem] font-bold text-[#5b8d5d]',
    arrowClassName: 'text-[#6d9b6a]',
  },
  '-nik': {
    strongClassName:
      'inline-flex items-center rounded-full border border-[rgba(227,148,148,0.3)] bg-[linear-gradient(180deg,rgba(255,244,244,0.98),rgba(252,232,232,0.96))] px-2.5 py-1 font-black tracking-[-0.02em] text-[#b55353] shadow-[0_4px_10px_rgba(203,126,126,0.08)]',
    subtleClassName: 'rounded-[0.45rem] bg-[rgba(244,199,199,0.22)] px-[0.28rem] py-[0.02rem] font-bold text-[#b66363]',
    arrowClassName: 'text-[#bc7070]',
  },
};

function getParticleStyle(particle: string) {
  return PARTICLE_STYLES[particle.toLowerCase()] ?? {
    strongClassName:
      'inline-flex items-center rounded-full border border-[rgba(124,169,226,0.26)] bg-[linear-gradient(180deg,rgba(242,248,255,0.96),rgba(233,242,254,0.94))] px-2 py-[0.12rem] font-black tracking-[-0.02em] text-[#2f5f9d] shadow-[0_4px_10px_rgba(116,151,204,0.08)]',
    subtleClassName: 'rounded-[0.45rem] bg-[rgba(176,208,235,0.18)] px-[0.28rem] py-[0.02rem] font-bold text-[#5479a8]',
    arrowClassName: 'text-[#6f8eb3]',
  };
}

function renderParticleBadge(particle: string, variant: 'strong' | 'subtle' = 'strong') {
  const style = getParticleStyle(particle);
  return <span className={variant === 'strong' ? style.strongClassName : style.subtleClassName}>{particle}</span>;
}

const BLOCK_STYLES: Record<
  LessonBlockType,
  {
    label: string;
    icon: typeof BookOpenText;
    accentClassName: string;
    iconClassName: string;
    bodyClassName: string;
  }
> = {
  definition: {
    label: 'Definizioa',
    icon: BookOpenText,
    accentClassName: 'bg-[linear-gradient(180deg,#68d5cb,#a9e5c8)]',
    iconClassName: 'border-[rgba(112,208,193,0.28)] bg-[rgba(255,255,255,0.86)] text-[#1a9183]',
    bodyClassName: 'text-[var(--text)]',
  },
  rule: {
    label: 'Arau',
    icon: Sparkles,
    accentClassName: 'bg-[linear-gradient(180deg,#8dc1f0,#b6d2f7)]',
    iconClassName: 'border-[rgba(124,169,226,0.28)] bg-[rgba(255,255,255,0.86)] text-[#4f82bd]',
    bodyClassName: 'text-[var(--text)]',
  },
  example: {
    label: 'Adibidea',
    icon: ChevronRight,
    accentClassName: 'bg-[linear-gradient(180deg,#f1d476,#f4e1a5)]',
    iconClassName: 'border-[rgba(239,198,91,0.26)] bg-[rgba(255,255,255,0.86)] text-[#b27b16]',
    bodyClassName: 'italic text-[var(--text-2)]',
  },
  tip: {
    label: 'Oharra',
    icon: Lightbulb,
    accentClassName: 'bg-[linear-gradient(180deg,#b7df85,#d6edb1)]',
    iconClassName: 'border-[rgba(165,206,113,0.28)] bg-[rgba(255,255,255,0.86)] text-[#6c9851]',
    bodyClassName: 'text-[var(--text)]',
  },
};

function renderRuleLine(line: string): ReactNode {
  const parts = line.split(/\s*(?:→|->)\s*/);
  if (parts.length < 2) {
    return <>{line}</>;
  }

  const left = parts[0]?.trim() ?? '';
  const right = parts.slice(1).join(' → ').trim();
  const particleStyle = getParticleStyle(right);

  return (
    <span className="flex flex-wrap items-center gap-2">
      {left ? <span>{left}</span> : null}
      <span className={particleStyle.arrowClassName}>→</span>
      <span className={particleStyle.strongClassName}>
        {right}
      </span>
    </span>
  );
}

function renderInlineParticles(text: string, variant: 'default' | 'subtle' = 'default'): ReactNode {
  const matches = Array.from(text.matchAll(/(^|[\s([{'"«])(-[A-Za-zÀ-ÿ]+)/g));
  if (matches.length === 0) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    const fullMatch = match[0] ?? '';
    const prefix = match[1] ?? '';
    const particle = match[2] ?? '';
    const start = match.index ?? 0;
    const prefixOffset = fullMatch.length - particle.length;
    const particleStart = start + prefixOffset;

    if (particleStart > cursor) {
      nodes.push(text.slice(cursor, particleStart));
    }

    nodes.push(
      <span
        key={`particle-${particleStart}-${index}`}
        className={variant === 'subtle' ? getParticleStyle(particle).subtleClassName : getParticleStyle(particle).strongClassName}
      >
        {particle}
      </span>
    );

    cursor = particleStart + particle.length;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function renderExampleLine(text: string): ReactNode {
  const suffixRegex = /\b([A-Za-zÀ-ÿ]+?)(la|nik)\b/g;
  const matches = Array.from(text.matchAll(suffixRegex));

  if (matches.length === 0) {
    return renderInlineParticles(text, 'subtle');
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    const fullWord = match[0] ?? '';
    const stem = match[1] ?? '';
    const suffix = match[2] ?? '';
    const start = match.index ?? 0;

    if (start > cursor) {
      nodes.push(renderInlineParticles(text.slice(cursor, start), 'subtle'));
    }

    nodes.push(
      <span key={`example-word-${start}-${index}`}>
        {stem}
        <span className={getParticleStyle(`-${suffix}`).subtleClassName}>
          {suffix}
        </span>
      </span>
    );

    cursor = start + fullWord.length;
  });

  if (cursor < text.length) {
    nodes.push(renderInlineParticles(text.slice(cursor), 'subtle'));
  }

  return nodes;
}

function groupLessonBlocks(blocks: LessonBlock[]): LessonBlock[][] {
  return blocks.reduce<LessonBlock[][]>((groups, block) => {
    const lastGroup = groups.at(-1);
    if (!lastGroup || lastGroup[0]?.blockType !== block.blockType) {
      groups.push([block]);
      return groups;
    }

    lastGroup.push(block);
    return groups;
  }, []);
}

function LessonBlockGroup({ blocks }: { blocks: LessonBlock[] }) {
  const blockType = blocks[0]?.blockType ?? 'definition';
  const Icon = BLOCK_STYLES[blockType].icon;
  const style = BLOCK_STYLES[blockType];

  return (
    <article className="relative overflow-hidden px-4 py-4">
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${style.accentClassName}`} aria-hidden="true" />
      <div className="flex items-start gap-3 pl-1">
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ${style.iconClassName}`}>
          <Icon className="h-[1rem] w-[1rem]" />
        </span>
        <div className="min-w-0 grid gap-1">
          <span className="text-[0.63rem] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">{style.label}</span>
          <div className="grid gap-2.5">
            {blocks.map((block, blockIndex) => (
              <div key={block.id} className="grid gap-1.5">
                {block.content.split('\n').filter(Boolean).map((line, index) => (
                  <p key={`${block.id}-${index}`} className={`m-0 text-[0.92rem] font-semibold leading-[1.5] ${style.bodyClassName}`}>
                    {block.blockType === 'rule'
                      ? renderRuleLine(line)
                      : block.blockType === 'example'
                        ? renderExampleLine(line)
                        : renderInlineParticles(line)}
                  </p>
                ))}
                {blockIndex < blocks.length - 1 ? (
                  <div className="h-px bg-[linear-gradient(90deg,rgba(224,232,238,0.12),rgba(224,232,238,0.82),rgba(224,232,238,0.12))]" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function LessonContrastBlock() {
  return (
    <section className="px-4 py-4">
      <div className="grid gap-3 rounded-[22px] border border-[rgba(220,228,235,0.72)] bg-[linear-gradient(180deg,rgba(251,252,252,0.98),rgba(246,249,249,0.96))] px-4 py-4">
        <span className="text-[0.63rem] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">Kontrastea</span>
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            {renderParticleBadge('-la')}
            <span className="text-[0.92rem] font-semibold text-[var(--text)]">ziurtasuna</span>
          </div>
          <div className="flex items-center gap-3">
            {renderParticleBadge('-nik')}
            <span className="text-[0.92rem] font-semibold text-[var(--text)]">zalantza</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function LessonCorrectionBlock() {
  return (
    <section className="px-4 py-4">
      <div className="grid gap-3 rounded-[22px] border border-[rgba(220,228,235,0.72)] bg-[linear-gradient(180deg,rgba(251,252,252,0.98),rgba(246,249,249,0.96))] px-4 py-4">
        <span className="text-[0.63rem] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">Zuzenketa</span>
        <div className="grid gap-2.5">
          <div className="flex items-start gap-3">
            <span className="pt-[0.12rem] text-[1rem]">❌</span>
            <p className="m-0 text-[0.94rem] font-semibold italic leading-[1.55] text-[var(--text-2)]">
              Ez dut uste etorriko naize
              <span className={getParticleStyle('-la').subtleClassName}>la</span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="pt-[0.12rem] text-[1rem]">✅</span>
            <p className="m-0 text-[0.94rem] font-semibold italic leading-[1.55] text-[var(--text-2)]">
              Ez dut uste etorriko naize
              <span className={getParticleStyle('-nik').subtleClassName}>nik</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export const GrammarLessonView = memo(function GrammarLessonView({
  lessonSlug,
  completedStops,
  onCompleteStop,
}: GrammarLessonViewProps) {
  const { lesson, isLoading, message, refresh } = useLesson(lessonSlug, true);
  const { lessons } = usePublishedLessons(10, true);
  const shouldShowCertaintyContrast = lesson?.blocks.some((block) => /-(la|nik)\b/i.test(block.content)) ?? false;
  const groupedBlocks = lesson ? groupLessonBlocks(lesson.blocks) : [];
  const lessonIndex = lesson ? lessons.findIndex((entry) => entry.slug === lesson.slug) : -1;
  const isCurrentActiveLesson = lessonIndex >= 0 && lessonIndex === completedStops;
  const isAlreadyCompleted = lessonIndex >= 0 && lessonIndex < completedStops;

  return (
    <section className="grid">
      {isLoading ? (
        <div className="grid gap-0 overflow-hidden rounded-[34px] border border-[rgba(216,224,231,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,249,0.95))] shadow-[var(--shadow-card)] animate-pulse">
          <div className="grid gap-2 px-5 py-5">
            <div className="h-3 w-20 rounded-full bg-slate-200/80" />
            <div className="h-10 w-44 rounded-[18px] bg-slate-100/90" />
            <div className="h-4 w-56 rounded-full bg-slate-200/80" />
          </div>
          <div className="h-px bg-[rgba(224,232,238,0.9)]" />
          <div className="h-24 bg-slate-100/70" />
          <div className="h-px bg-[rgba(224,232,238,0.9)]" />
          <div className="h-24 bg-slate-100/70" />
          <div className="h-px bg-[rgba(224,232,238,0.9)]" />
          <div className="h-24 bg-slate-100/70" />
        </div>
      ) : lesson ? (
        <article className="overflow-hidden rounded-[34px] border border-[rgba(216,224,231,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(247,249,249,0.96))] shadow-[var(--shadow-card)]">
          <header className="relative overflow-hidden px-5 py-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#62d7ce,#b8e284)]" aria-hidden="true" />
            <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(187,229,144,0.18),transparent_66%)] blur-2xl" aria-hidden="true" />
            <div className="relative grid gap-2">
              <span className="text-[0.66rem] font-extrabold uppercase tracking-[0.18em] text-[#17897d]">
                {lesson.level || lesson.section || 'Gramatika'}
              </span>
              <h2 className="m-0 font-display text-[clamp(1.9rem,5vw,2.5rem)] leading-[0.92] tracking-[-0.06em] text-[var(--text)]">
                {lesson.title}
              </h2>
              {lesson.topic ? (
                <p className="m-0 max-w-[28rem] text-[0.92rem] font-medium leading-relaxed text-[var(--muted)]">
                  {lesson.topic}
                </p>
              ) : null}
            </div>
          </header>

          <div className="h-px bg-[linear-gradient(90deg,rgba(219,228,234,0.25),rgba(219,228,234,0.95),rgba(219,228,234,0.25))]" />

          <div className="grid">
            {groupedBlocks.map((group, index) => (
              <div key={`${group[0]?.id ?? index}`}>
                <LessonBlockGroup blocks={group} />
                {index < groupedBlocks.length - 1 ? (
                  <div className="mx-4 h-px bg-[linear-gradient(90deg,rgba(224,232,238,0.18),rgba(224,232,238,0.9),rgba(224,232,238,0.18))]" />
                ) : null}
              </div>
            ))}
            {shouldShowCertaintyContrast ? (
              <>
                <div className="mx-4 h-px bg-[linear-gradient(90deg,rgba(224,232,238,0.18),rgba(224,232,238,0.9),rgba(224,232,238,0.18))]" />
                <LessonContrastBlock />
                <div className="mx-4 h-px bg-[linear-gradient(90deg,rgba(224,232,238,0.18),rgba(224,232,238,0.9),rgba(224,232,238,0.18))]" />
                <LessonCorrectionBlock />
              </>
            ) : null}
            {lessonIndex >= 0 ? (
              <>
                <div className="mx-4 h-px bg-[linear-gradient(90deg,rgba(224,232,238,0.18),rgba(224,232,238,0.9),rgba(224,232,238,0.18))]" />
                <section className="px-4 py-4">
                  {isCurrentActiveLesson ? (
                    <div className="grid gap-3 rounded-[22px] border border-[rgba(136,211,174,0.32)] bg-[linear-gradient(180deg,rgba(245,252,245,0.98),rgba(238,248,239,0.96))] px-4 py-4">
                      <span className="text-[0.63rem] font-extrabold uppercase tracking-[0.16em] text-[#4f8a60]">Hurrengo herria</span>
                      <p className="m-0 text-[0.94rem] font-semibold leading-relaxed text-[var(--text)]">
                        Ikasgai hau ulertutzat ematean, hurrengo herria desblokeatuko da mapan.
                      </p>
                      <button
                        type="button"
                        onClick={onCompleteStop}
                        className="inline-flex min-h-[2.85rem] w-fit items-center justify-center rounded-full bg-[linear-gradient(180deg,#108073,#149186)] px-5 text-[0.84rem] font-black text-white shadow-[0_12px_22px_rgba(20,145,134,0.18)] transition-transform duration-150 hover:-translate-y-[1px]"
                      >
                        Ikasgaia ulertuta
                      </button>
                    </div>
                  ) : isAlreadyCompleted ? (
                    <div className="flex items-start gap-3 rounded-[22px] border border-[rgba(151,215,181,0.26)] bg-[linear-gradient(180deg,rgba(246,252,247,0.98),rgba(239,248,241,0.96))] px-4 py-4">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[rgba(151,215,181,0.28)] bg-white/90 text-[#4b9867]">
                        <CheckCircle2 className="h-[1rem] w-[1rem]" />
                      </span>
                      <div className="grid gap-1.5">
                        <span className="text-[0.63rem] font-extrabold uppercase tracking-[0.16em] text-[#5b9270]">Aurrera eginda</span>
                        <p className="m-0 text-[0.92rem] font-semibold leading-relaxed text-[var(--text)]">
                          Ikasgai hau jada emanda dago ulertutzat. Hurrengo herria mapan irekita daukazu.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}
          </div>
        </article>
      ) : (
        <div className="flex items-start gap-3 rounded-[24px] border border-[rgba(236,187,92,0.26)] bg-[linear-gradient(180deg,rgba(255,250,240,0.98),rgba(255,247,232,0.96))] px-4 py-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[rgba(236,187,92,0.26)] bg-white/84 text-[#b47b10]">
            <AlertCircle className="h-[1rem] w-[1rem]" />
          </span>
          <div className="grid gap-2">
            <p className="m-0 text-[0.94rem] font-semibold leading-relaxed text-[var(--text)]">{message}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex min-h-[2.5rem] w-fit items-center justify-center rounded-full border border-[rgba(220,228,235,0.9)] bg-white px-4 text-[0.82rem] font-extrabold text-[var(--text)]"
            >
              Berriro saiatu
            </button>
          </div>
        </div>
      )}
    </section>
  );
});
