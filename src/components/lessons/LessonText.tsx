import type { ReactNode } from 'react';

type Tone = 'strong' | 'soft';

const PARTICLE_CLASSES = {
  la: {
    strong:
      'inline-flex items-center rounded-full border border-[rgba(129,194,114,0.32)] bg-[linear-gradient(180deg,rgba(242,252,237,0.98),rgba(230,246,220,0.96))] px-2.5 py-1 font-black tracking-[-0.02em] text-[#4f8a52] shadow-[0_4px_10px_rgba(131,176,121,0.08)]',
    soft: 'rounded-[0.5rem] bg-[rgba(188,225,176,0.22)] px-[0.28rem] py-[0.02rem] font-bold text-[#5d9360]',
    arrow: 'text-[#78a568]',
  },
  nik: {
    strong:
      'inline-flex items-center rounded-full border border-[rgba(228,149,149,0.32)] bg-[linear-gradient(180deg,rgba(255,244,244,0.98),rgba(252,231,231,0.96))] px-2.5 py-1 font-black tracking-[-0.02em] text-[#ba5555] shadow-[0_4px_10px_rgba(203,126,126,0.08)]',
    soft: 'rounded-[0.5rem] bg-[rgba(244,199,199,0.24)] px-[0.28rem] py-[0.02rem] font-bold text-[#bc6464]',
    arrow: 'text-[#c57272]',
  },
} as const;

function getParticleKey(value: string): 'la' | 'nik' | null {
  const normalized = value.replace(/^-/, '').trim().toLowerCase();
  if (normalized === 'la' || normalized === 'nik') return normalized;
  return null;
}

export function getParticleClassName(value: string, tone: Tone) {
  const key = getParticleKey(value);
  if (!key) {
    return tone === 'strong'
      ? 'inline-flex items-center rounded-full border border-[rgba(124,169,226,0.26)] bg-[linear-gradient(180deg,rgba(242,248,255,0.96),rgba(233,242,254,0.94))] px-2 py-[0.12rem] font-black tracking-[-0.02em] text-[#2f5f9d] shadow-[0_4px_10px_rgba(116,151,204,0.08)]'
      : 'rounded-[0.45rem] bg-[rgba(176,208,235,0.18)] px-[0.28rem] py-[0.02rem] font-bold text-[#5479a8]';
  }

  return PARTICLE_CLASSES[key][tone];
}

export function getParticleArrowClassName(value: string) {
  const key = getParticleKey(value);
  return key ? PARTICLE_CLASSES[key].arrow : 'text-[#6f8eb3]';
}

export function ParticlePill({ value, tone = 'strong' }: { value: string; tone?: Tone }) {
  return <span className={getParticleClassName(value, tone)}>{value}</span>;
}

export function HighlightedLessonText({
  text,
  tone = 'soft',
}: {
  text: string;
  tone?: Tone;
}) {
  const nodes: ReactNode[] = [];
  const pattern = /(^|[\s([{'"«])(-la|-nik)\b|\b([A-Za-zÀ-ÿ]+?)(la|nik)\b/giu;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const explicitPrefix = match[1] ?? '';
    const explicitParticle = match[2] ?? '';
    const stem = match[3] ?? '';
    const suffix = match[4] ?? '';
    const matchStart = match.index ?? 0;

    if (explicitParticle) {
      const explicitStart = matchStart + explicitPrefix.length;
      if (explicitStart > cursor) {
        nodes.push(text.slice(cursor, explicitStart));
      }
      nodes.push(
        <span key={`explicit-${explicitStart}`} className={getParticleClassName(explicitParticle, tone)}>
          {explicitParticle}
        </span>
      );
      cursor = explicitStart + explicitParticle.length;
      continue;
    }

    if (stem && suffix) {
      if (matchStart > cursor) {
        nodes.push(text.slice(cursor, matchStart));
      }
      nodes.push(
        <span key={`suffix-${matchStart}`}>
          {stem}
          <span className={getParticleClassName(suffix, tone)}>{suffix}</span>
        </span>
      );
      cursor = matchStart + stem.length + suffix.length;
    }
  }

  if (cursor === 0) {
    return <>{text}</>;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return <>{nodes}</>;
}
