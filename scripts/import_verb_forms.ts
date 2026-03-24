/**
 * Verb forms import script.
 *
 * Required env vars:
 * - SUPABASE_SERVICE_ROLE_KEY
 * - SUPABASE_URL or existing VITE_SUPABASE_URL
 *
 * Command:
 * - npm run import:verb-forms
 * - npm run import:verb-forms -- --dry-run
 *
 * What it does:
 * - normalizes the 4 Euskera conjugation datasets
 * - generates a deterministic lookup_key per row
 * - upserts into public.verb_forms on lookup_key
 */
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { NOR_DATA } from './verb-data/norData.ts';
import { NOR_NORK_DATA } from './verb-data/norNorkData.ts';
import { NOR_NORI_DATA } from './verb-data/norNoriData.ts';
import { NOR_NORI_NORK_DATA } from './verb-data/norNoriNorkData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const BATCH_SIZE = 500;
const TARGET_TABLE = 'verb_forms';
const NUMBER_TYPES = new Set(['singularra', 'plurala']);

loadEnv({ path: path.join(REPO_ROOT, '.env.local'), quiet: true });
loadEnv({ path: path.join(REPO_ROOT, '.env'), quiet: true });

interface VerbFormRow {
  verb_type: string;
  tense: string;
  number_type: string | null;
  nor: string | null;
  nori: string | null;
  nork: string | null;
  form: string;
  source: string;
  lookup_key: string;
}

type VerbFormUpsertRow = Omit<VerbFormRow, 'lookup_key'>;

type NorData = Record<string, Record<string, string>>;
type NorNorkData = Record<string, Record<string, Record<string, string>>>;
type NorNoriData = Record<string, Record<string, Record<string, string>>>;
type NorNoriNorkData = Record<string, Record<string, Record<string, Record<string, string>>>>;

function normalizeNullable(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequired(value: string, context: string): string {
  const normalized = normalizeNullable(value);
  if (!normalized) {
    throw new Error(`Empty value found while normalizing ${context}.`);
  }

  return normalized;
}

function buildLookupKey(row: Omit<VerbFormRow, 'lookup_key'>): string {
  return [
    row.verb_type,
    row.tense,
    row.number_type,
    row.nor,
    row.nori,
    row.nork,
  ]
    .map((part) => normalizeNullable(part) ?? '-')
    .join('__');
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getRequiredEnv() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing = [
    !supabaseUrl ? 'SUPABASE_URL (or VITE_SUPABASE_URL)' : null,
    !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  return {
    supabaseUrl: supabaseUrl!,
    serviceRoleKey: serviceRoleKey!,
  };
}

function createRow(
  row: Omit<VerbFormRow, 'lookup_key' | 'form'> & { form: string | null | undefined }
): VerbFormRow {
  const form = normalizeRequired(row.form ?? '', `${row.source} form`);
  const normalizedRow = {
    verb_type: normalizeRequired(row.verb_type, `${row.source} verb_type`),
    tense: normalizeRequired(row.tense, `${row.source} tense`),
    number_type: normalizeNullable(row.number_type),
    nor: normalizeNullable(row.nor),
    nori: normalizeNullable(row.nori),
    nork: normalizeNullable(row.nork),
    form,
    source: normalizeRequired(row.source, `${row.source} source`),
  };

  return {
    ...normalizedRow,
    lookup_key: buildLookupKey(normalizedRow),
  };
}

function buildVerbRows(): { rows: VerbFormRow[]; duplicateCount: number; sourceCounts: Record<string, number> } {
  const rowsByLookupKey = new Map<string, VerbFormRow>();
  let duplicateCount = 0;
  const sourceCounts: Record<string, number> = {};

  const addRow = (row: VerbFormRow) => {
    if (rowsByLookupKey.has(row.lookup_key)) {
      duplicateCount += 1;
    }

    rowsByLookupKey.set(row.lookup_key, row);
    sourceCounts[row.source] = (sourceCounts[row.source] ?? 0) + 1;
  };

  for (const [tense, norMap] of Object.entries(NOR_DATA as NorData)) {
    for (const [nor, form] of Object.entries(norMap)) {
      addRow(
        createRow({
          verb_type: 'nor',
          tense,
          number_type: null,
          nor,
          nori: null,
          nork: null,
          form,
          source: 'norData.ts',
        })
      );
    }
  }

  for (const [tense, norOrNumberMap] of Object.entries(NOR_NORK_DATA as NorNorkData)) {
    for (const [norOrNumberType, norkMap] of Object.entries(norOrNumberMap)) {
      const numberType = NUMBER_TYPES.has(norOrNumberType) ? norOrNumberType : null;
      const nor = numberType ? null : norOrNumberType;

      for (const [nork, form] of Object.entries(norkMap)) {
        addRow(
          createRow({
            verb_type: 'nor_nork',
            tense,
            number_type: numberType,
            nor,
            nori: null,
            nork,
            form,
            source: 'norNorkData.ts',
          })
        );
      }
    }
  }

  for (const [tense, norMap] of Object.entries(NOR_NORI_DATA as NorNoriData)) {
    for (const [nor, noriMap] of Object.entries(norMap)) {
      for (const [nori, form] of Object.entries(noriMap)) {
        addRow(
          createRow({
            verb_type: 'nor_nori',
            tense,
            number_type: null,
            nor,
            nori,
            nork: null,
            form,
            source: 'norNoriData.ts',
          })
        );
      }
    }
  }

  for (const [tense, numberTypeMap] of Object.entries(NOR_NORI_NORK_DATA as NorNoriNorkData)) {
    for (const [numberType, noriMap] of Object.entries(numberTypeMap)) {
      for (const [nori, norkMap] of Object.entries(noriMap)) {
        for (const [nork, form] of Object.entries(norkMap)) {
          addRow(
            createRow({
              verb_type: 'nor_nori_nork',
              tense,
              number_type: numberType,
              nor: null,
              nori,
              nork,
              form,
              source: 'norNoriNorkData.ts',
            })
          );
        }
      }
    }
  }

  return {
    rows: Array.from(rowsByLookupKey.values()),
    duplicateCount,
    sourceCounts,
  };
}

function toUpsertRows(rows: VerbFormRow[]): VerbFormUpsertRow[] {
  return rows.map(({ lookup_key: _lookupKey, ...row }) => row);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { supabaseUrl, serviceRoleKey } = getRequiredEnv();
  const { rows, duplicateCount, sourceCounts } = buildVerbRows();
  const upsertRows = toUpsertRows(rows);

  console.log(`[verb_forms] Prepared ${rows.length} normalized rows.`);
  for (const [source, count] of Object.entries(sourceCounts)) {
    console.log(`[verb_forms] ${source}: ${count} source rows.`);
  }
  if (duplicateCount > 0) {
    console.log(`[verb_forms] Duplicate lookup keys collapsed during normalization: ${duplicateCount}.`);
  }

  if (dryRun) {
    console.log('[verb_forms] Dry run enabled. No data will be written.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const batches = chunk(upsertRows, BATCH_SIZE);
  console.log(`[verb_forms] Starting upsert into public.${TARGET_TABLE} in ${batches.length} batches of up to ${BATCH_SIZE}.`);

  for (const [index, batch] of batches.entries()) {
    console.log(`[verb_forms] Upserting batch ${index + 1}/${batches.length} (${batch.length} rows)...`);
    const { error } = await supabase
      .from(TARGET_TABLE)
      .upsert(batch, { onConflict: 'lookup_key', ignoreDuplicates: false });

    if (error) {
      throw new Error(`Batch ${index + 1} failed: ${error.message}`);
    }
  }

  console.log(`[verb_forms] Import completed successfully. Upserted ${upsertRows.length} rows into public.${TARGET_TABLE}.`);
}

await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[verb_forms] Import failed: ${message}`);
  process.exitCode = 1;
});
