// NOTE: Before using the daily game, run this SQL in Supabase:
//
// CREATE TABLE IF NOT EXISTS daily_scores (
//   id bigserial PRIMARY KEY,
//   owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   player_code text NOT NULL,
//   day_key text NOT NULL,
//   score integer NOT NULL DEFAULT 0,
//   correct_count integer NOT NULL DEFAULT 0,
//   total_questions integer NOT NULL DEFAULT 0,
//   seconds_elapsed integer NOT NULL DEFAULT 0,
//   completed_at timestamptz NOT NULL DEFAULT now(),
//   UNIQUE(owner_id, day_key)
// );
// ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Players can insert own scores" ON daily_scores FOR INSERT WITH CHECK (auth.uid() = owner_id);
// CREATE POLICY "Players can update own scores" ON daily_scores FOR UPDATE USING (auth.uid() = owner_id);
// CREATE POLICY "All players can view ranking" ON daily_scores FOR SELECT USING (true);

import type {
  DailyRankingEntry,
  DailyResult,
  DailyStoredAnswer,
  DailyWeeklyRankingEntry,
  EroglificoEntry,
  GameWord,
  OrthographyExercise,
} from '../appTypes';
import { uniqueNonEmptyStrings } from '../wordUtils';
import { SUPERADMIN_PLAYER_CODE } from './constants';
import { isMissingColumnError, toDbError } from './db';
import { loadSupabaseModule } from './loadSupabaseModule';
import { logError, logWarn } from './logger';
import { normalizeSynonymRow, normalizeTextKey } from './parsing';
import {
  dailyHieroglyphsBaseUrl,
  dailyHieroglyphsTable,
  dailyScoresTable,
  gameWordsTable,
  isSupabaseConfigured,
  orthographyExercisesTable,
  synonymGroupsSecondaryTable,
} from './supabaseConfig';
import { selectSupabaseRows } from './supabaseRest';
import type { SynonymEntry } from './types';

const EXCLUDED_RANKING_CODES = new Set([SUPERADMIN_PLAYER_CODE]);
const DAILY_RESULT_SELECT = 'day_key, score, correct_count, total_questions, seconds_elapsed, completed_at, answers';
const DAILY_RESULT_SELECT_NO_ANSWERS = 'day_key, score, correct_count, total_questions, seconds_elapsed, completed_at';

function normalizeHieroglyphText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveHieroglyphImageUrl(path: string, baseUrl: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  const base = baseUrl.replace(/\/$/, '');
  return base ? `${base}/${trimmed.replace(/^\/+/, '')}` : trimmed;
}

function parseHieroglyphRow(row: Record<string, unknown>): EroglificoEntry | null {
  const rawImage =
    normalizeHieroglyphText(row.image_name) ||
    normalizeHieroglyphText(row.image_url) ||
    normalizeHieroglyphText(row.image_path) ||
    normalizeHieroglyphText(row.filename) ||
    normalizeHieroglyphText(row.image) ||
    normalizeHieroglyphText(row.fitxategia);
  const clue =
    normalizeHieroglyphText(row.clue) ||
    normalizeHieroglyphText(row.question) ||
    normalizeHieroglyphText(row.pista) ||
    normalizeHieroglyphText(row.galdera);
  const solution =
    normalizeHieroglyphText(row.answer) ||
    normalizeHieroglyphText(row.answer_text) ||
    normalizeHieroglyphText(row.answer_value) ||
    normalizeHieroglyphText(row.solution) ||
    normalizeHieroglyphText(row.word) ||
    normalizeHieroglyphText(row.erantzuna);
  const normalizedSolution =
    normalizeHieroglyphText(row.answer_normalized) ||
    normalizeHieroglyphText(row.solution_normalized) ||
    normalizeTextKey(solution);
  const active = typeof row.active === 'boolean' ? row.active : typeof row.aktibo === 'boolean' ? row.aktibo : true;
  const alternativeAnswers = Array.isArray(row.alternative_answers)
    ? uniqueNonEmptyStrings((row.alternative_answers as unknown[]).map((item) => normalizeHieroglyphText(item)))
    : [];

  if (!rawImage || !clue || !solution || !active) return null;

  return {
    id: (row.id as number | string | undefined) ?? rawImage,
    imagePath: rawImage,
    clue,
    solution,
    normalizedSolution,
    alternativeAnswers,
    active,
  };
}

function normalizeOrthographyOption(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOrthographySolution(value: unknown): 'A' | 'B' | 'C' | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'A' || normalized === 'B' || normalized === 'C') return normalized;
  return null;
}

function parseOrthographyRow(row: Record<string, unknown>): OrthographyExercise | null {
  const optionA = normalizeOrthographyOption(row.option_a);
  const optionB = normalizeOrthographyOption(row.option_b);
  const optionC = normalizeOrthographyOption(row.option_c);
  const solution = normalizeOrthographySolution(row.solution);
  const exerciseNumber =
    typeof row.exercise_number === 'number'
      ? row.exercise_number
      : typeof row.exercise_n === 'number'
        ? row.exercise_n
        : typeof row.exercise_num === 'number'
          ? row.exercise_num
          : typeof row.exercise_no === 'number'
            ? row.exercise_no
            : typeof row.id === 'number'
              ? row.id
              : 0;

  if (!optionA || !optionB || !optionC || !solution) return null;

  return {
    id: (row.id as number | string | undefined) ?? String(row.exercise_number ?? optionA),
    exerciseNumber,
    optionA,
    optionB,
    optionC,
    solution,
  };
}

function parseAnswers(raw: unknown): DailyStoredAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is DailyStoredAnswer => item !== null && typeof item === 'object' && 'type' in item
  );
}

function parseResultRow(data: Record<string, unknown>): DailyResult {
  return {
    dayKey: data.day_key as string,
    score: data.score as number,
    correctCount: data.correct_count as number,
    totalQuestions: data.total_questions as number,
    secondsElapsed: data.seconds_elapsed as number,
    completedAt: data.completed_at as string,
    answers: parseAnswers(data.answers),
  };
}

export async function loadGameWords(): Promise<GameWord[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await selectSupabaseRows<GameWord>(gameWordsTable, {
    select: 'id, text, egoera, level',
    order: [{ column: 'id', ascending: true }],
  });
  if (error || !data) return [];
  return data as GameWord[];
}

export async function loadDailyHieroglyphs(): Promise<EroglificoEntry[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await selectSupabaseRows<Record<string, unknown>>(dailyHieroglyphsTable, {
    order: [{ column: 'id', ascending: true }],
  });
  if (error || !data) return [];
  return (data as Record<string, unknown>[])
    .map(parseHieroglyphRow)
    .filter((entry): entry is EroglificoEntry => Boolean(entry))
    .map((entry) => ({
      ...entry,
      imagePath: resolveHieroglyphImageUrl(entry.imagePath, dailyHieroglyphsBaseUrl),
    }));
}

export async function loadOrthographyExercises(): Promise<OrthographyExercise[]> {
  if (!isSupabaseConfigured) return [];

  const tableCandidates = [...new Set([orthographyExercisesTable, 'ejercicios_orto', 'ortografia'])];
  let lastError: unknown = null;

  for (const tableName of tableCandidates) {
    const { data, error } = await selectSupabaseRows<Record<string, unknown>>(tableName, {
      order: [{ column: 'id', ascending: true }],
    });

    if (!error && data) {
      return (data as Record<string, unknown>[])
        .map(parseOrthographyRow)
        .filter((entry): entry is OrthographyExercise => Boolean(entry))
        .sort((left, right) => left.exerciseNumber - right.exerciseNumber);
    }

    lastError = error;

    if (error?.code !== 'PGRST205') {
      break;
    }
  }

  logError('dailyRepository', 'Orthography exercises could not be loaded.', lastError);
  return [];
}

export async function loadDailySynonymEntries(): Promise<SynonymEntry[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await selectSupabaseRows<Record<string, unknown>>(synonymGroupsSecondaryTable, {
    filters: [
      { column: 'active', operator: 'eq', value: true },
      { column: 'level', operator: 'in', value: [2, 3, 4] },
    ],
    order: [{ column: 'id', ascending: true }],
  });

  if (error || !data) {
    logError('dailyRepository', 'Daily synonym entries could not be loaded.', error);
    return [];
  }

  return (data as Record<string, unknown>[])
    .map((row, index) =>
      normalizeSynonymRow(
        {
          ...row,
          group_number:
            typeof row.group_number === 'number' || typeof row.group_number === 'string' ? row.group_number : row.level,
        },
        index
      )
    )
    .filter((entry): entry is SynonymEntry => Boolean(entry) && [2, 3, 4].includes(entry.levelOrder ?? 0));
}

export async function loadMyDailyResult(ownerId: string, dayKey: string): Promise<DailyResult | null> {
  const { supabase, dailyScoresTable } = await loadSupabaseModule();
  if (!supabase) return null;
  const primaryQueryResult = await supabase
    .from(dailyScoresTable)
    .select(DAILY_RESULT_SELECT)
    .eq('owner_id', ownerId)
    .eq('day_key', dayKey)
    .maybeSingle();
  const firstError = toDbError(primaryQueryResult.error);
  if (!firstError) {
    return primaryQueryResult.data ? parseResultRow(primaryQueryResult.data as Record<string, unknown>) : null;
  }
  if (!isMissingColumnError(firstError, 'answers')) {
    return null;
  }
  const { data } = await supabase
    .from(dailyScoresTable)
    .select(DAILY_RESULT_SELECT_NO_ANSWERS)
    .eq('owner_id', ownerId)
    .eq('day_key', dayKey)
    .maybeSingle();
  return data ? parseResultRow(data as Record<string, unknown>) : null;
}

export async function saveDailyResult(ownerId: string, playerCode: string, result: DailyResult): Promise<void> {
  const { supabase, dailyScoresTable } = await loadSupabaseModule();
  if (!supabase || EXCLUDED_RANKING_CODES.has(playerCode)) return;

  const basePayload = {
    owner_id: ownerId,
    player_code: playerCode,
    day_key: result.dayKey,
    score: result.score,
    correct_count: result.correctCount,
    total_questions: result.totalQuestions,
    seconds_elapsed: result.secondsElapsed,
    completed_at: result.completedAt,
  };

  const primaryResult = await supabase
    .from(dailyScoresTable)
    .upsert({ ...basePayload, answers: result.answers }, { onConflict: 'owner_id,day_key' });
  const primaryError = toDbError(primaryResult.error);

  if (!primaryError) {
    return;
  }

  if (isMissingColumnError(primaryError, 'answers')) {
    logWarn('dailyRepository', 'daily_scores has no answers column. Retrying save without answers.', primaryError);
    const fallbackResult = await supabase.from(dailyScoresTable).upsert(basePayload, { onConflict: 'owner_id,day_key' });
    const fallbackError = toDbError(fallbackResult.error);
    if (!fallbackError) {
      return;
    }
    logError('dailyRepository', 'Daily result could not be saved without answers.', fallbackError);
    return;
  }

  logError('dailyRepository', 'Daily result could not be saved.', primaryError);
}

export async function loadDailyRanking(dayKey: string): Promise<DailyRankingEntry[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await selectSupabaseRows<{
    player_code: string;
    score: number;
    correct_count: number;
    total_questions: number;
    seconds_elapsed: number;
  }>(dailyScoresTable, {
    select: 'player_code, score, correct_count, total_questions, seconds_elapsed',
    filters: [{ column: 'day_key', operator: 'eq', value: dayKey }],
    order: [
      { column: 'score', ascending: false },
      { column: 'seconds_elapsed', ascending: true },
    ],
    limit: 50,
  });
  if (error || !data) return [];
  return data
    .filter((row) => !EXCLUDED_RANKING_CODES.has(row.player_code))
    .map((row, index) => ({
      playerCode: row.player_code,
      score: row.score,
      correctCount: row.correct_count,
      totalQuestions: row.total_questions,
      secondsElapsed: row.seconds_elapsed,
      rank: index + 1,
    }));
}

export async function loadMyWeekHistory(
  ownerId: string,
  weekStart: string,
  weekEnd: string
): Promise<DailyResult[]> {
  const { supabase, dailyScoresTable } = await loadSupabaseModule();
  if (!supabase) return [];
  const firstQuery = await supabase
    .from(dailyScoresTable)
    .select(DAILY_RESULT_SELECT)
    .eq('owner_id', ownerId)
    .gte('day_key', weekStart)
    .lte('day_key', weekEnd)
    .order('day_key', { ascending: false });

  if (!firstQuery.error && firstQuery.data) {
    return (firstQuery.data as Record<string, unknown>[]).map(parseResultRow);
  }

  const fallbackQuery = await supabase
    .from(dailyScoresTable)
    .select(DAILY_RESULT_SELECT_NO_ANSWERS)
    .eq('owner_id', ownerId)
    .gte('day_key', weekStart)
    .lte('day_key', weekEnd)
    .order('day_key', { ascending: false });

  if (!fallbackQuery.data) return [];
  return (fallbackQuery.data as Record<string, unknown>[]).map(parseResultRow);
}

export async function loadWeeklyRanking(
  weekStart: string,
  weekEnd: string
): Promise<DailyWeeklyRankingEntry[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await selectSupabaseRows<{ player_code: string; score: number }>(dailyScoresTable, {
    select: 'player_code, score',
    filters: [
      { column: 'day_key', operator: 'gte', value: weekStart },
      { column: 'day_key', operator: 'lte', value: weekEnd },
    ],
    limit: 500,
  });
  if (error || !data) return [];

  const totals = new Map<string, { totalScore: number; daysPlayed: number }>();
  for (const row of data) {
    if (EXCLUDED_RANKING_CODES.has(row.player_code)) continue;
    const current = totals.get(row.player_code) ?? { totalScore: 0, daysPlayed: 0 };
    totals.set(row.player_code, {
      totalScore: current.totalScore + row.score,
      daysPlayed: current.daysPlayed + 1,
    });
  }

  return Array.from(totals.entries())
    .map(([playerCode, { totalScore, daysPlayed }]) => ({ playerCode, totalScore, daysPlayed }))
    .sort((left, right) => right.totalScore - left.totalScore || right.daysPlayed - left.daysPlayed)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
