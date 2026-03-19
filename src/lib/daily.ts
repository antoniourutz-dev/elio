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

import { supabase, gameWordsTable, dailyScoresTable } from '../supabaseClient';
import type { SynonymEntry } from './types';
import type { GameWord, SpellingDailyQuestion, SynonymDailyQuestion, DailyQuestion, DailyAnswer, DailyResult, DailyRankingEntry } from '../appTypes';
import { uniqueNonEmptyStrings } from '../wordUtils';
import { buildEntryTerms, buildLocalDayKey, normalizeTextKey } from './parsing';
import { SUPERADMIN_PLAYER_CODE } from './constants';

// ── Seeded RNG ───────────────────────────────────────────────

function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

// ── Day key ──────────────────────────────────────────────────

export const getDayKey = (): string => buildLocalDayKey(new Date());
const EXCLUDED_RANKING_CODES = new Set([SUPERADMIN_PLAYER_CODE]);

// ── Game Words ───────────────────────────────────────────────

export async function loadGameWords(): Promise<GameWord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(gameWordsTable)
    .select('id, text, egoera, level')
    .order('id', { ascending: true });
  if (error || !data) return [];
  return data as GameWord[];
}

// ── Build Daily Game ─────────────────────────────────────────

const DAILY_SPELLING_COUNT = 5;
const DAILY_SYNONYM_COUNT = 5;

function buildSpellingQuestion(word: GameWord): SpellingDailyQuestion {
  return {
    type: 'spelling',
    id: `spell-${word.id}`,
    displayText: word.text,
    correctAnswer: word.egoera ? 'ZUZEN' : 'OKERRA',
  };
}

function buildSynonymQuestion(
  entry: SynonymEntry,
  allEntries: SynonymEntry[],
  rng: () => number
): SynonymDailyQuestion | null {
  const terms = buildEntryTerms(entry);
  if (terms.length < 2) return null;

  const shuffledTerms = shuffleWithRng(terms, rng);
  const word = shuffledTerms[0];
  const correctAnswer = shuffledTerms[1];
  const forbidden = new Set(terms.map(normalizeTextKey));

  const distractorPool = uniqueNonEmptyStrings(
    allEntries.flatMap((e) => buildEntryTerms(e))
  ).filter((t) => !forbidden.has(normalizeTextKey(t)));

  if (distractorPool.length < 3) return null;

  const distractors = shuffleWithRng(distractorPool, rng).slice(0, 3);
  const options = shuffleWithRng([correctAnswer, ...distractors], rng);

  return {
    type: 'synonym',
    id: `syn-${entry.id}-${normalizeTextKey(word)}`,
    word,
    correctAnswer,
    options,
  };
}

export function buildDailyGame(
  dayKey: string,
  gameWords: GameWord[],
  synonymEntries: SynonymEntry[]
): DailyQuestion[] {
  const seed = fnv1a(dayKey);
  const rng = makeLcg(seed);

  const spellingQuestions: SpellingDailyQuestion[] = shuffleWithRng(gameWords, rng)
    .slice(0, DAILY_SPELLING_COUNT)
    .map(buildSpellingQuestion);

  const synonymQuestions: SynonymDailyQuestion[] = [];
  for (const entry of shuffleWithRng(synonymEntries, rng)) {
    if (synonymQuestions.length >= DAILY_SYNONYM_COUNT) break;
    const q = buildSynonymQuestion(entry, synonymEntries, rng);
    if (q) synonymQuestions.push(q);
  }

  // Interleave: spelling, synonym, spelling, synonym, ...
  const questions: DailyQuestion[] = [];
  const paired = Math.min(spellingQuestions.length, synonymQuestions.length);
  for (let i = 0; i < paired; i++) {
    questions.push(spellingQuestions[i]);
    questions.push(synonymQuestions[i]);
  }
  questions.push(...spellingQuestions.slice(paired));
  questions.push(...synonymQuestions.slice(paired));

  return questions;
}

// ── Scoring ──────────────────────────────────────────────────

export function calculateDailyScore(correctCount: number, secondsElapsed: number): number {
  const baseScore = correctCount * 100;
  const timeBonus = Math.max(0, Math.floor(((90 - Math.min(secondsElapsed, 90)) / 90) * 300));
  return baseScore + timeBonus;
}

// ── Supabase ops ─────────────────────────────────────────────

const DAILY_RESULT_SELECT = 'day_key, score, correct_count, total_questions, seconds_elapsed, completed_at, answers';
const DAILY_RESULT_SELECT_NO_ANSWERS = 'day_key, score, correct_count, total_questions, seconds_elapsed, completed_at';

function parseAnswers(raw: unknown): import('../appTypes').DailyStoredAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is import('../appTypes').DailyStoredAnswer =>
    item !== null && typeof item === 'object' && 'type' in item
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

export async function loadMyDailyResult(ownerId: string, dayKey: string): Promise<DailyResult | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(dailyScoresTable)
    .select(DAILY_RESULT_SELECT)
    .eq('owner_id', ownerId)
    .eq('day_key', dayKey)
    .single();
  if (!error) return data ? parseResultRow(data as Record<string, unknown>) : null;
  // answers column may not exist yet — retry without it
  const { data: data2 } = await supabase
    .from(dailyScoresTable)
    .select(DAILY_RESULT_SELECT_NO_ANSWERS)
    .eq('owner_id', ownerId)
    .eq('day_key', dayKey)
    .single();
  return data2 ? parseResultRow(data2 as Record<string, unknown>) : null;
}

export async function saveDailyResult(
  ownerId: string,
  playerCode: string,
  result: DailyResult
): Promise<void> {
  if (!supabase) return;
  if (EXCLUDED_RANKING_CODES.has(playerCode)) return;
  await supabase.from(dailyScoresTable).upsert(
    {
      owner_id: ownerId,
      player_code: playerCode,
      day_key: result.dayKey,
      score: result.score,
      correct_count: result.correctCount,
      total_questions: result.totalQuestions,
      seconds_elapsed: result.secondsElapsed,
      completed_at: result.completedAt,
      answers: result.answers,
    },
    { onConflict: 'owner_id,day_key' }
  );
}

export async function loadDailyRanking(dayKey: string): Promise<DailyRankingEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(dailyScoresTable)
    .select('player_code, score, correct_count, total_questions, seconds_elapsed')
    .eq('day_key', dayKey)
    .order('score', { ascending: false })
    .order('seconds_elapsed', { ascending: true })
    .limit(50);
  if (error || !data) return [];
  return (
    data as {
      player_code: string;
      score: number;
      correct_count: number;
      total_questions: number;
      seconds_elapsed: number;
    }[]
  )
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

// ── Week range ───────────────────────────────────────────────

export function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dow = now.getDay(); // 0=Sunday … 6=Saturday
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: buildLocalDayKey(monday), end: buildLocalDayKey(sunday) };
}

export async function loadMyWeekHistory(
  ownerId: string,
  weekStart: string,
  weekEnd: string
): Promise<DailyResult[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(dailyScoresTable)
    .select(DAILY_RESULT_SELECT)
    .eq('owner_id', ownerId)
    .gte('day_key', weekStart)
    .lte('day_key', weekEnd)
    .order('day_key', { ascending: false });
  if (!error && data) return (data as Record<string, unknown>[]).map(parseResultRow);
  // answers column may not exist yet — retry without it
  const { data: data2 } = await supabase
    .from(dailyScoresTable)
    .select(DAILY_RESULT_SELECT_NO_ANSWERS)
    .eq('owner_id', ownerId)
    .gte('day_key', weekStart)
    .lte('day_key', weekEnd)
    .order('day_key', { ascending: false });
  if (!data2) return [];
  return (data2 as Record<string, unknown>[]).map(parseResultRow);
}

export async function loadWeeklyRanking(
  weekStart: string,
  weekEnd: string
): Promise<import('../appTypes').DailyWeeklyRankingEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(dailyScoresTable)
    .select('player_code, score')
    .gte('day_key', weekStart)
    .lte('day_key', weekEnd)
    .limit(500);
  if (error || !data) return [];

  const totals = new Map<string, { totalScore: number; daysPlayed: number }>();
  for (const row of data as { player_code: string; score: number }[]) {
    if (EXCLUDED_RANKING_CODES.has(row.player_code)) continue;
    const cur = totals.get(row.player_code) ?? { totalScore: 0, daysPlayed: 0 };
    totals.set(row.player_code, { totalScore: cur.totalScore + row.score, daysPlayed: cur.daysPlayed + 1 });
  }

  return Array.from(totals.entries())
    .map(([playerCode, { totalScore, daysPlayed }]) => ({ playerCode, totalScore, daysPlayed }))
    .sort((a, b) => b.totalScore - a.totalScore || b.daysPlayed - a.daysPlayed)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

// Re-export for use in daily game answer building
export type { DailyAnswer };
