import { isSupabaseConfigured } from './supabaseConfig';
import { selectSupabaseRows } from './supabaseRest';

export type VerbType = 'nor' | 'nor_nork' | 'nor_nori' | 'nor_nori_nork';

export interface VerbFormRecord {
  verbType: VerbType;
  tense: string;
  numberType: string | null;
  nor: string | null;
  nori: string | null;
  nork: string | null;
  form: string;
  source: string;
  lookupKey: string;
}

interface VerbFormRow {
  verb_type: string | null;
  tense: string | null;
  number_type: string | null;
  nor: string | null;
  nori: string | null;
  nork: string | null;
  form: string | null;
  source: string | null;
  lookup_key: string | null;
}

export interface VerbFormsLoadResult {
  ok: boolean;
  forms: VerbFormRecord[];
  message: string;
}

const VERB_FORMS_TABLE = 'verb_forms';
const VERB_FORMS_SELECT = [
  'verb_type',
  'tense',
  'number_type',
  'nor',
  'nori',
  'nork',
  'form',
  'source',
  'lookup_key',
].join(', ');

const TENSE_ORDER = [
  'oraina',
  'iragana',
  'baldintza',
  'hipotetikoa',
  'hipotetikoa_oraina',
  'hipotetikoa_iragana',
  'ahalera',
  'ahalera_oraina',
  'ahalera_iragana',
  'ahalera_alegiazkoa',
  'subjuntiboa_oraina',
  'subjuntiboa_iragana',
] as const;

const TENSE_ORDER_MAP = new Map<string, number>(TENSE_ORDER.map((value, index) => [value, index]));

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const isVerbType = (value: string): value is VerbType =>
  value === 'nor' || value === 'nor_nork' || value === 'nor_nori' || value === 'nor_nori_nork';

const compareTense = (left: string, right: string): number =>
  (TENSE_ORDER_MAP.get(left) ?? Number.MAX_SAFE_INTEGER) - (TENSE_ORDER_MAP.get(right) ?? Number.MAX_SAFE_INTEGER)
  || left.localeCompare(right, 'eu');

export const VERB_TYPE_LABELS: Record<VerbType, string> = {
  nor: 'NOR',
  nor_nork: 'NOR-NORK',
  nor_nori: 'NOR-NORI',
  nor_nori_nork: 'NOR-NORI-NORK',
};

export const ARGUMENT_ORDER = {
  nor: ['ni', 'hi', 'hura', 'gu', 'zu', 'zuek', 'haiek'],
  nori: ['niri', 'hiri', 'hari', 'guri', 'zuri', 'zuei', 'haiei'],
  nork: ['nik', 'hik', 'hark', 'guk', 'zuk', 'zuek', 'haiek'],
  numberType: ['singularra', 'plurala'],
} as const;

export const formatVerbValueLabel = (value: string): string =>
  value
    .replaceAll('_', ' ')
    .replace(/(^|\s)(\p{L})/gu, (_, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase('eu')}`);

export const formatTenseLabel = (value: string): string => formatVerbValueLabel(value);

export function sortArgumentValues(values: string[], kind: keyof typeof ARGUMENT_ORDER): string[] {
  const order = ARGUMENT_ORDER[kind];
  const orderMap = new Map<string, number>(order.map((value, index) => [value, index]));

  return [...values].sort(
    (left, right) =>
      (orderMap.get(left) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(right) ?? Number.MAX_SAFE_INTEGER)
      || left.localeCompare(right, 'eu')
  );
}

export async function loadVerbForms(): Promise<VerbFormsLoadResult> {
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        forms: [],
        message: 'Supabase ez dago prest; ezin dira aditzak kargatu.',
      };
    }

    const { data, error } = await selectSupabaseRows<VerbFormRow>(VERB_FORMS_TABLE, {
      select: VERB_FORMS_SELECT,
      order: [
        { column: 'verb_type', ascending: true },
        { column: 'tense', ascending: true },
        { column: 'number_type', ascending: true, nullsFirst: true },
        { column: 'nor', ascending: true, nullsFirst: true },
        { column: 'nori', ascending: true, nullsFirst: true },
        { column: 'nork', ascending: true, nullsFirst: true },
      ],
      limit: 5000,
    });

    if (error || !data) {
      return {
        ok: false,
        forms: [],
        message: error?.message ?? 'Ezin izan dira aditz formak kargatu.',
      };
    }

    const forms = (data as unknown as VerbFormRow[])
      .map((row): VerbFormRecord | null => {
        const verbType = normalizeText(row.verb_type);
        const tense = normalizeText(row.tense);
        const form = normalizeText(row.form);

        if (!isVerbType(verbType) || !tense || !form) {
          return null;
        }

        return {
          verbType,
          tense,
          numberType: normalizeText(row.number_type) || null,
          nor: normalizeText(row.nor) || null,
          nori: normalizeText(row.nori) || null,
          nork: normalizeText(row.nork) || null,
          form,
          source: normalizeText(row.source) || 'imported',
          lookupKey: normalizeText(row.lookup_key) || '',
        };
      })
      .filter((row): row is VerbFormRecord => row !== null)
      .sort(
        (left, right) =>
          left.verbType.localeCompare(right.verbType, 'eu')
          || compareTense(left.tense, right.tense)
          || (left.numberType ?? '').localeCompare(right.numberType ?? '', 'eu')
          || (left.nor ?? '').localeCompare(right.nor ?? '', 'eu')
          || (left.nori ?? '').localeCompare(right.nori ?? '', 'eu')
          || (left.nork ?? '').localeCompare(right.nork ?? '', 'eu')
      );

    return {
      ok: true,
      forms,
      message: forms.length > 0 ? `${forms.length} aditz forma kargatuta.` : 'Ez dago aditz formarik oraindik.',
    };
}
