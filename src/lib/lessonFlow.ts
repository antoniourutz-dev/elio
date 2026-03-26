import {
  grammarTopicsTable,
  isSupabaseConfigured,
  lessonCardsTable,
  lessonExamplesTable,
  lessonExerciseFeedbackMapTable,
  lessonExerciseOptionsTable,
  lessonExercisesTable,
  lessonFeedbackRulesTable,
  lessonRelationsTable,
  lessonUserExerciseAttemptsTable,
  lessonUserProgressTable,
  lessonsTable,
} from './supabaseConfig';
import { selectSupabaseRows } from './supabaseRest';
import { loadSupabaseModule } from './loadSupabaseModule';
import { isMissingTableError, isRowLevelSecurityError, toDbError } from './db';

type JsonRecord = Record<string, unknown>;

export type LessonCardType = 'hook' | 'micro_hint' | 'summary' | string;
export type LessonCardDisplayMode = 'contrast' | 'single' | 'rule_card' | 'summary_card' | string;
export type LessonExerciseType = 'multiple_choice' | string;
export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface LessonTopic {
  id: number | string;
  slug: string | null;
  titleEu: string;
  titleEs: string | null;
  descriptionEu: string | null;
  difficultyBase: string | null;
  isActive: boolean;
}

export interface LessonCard {
  id: number | string;
  lessonId: number | string;
  cardType: LessonCardType;
  displayMode: LessonCardDisplayMode;
  titleEu: string | null;
  bodyEu: string | null;
  bodyEs: string | null;
  ctaLabelEu: string | null;
  extraData: JsonRecord;
  sortOrder: number;
  isOptional: boolean;
}

export interface LessonExample {
  id: number | string;
  lessonId: number | string;
  exampleType: string | null;
  sentenceEu: string;
  sentenceEs: string | null;
  noteEu: string | null;
  highlightText: string | null;
  highlightMode: string | null;
  metadata: JsonRecord;
  sortOrder: number;
}

export interface LessonFeedbackRule {
  id: number | string;
  topicId: number | string | null;
  ruleCode: string | null;
  triggerDescription: string | null;
  feedbackShortEu: string | null;
  feedbackLongEu: string | null;
  exampleEu: string | null;
}

export interface ExerciseFeedbackMapping {
  id: number | string;
  exerciseId: number | string;
  feedbackRuleId: number | string | null;
  wrongOptionValue: string | null;
  priority: number;
  rule: LessonFeedbackRule | null;
}

export interface LessonExerciseOption {
  id: number | string;
  exerciseId: number | string;
  optionText: string;
  optionValue: string;
  isCorrect: boolean;
  feedbackCorrectEu: string | null;
  feedbackIncorrectEu: string | null;
  sortOrder: number;
}

export interface LessonExercise {
  id: number | string;
  lessonId: number | string;
  exerciseType: LessonExerciseType;
  promptEu: string;
  instructionEu: string | null;
  contextType: string | null;
  level: string | null;
  errorPattern: string | null;
  feedbackCorrect: string | null;
  feedbackIncorrect: string | null;
  explanationOnFail: string | null;
  metadata: JsonRecord;
  sortOrder: number;
  options: LessonExerciseOption[];
  feedbackMappings: ExerciseFeedbackMapping[];
}

export interface LessonRelation {
  id: number | string;
  lessonId: number | string | null;
  relatedLessonId: number | string | null;
  relationType: string | null;
  sortOrder: number;
  metadata: JsonRecord;
}

export interface LessonFlow {
  id: number | string;
  topicId: number | string | null;
  slug: string;
  titleEu: string;
  subtitleEu: string | null;
  titleEs: string | null;
  lessonType: string | null;
  level: string | null;
  introMode: string | null;
  published: boolean;
  estimatedMinutes: number | null;
  xpReward: number | null;
  sortOrder: number;
  metadata: JsonRecord;
  topic: LessonTopic | null;
  cards: LessonCard[];
  examples: LessonExample[];
  exercises: LessonExercise[];
  relations: LessonRelation[];
}

export interface LessonFlowLoadResult {
  ok: boolean;
  lesson: LessonFlow | null;
  message: string;
}

export interface LessonUserProgress {
  id: number | string | null;
  userId: string;
  lessonId: number | string;
  status: LessonProgressStatus;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  correctRate: number;
  startedAt: string | null;
  completedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LessonProgressLoadResult {
  ok: boolean;
  progress: LessonUserProgress | null;
  message: string;
}

export interface LessonProgressMutationResult {
  ok: boolean;
  progress: LessonUserProgress | null;
  message: string;
}

export interface LessonAttemptInput {
  userId: string;
  lessonId: number | string;
  exerciseId: number | string;
  selectedOptionId: number | string;
  isCorrect: boolean;
  feedbackRuleId?: number | string | null;
}

interface LessonTopicRow {
  id: number | string | null;
  slug: string | null;
  title_eu: string | null;
  title_es: string | null;
  description_eu: string | null;
  difficulty_base: string | null;
  is_active: boolean | null;
}

interface LessonRow {
  id: number | string | null;
  topic_id: number | string | null;
  slug: string | null;
  title_eu: string | null;
  subtitle_eu: string | null;
  title_es: string | null;
  lesson_type: string | null;
  level: string | null;
  intro_mode: string | null;
  published: boolean | null;
  estimated_minutes: number | null;
  xp_reward: number | null;
  sort_order: number | null;
  metadata: unknown;
}

interface LessonCardRow {
  id: number | string | null;
  lesson_id: number | string | null;
  card_type: string | null;
  display_mode: string | null;
  title_eu: string | null;
  body_eu: string | null;
  body_es: string | null;
  cta_label_eu: string | null;
  extra_data: unknown;
  sort_order: number | null;
  is_optional: boolean | null;
}

interface LessonExampleRow {
  id: number | string | null;
  lesson_id: number | string | null;
  example_type: string | null;
  sentence_eu: string | null;
  sentence_es: string | null;
  note_eu: string | null;
  highlight_text: string | null;
  highlight_mode: string | null;
  metadata: unknown;
  sort_order: number | null;
}

interface LessonExerciseRow {
  id: number | string | null;
  lesson_id: number | string | null;
  exercise_type: string | null;
  prompt_eu: string | null;
  instruction_eu: string | null;
  context_type: string | null;
  level: string | null;
  error_pattern: string | null;
  feedback_correct: string | null;
  feedback_incorrect: string | null;
  explanation_on_fail: string | null;
  metadata: unknown;
  sort_order: number | null;
}

interface LessonExerciseOptionRow {
  id: number | string | null;
  exercise_id: number | string | null;
  option_text: string | null;
  option_value: string | null;
  is_correct: boolean | null;
  feedback_correct_eu: string | null;
  feedback_incorrect_eu: string | null;
  sort_order: number | null;
}

interface LessonFeedbackRuleRow {
  id: number | string | null;
  topic_id: number | string | null;
  rule_code: string | null;
  trigger_description: string | null;
  feedback_short_eu: string | null;
  feedback_long_eu: string | null;
  example_eu: string | null;
}

interface ExerciseFeedbackMapRow {
  id: number | string | null;
  exercise_id: number | string | null;
  feedback_rule_id: number | string | null;
  wrong_option_value: string | null;
  priority: number | null;
}

interface LessonRelationRow {
  id: number | string | null;
  lesson_id: number | string | null;
  related_lesson_id: number | string | null;
  relation_type: string | null;
  sort_order?: number | null;
  metadata?: unknown;
}

interface UserProgressRow {
  id?: number | string | null;
  user_id: string | null;
  lesson_id: number | string | null;
  status: string | null;
  attempts: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  correct_rate: number | null;
  started_at?: string | null;
  completed_at: string | null;
  last_seen_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const toNullableText = (value: unknown): string | null => {
  const text = toText(value);
  return text || null;
};
const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function toRecord(value: unknown): JsonRecord {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as JsonRecord) : {};
    } catch {
      return {};
    }
  }

  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function parseTopic(row: LessonTopicRow | null | undefined): LessonTopic | null {
  if (!row || row.id === null || row.id === undefined) return null;
  const titleEu = toText(row.title_eu);
  if (!titleEu) return null;

  return {
    id: row.id,
    slug: toNullableText(row.slug),
    titleEu,
    titleEs: toNullableText(row.title_es),
    descriptionEu: toNullableText(row.description_eu),
    difficultyBase: toNullableText(row.difficulty_base),
    isActive: row.is_active !== false,
  };
}

function parseLesson(row: LessonRow | null | undefined): Omit<LessonFlow, 'topic' | 'cards' | 'examples' | 'exercises' | 'relations'> | null {
  if (!row || row.id === null || row.id === undefined) return null;
  const slug = toText(row.slug);
  const titleEu = toText(row.title_eu);
  if (!slug || !titleEu) return null;

  return {
    id: row.id,
    topicId: row.topic_id ?? null,
    slug,
    titleEu,
    subtitleEu: toNullableText(row.subtitle_eu),
    titleEs: toNullableText(row.title_es),
    lessonType: toNullableText(row.lesson_type),
    level: toNullableText(row.level),
    introMode: toNullableText(row.intro_mode),
    published: row.published !== false,
    estimatedMinutes: row.estimated_minutes !== null && row.estimated_minutes !== undefined ? toNumber(row.estimated_minutes) : null,
    xpReward: row.xp_reward !== null && row.xp_reward !== undefined ? toNumber(row.xp_reward) : null,
    sortOrder: toNumber(row.sort_order),
    metadata: toRecord(row.metadata),
  };
}

function parseCard(row: LessonCardRow): LessonCard | null {
  if (row.id === null || row.id === undefined || row.lesson_id === null || row.lesson_id === undefined) return null;
  return {
    id: row.id,
    lessonId: row.lesson_id,
    cardType: toText(row.card_type) || 'hook',
    displayMode: toText(row.display_mode) || 'single',
    titleEu: toNullableText(row.title_eu),
    bodyEu: toNullableText(row.body_eu),
    bodyEs: toNullableText(row.body_es),
    ctaLabelEu: toNullableText(row.cta_label_eu),
    extraData: toRecord(row.extra_data),
    sortOrder: toNumber(row.sort_order),
    isOptional: row.is_optional === true,
  };
}

function parseExample(row: LessonExampleRow): LessonExample | null {
  if (row.id === null || row.id === undefined || row.lesson_id === null || row.lesson_id === undefined) return null;
  const sentenceEu = toText(row.sentence_eu);
  if (!sentenceEu) return null;

  return {
    id: row.id,
    lessonId: row.lesson_id,
    exampleType: toNullableText(row.example_type),
    sentenceEu,
    sentenceEs: toNullableText(row.sentence_es),
    noteEu: toNullableText(row.note_eu),
    highlightText: toNullableText(row.highlight_text),
    highlightMode: toNullableText(row.highlight_mode),
    metadata: toRecord(row.metadata),
    sortOrder: toNumber(row.sort_order),
  };
}

function parseExercise(row: LessonExerciseRow): Omit<LessonExercise, 'options' | 'feedbackMappings'> | null {
  if (row.id === null || row.id === undefined || row.lesson_id === null || row.lesson_id === undefined) return null;
  const promptEu = toText(row.prompt_eu);
  if (!promptEu) return null;

  return {
    id: row.id,
    lessonId: row.lesson_id,
    exerciseType: toText(row.exercise_type) || 'multiple_choice',
    promptEu,
    instructionEu: toNullableText(row.instruction_eu),
    contextType: toNullableText(row.context_type),
    level: toNullableText(row.level),
    errorPattern: toNullableText(row.error_pattern),
    feedbackCorrect: toNullableText(row.feedback_correct),
    feedbackIncorrect: toNullableText(row.feedback_incorrect),
    explanationOnFail: toNullableText(row.explanation_on_fail),
    metadata: toRecord(row.metadata),
    sortOrder: toNumber(row.sort_order),
  };
}

function parseOption(row: LessonExerciseOptionRow): LessonExerciseOption | null {
  if (row.id === null || row.id === undefined || row.exercise_id === null || row.exercise_id === undefined) return null;
  const optionText = toText(row.option_text);
  const optionValue = toText(row.option_value) || optionText;
  if (!optionText || !optionValue) return null;

  return {
    id: row.id,
    exerciseId: row.exercise_id,
    optionText,
    optionValue,
    isCorrect: row.is_correct === true,
    feedbackCorrectEu: toNullableText(row.feedback_correct_eu),
    feedbackIncorrectEu: toNullableText(row.feedback_incorrect_eu),
    sortOrder: toNumber(row.sort_order),
  };
}

function parseFeedbackRule(row: LessonFeedbackRuleRow): LessonFeedbackRule | null {
  if (row.id === null || row.id === undefined) return null;
  return {
    id: row.id,
    topicId: row.topic_id ?? null,
    ruleCode: toNullableText(row.rule_code),
    triggerDescription: toNullableText(row.trigger_description),
    feedbackShortEu: toNullableText(row.feedback_short_eu),
    feedbackLongEu: toNullableText(row.feedback_long_eu),
    exampleEu: toNullableText(row.example_eu),
  };
}

function parseFeedbackMap(row: ExerciseFeedbackMapRow, rulesById: Map<number | string, LessonFeedbackRule>): ExerciseFeedbackMapping | null {
  if (row.id === null || row.id === undefined || row.exercise_id === null || row.exercise_id === undefined) return null;
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    feedbackRuleId: row.feedback_rule_id ?? null,
    wrongOptionValue: toNullableText(row.wrong_option_value),
    priority: toNumber(row.priority, 999),
    rule: row.feedback_rule_id !== null && row.feedback_rule_id !== undefined ? rulesById.get(row.feedback_rule_id) ?? null : null,
  };
}

function parseRelation(row: LessonRelationRow): LessonRelation | null {
  if (row.id === null || row.id === undefined) return null;
  return {
    id: row.id,
    lessonId: row.lesson_id ?? null,
    relatedLessonId: row.related_lesson_id ?? null,
    relationType: toNullableText(row.relation_type),
    sortOrder: toNumber(row.sort_order),
    metadata: toRecord(row.metadata),
  };
}

function normalizeProgressStatus(value: unknown): LessonProgressStatus {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'completed') return 'completed';
  if (normalized === 'in_progress') return 'in_progress';
  return 'not_started';
}

function parseUserProgress(row: UserProgressRow | null | undefined): LessonUserProgress | null {
  if (!row || !row.user_id || row.lesson_id === null || row.lesson_id === undefined) return null;

  return {
    id: row.id ?? null,
    userId: row.user_id,
    lessonId: row.lesson_id,
    status: normalizeProgressStatus(row.status),
    attempts: Math.max(0, toNumber(row.attempts)),
    correctCount: Math.max(0, toNumber(row.correct_count)),
    wrongCount: Math.max(0, toNumber(row.wrong_count)),
    correctRate: Math.max(0, toNumber(row.correct_rate)),
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    lastSeenAt: row.last_seen_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function buildDbErrorMessage(prefix: string, error: unknown): string {
  const dbError = toDbError(error);
  const head = isMissingTableError(dbError)
    ? 'Taula falta da.'
    : isRowLevelSecurityError(dbError)
      ? 'RLS politikek taula blokeatzen dute.'
      : prefix;

  return `${head} ${dbError?.message ?? ''}`.trim();
}

export async function loadLessonFlowBySlug(slug: string): Promise<LessonFlowLoadResult> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return { ok: false, lesson: null, message: 'Slug hutsik dago.' };
  }

  if (!isSupabaseConfigured) {
    return { ok: false, lesson: null, message: 'Supabase ez dago prest; ezin da ikasgaia kargatu.' };
  }

  const lessonResult = await selectSupabaseRows<LessonRow>(lessonsTable, {
    select: '*',
    filters: [
      { column: 'slug', operator: 'eq', value: normalizedSlug },
      { column: 'published', operator: 'eq', value: true },
    ],
    order: [{ column: 'sort_order', ascending: true }],
    limit: 1,
  });

  if (lessonResult.error) {
    return { ok: false, lesson: null, message: lessonResult.error.message || 'Ezin izan da ikasgaia kargatu.' };
  }

  const lessonBase = parseLesson((lessonResult.data?.[0] as LessonRow | undefined) ?? null);
  if (!lessonBase) {
    return { ok: false, lesson: null, message: 'Ez dago ikasgai argitaraturik slug horrekin.' };
  }

  const [topicResult, cardsResult, examplesResult, exercisesResult, relationsResult] = await Promise.all([
    lessonBase.topicId !== null && lessonBase.topicId !== undefined
      ? selectSupabaseRows<LessonTopicRow>(grammarTopicsTable, {
          select: '*',
          filters: [{ column: 'id', operator: 'eq', value: lessonBase.topicId }],
          limit: 1,
        })
      : Promise.resolve({ data: null, error: null }),
    selectSupabaseRows<LessonCardRow>(lessonCardsTable, {
      select: '*',
      filters: [{ column: 'lesson_id', operator: 'eq', value: lessonBase.id }],
      order: [{ column: 'sort_order', ascending: true }],
    }),
    selectSupabaseRows<LessonExampleRow>(lessonExamplesTable, {
      select: '*',
      filters: [{ column: 'lesson_id', operator: 'eq', value: lessonBase.id }],
      order: [{ column: 'sort_order', ascending: true }],
    }),
    selectSupabaseRows<LessonExerciseRow>(lessonExercisesTable, {
      select: '*',
      filters: [{ column: 'lesson_id', operator: 'eq', value: lessonBase.id }],
      order: [{ column: 'sort_order', ascending: true }],
    }),
    selectSupabaseRows<LessonRelationRow>(lessonRelationsTable, {
      select: '*',
      filters: [{ column: 'lesson_id', operator: 'eq', value: lessonBase.id }],
    }),
  ]);

  const rowLevelError = cardsResult.error || examplesResult.error || exercisesResult.error || relationsResult.error || topicResult.error;
  if (rowLevelError) {
    return { ok: false, lesson: null, message: rowLevelError.message || 'Ezin izan dira ikasgaiaren datuak kargatu.' };
  }

  const exercises = ((exercisesResult.data ?? []) as LessonExerciseRow[])
    .map(parseExercise)
    .filter((entry): entry is Omit<LessonExercise, 'options' | 'feedbackMappings'> => Boolean(entry))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const exerciseIds = exercises.map((exercise) => exercise.id);

  const [optionsResult, feedbackMapResult] = exerciseIds.length > 0
    ? await Promise.all([
        selectSupabaseRows<LessonExerciseOptionRow>(lessonExerciseOptionsTable, {
          select: '*',
          filters: [{ column: 'exercise_id', operator: 'in', value: exerciseIds }],
          order: [{ column: 'sort_order', ascending: true }],
        }),
        selectSupabaseRows<ExerciseFeedbackMapRow>(lessonExerciseFeedbackMapTable, {
          select: '*',
          filters: [{ column: 'exercise_id', operator: 'in', value: exerciseIds }],
          order: [{ column: 'priority', ascending: true }],
        }),
      ])
    : [
        { data: [] as LessonExerciseOptionRow[], error: null },
        { data: [] as ExerciseFeedbackMapRow[], error: null },
      ];

  if (optionsResult.error || feedbackMapResult.error) {
    return {
      ok: false,
      lesson: null,
      message: optionsResult.error?.message || feedbackMapResult.error?.message || 'Ezin izan dira ariketen aukerak kargatu.',
    };
  }

  const feedbackRuleIds = Array.from(
    new Set(
      ((feedbackMapResult.data ?? []) as ExerciseFeedbackMapRow[])
        .map((entry) => entry.feedback_rule_id)
        .filter((entry): entry is number | string => entry !== null && entry !== undefined)
    )
  );

  const feedbackRulesResult = feedbackRuleIds.length > 0
    ? await selectSupabaseRows<LessonFeedbackRuleRow>(lessonFeedbackRulesTable, {
        select: '*',
        filters: [{ column: 'id', operator: 'in', value: feedbackRuleIds }],
      })
    : { data: [] as LessonFeedbackRuleRow[], error: null };

  if (feedbackRulesResult.error) {
    return { ok: false, lesson: null, message: feedbackRulesResult.error.message || 'Ezin izan da feedbacka kargatu.' };
  }

  const rulesById = new Map(
    ((feedbackRulesResult.data ?? []) as LessonFeedbackRuleRow[])
      .map(parseFeedbackRule)
      .filter((entry): entry is LessonFeedbackRule => Boolean(entry))
      .map((entry) => [entry.id, entry] as const)
  );

  const optionsByExerciseId = new Map<number | string, LessonExerciseOption[]>();
  for (const option of ((optionsResult.data ?? []) as LessonExerciseOptionRow[])
    .map(parseOption)
    .filter((entry): entry is LessonExerciseOption => Boolean(entry))) {
    const current = optionsByExerciseId.get(option.exerciseId) ?? [];
    current.push(option);
    optionsByExerciseId.set(option.exerciseId, current);
  }

  const feedbackByExerciseId = new Map<number | string, ExerciseFeedbackMapping[]>();
  for (const mapping of ((feedbackMapResult.data ?? []) as ExerciseFeedbackMapRow[])
    .map((row) => parseFeedbackMap(row, rulesById))
    .filter((entry): entry is ExerciseFeedbackMapping => Boolean(entry))) {
    const current = feedbackByExerciseId.get(mapping.exerciseId) ?? [];
    current.push(mapping);
    feedbackByExerciseId.set(mapping.exerciseId, current);
  }

  return {
    ok: true,
    lesson: {
      ...lessonBase,
      topic: parseTopic((topicResult.data?.[0] as LessonTopicRow | undefined) ?? null),
      cards: ((cardsResult.data ?? []) as LessonCardRow[])
        .map(parseCard)
        .filter((entry): entry is LessonCard => Boolean(entry))
        .sort((left, right) => left.sortOrder - right.sortOrder),
      examples: ((examplesResult.data ?? []) as LessonExampleRow[])
        .map(parseExample)
        .filter((entry): entry is LessonExample => Boolean(entry))
        .sort((left, right) => left.sortOrder - right.sortOrder),
      exercises: exercises.map((exercise) => ({
        ...exercise,
        options: (optionsByExerciseId.get(exercise.id) ?? []).sort((left, right) => left.sortOrder - right.sortOrder),
        feedbackMappings: (feedbackByExerciseId.get(exercise.id) ?? []).sort((left, right) => left.priority - right.priority),
      })),
      relations: ((relationsResult.data ?? []) as LessonRelationRow[])
        .map(parseRelation)
        .filter((entry): entry is LessonRelation => Boolean(entry))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    },
    message: 'Ikasgaia prest dago.',
  };
}

export async function loadFirstPublishedLessonFlow(): Promise<LessonFlowLoadResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, lesson: null, message: 'Supabase ez dago prest; ezin da ikasgaia kargatu.' };
  }

  const lessonResult = await selectSupabaseRows<LessonRow>(lessonsTable, {
    select: '*',
    filters: [{ column: 'published', operator: 'eq', value: true }],
    order: [{ column: 'sort_order', ascending: true }],
    limit: 1,
  });

  if (lessonResult.error) {
    return { ok: false, lesson: null, message: lessonResult.error.message || 'Ezin izan da lehen ikasgaia kargatu.' };
  }

  const lessonBase = parseLesson((lessonResult.data?.[0] as LessonRow | undefined) ?? null);
  if (!lessonBase) {
    return { ok: false, lesson: null, message: 'Ez dago ikasgai argitaraturik.' };
  }

  return loadLessonFlowBySlug(lessonBase.slug);
}

export async function loadLessonUserProgress(userId: string, lessonId: number | string): Promise<LessonProgressLoadResult> {
  const { supabase } = await loadSupabaseModule();
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, progress: null, message: 'Supabase ez dago prest; ezin da aurrerapena kargatu.' };
  }

  const result = await supabase
    .from(lessonUserProgressTable)
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (result.error) {
    return {
      ok: false,
      progress: null,
      message: buildDbErrorMessage('Ezin izan da ikasgaiaren aurrerapena kargatu.', result.error),
    };
  }

  return {
    ok: true,
    progress: parseUserProgress((result.data as UserProgressRow | null) ?? null),
    message: 'Ikasgaiaren aurrerapena prest.',
  };
}

export async function markLessonInProgress(
  userId: string,
  lessonId: number | string,
  previousProgress: LessonUserProgress | null
): Promise<LessonProgressMutationResult> {
  const { supabase } = await loadSupabaseModule();
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, progress: null, message: 'Supabase ez dago prest; ezin da aurrerapena gorde.' };
  }

  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    lesson_id: lessonId,
    status: previousProgress?.status === 'completed' ? 'completed' : 'in_progress',
    attempts: previousProgress?.attempts ?? 0,
    correct_count: previousProgress?.correctCount ?? 0,
    wrong_count: previousProgress?.wrongCount ?? 0,
    correct_rate: previousProgress?.correctRate ?? 0,
    started_at: previousProgress?.startedAt ?? now,
    completed_at: previousProgress?.completedAt ?? null,
    last_seen_at: now,
  };

  const result = await supabase
    .from(lessonUserProgressTable)
    .upsert(payload, { onConflict: 'user_id,lesson_id' })
    .select('*')
    .maybeSingle();

  if (result.error) {
    return {
      ok: false,
      progress: null,
      message: buildDbErrorMessage('Ezin izan da ikasgaiaren aurrerapena eguneratu.', result.error),
    };
  }

  return {
    ok: true,
    progress: parseUserProgress((result.data as UserProgressRow | null) ?? null),
    message: 'Aurrerapena eguneratuta.',
  };
}

export async function recordLessonExerciseAttempt({
  userId,
  lessonId,
  exerciseId,
  selectedOptionId,
  isCorrect,
  feedbackRuleId = null,
}: LessonAttemptInput): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await loadSupabaseModule();
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, message: 'Supabase ez dago prest; ezin da saiakera gorde.' };
  }

  const result = await supabase.from(lessonUserExerciseAttemptsTable).insert({
    user_id: userId,
    lesson_id: lessonId,
    exercise_id: exerciseId,
    selected_option_id: selectedOptionId,
    is_correct: isCorrect,
    feedback_rule_id: feedbackRuleId,
  });

  if (result.error) {
    return {
      ok: false,
      message: buildDbErrorMessage('Ezin izan da ariketaren saiakera gorde.', result.error),
    };
  }

  return { ok: true, message: 'Saiakera gordeta.' };
}

export async function completeLessonProgress(
  userId: string,
  lessonId: number | string,
  stats: {
    attempts: number;
    correctCount: number;
    wrongCount: number;
  },
  previousProgress: LessonUserProgress | null
): Promise<LessonProgressMutationResult> {
  const { supabase } = await loadSupabaseModule();
  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, progress: null, message: 'Supabase ez dago prest; ezin da ikasgaia amaitutzat eman.' };
  }

  const now = new Date().toISOString();
  const totalAnswers = Math.max(0, stats.correctCount + stats.wrongCount);
  const correctRate = totalAnswers > 0 ? Math.round((stats.correctCount / totalAnswers) * 100) : 0;
  const payload = {
    user_id: userId,
    lesson_id: lessonId,
    status: 'completed',
    attempts: Math.max(previousProgress?.attempts ?? 0, stats.attempts),
    correct_count: stats.correctCount,
    wrong_count: stats.wrongCount,
    correct_rate: correctRate,
    started_at: previousProgress?.startedAt ?? now,
    completed_at: now,
    last_seen_at: now,
  };

  const result = await supabase
    .from(lessonUserProgressTable)
    .upsert(payload, { onConflict: 'user_id,lesson_id' })
    .select('*')
    .maybeSingle();

  if (result.error) {
    return {
      ok: false,
      progress: null,
      message: buildDbErrorMessage('Ezin izan da ikasgaiaren amaiera gorde.', result.error),
    };
  }

  return {
    ok: true,
    progress: parseUserProgress((result.data as UserProgressRow | null) ?? null),
    message: 'Ikasgaia amaituta.',
  };
}
