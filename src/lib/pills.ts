import { dailyPillsTable, isSupabaseConfigured, supabase } from '../supabaseClient';

function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export type PillTone = 'gramatika' | 'ortografia' | 'hiztegia' | 'puntuazioa' | 'historia';
export type PillCategory = string;

export interface DailyPill {
  id: string;
  category: PillCategory;
  tone: PillTone;
  title: string;
  body: string;
  example?: string;
}

type DailyPillRow = Record<string, unknown>;

const EMPTY_PILL: DailyPill = {
  id: 'remote-pill-empty',
  category: 'Hiztegia',
  tone: 'hiztegia',
  title: 'Ez dago eguneko pilularik',
  body: 'Eguneko pilula hau ikusteko, gehitu eduki aktiboa `eguneko_pildorak` taulan.',
};

const normalizeCategoryLabel = (value: unknown): string => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 'Gramatika';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

const resolvePillTone = (category: string): PillTone => {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes('puntu')) return 'puntuazioa';
  if (normalized.includes('ortogra')) return 'ortografia';
  if (normalized.includes('hizte')) return 'hiztegia';
  if (normalized.includes('histori')) return 'historia';
  return 'gramatika';
};

const buildExample = (firstExample: unknown, secondExample: unknown): string | undefined => {
  const first = String(firstExample ?? '').trim();
  const second = String(secondExample ?? '').trim();

  if (first && second) return `${first} - ${second}`;
  return first || second || undefined;
};

const normalizePillRow = (row: DailyPillRow): DailyPill | null => {
  const title = String(row.titulo ?? '').trim();
  const body = String(row.explicacion ?? '').trim();

  if (!title || !body) return null;

  return {
    id: String(row.id ?? title).trim() || title,
    category: normalizeCategoryLabel(row.categoria),
    tone: resolvePillTone(String(row.categoria ?? '')),
    title,
    body,
    example: buildExample(row.ejemplo_1, row.ejemplo_2),
  };
};

let cachedRemotePills: DailyPill[] | null = null;

const loadRemotePills = async (): Promise<DailyPill[] | null> => {
  if (cachedRemotePills) return cachedRemotePills;
  if (!supabase || !isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from(dailyPillsTable)
    .select('*')
    .eq('activo', true)
    .eq('idioma', 'eu')
    .order('id', { ascending: true });

  if (error) return null;

  const pills = (data ?? [])
    .map((row) => normalizePillRow(row as DailyPillRow))
    .filter((pill): pill is DailyPill => pill !== null);

  if (pills.length === 0) return null;

  cachedRemotePills = pills;
  return pills;
};

const selectDailyPill = (dayKey: string, pills: DailyPill[]): DailyPill => {
  const hash = fnv1a(dayKey + '-pill');
  return pills[hash % pills.length];
};

export function getFallbackDailyPill(dayKey: string): DailyPill {
  return {
    ...EMPTY_PILL,
    id: `${EMPTY_PILL.id}-${dayKey}`,
  };
}

export async function loadDailyPill(dayKey: string): Promise<DailyPill> {
  const remotePills = await loadRemotePills();
  return remotePills ? selectDailyPill(dayKey, remotePills) : getFallbackDailyPill(dayKey);
}

export const PILL_CATEGORY_LABELS: Record<PillTone, string> = {
  gramatika: 'Gramatika',
  ortografia: 'Ortografia',
  hiztegia: 'Hiztegia',
  puntuazioa: 'Puntuazioa',
  historia: 'Historia',
};
