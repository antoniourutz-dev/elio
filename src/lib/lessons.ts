import { grammarTopicsTable, isSupabaseConfigured, lessonsTable } from './supabaseConfig';
import { selectSupabaseRows } from './supabaseRest';
import { loadFirstPublishedLessonFlow, loadLessonFlowBySlug } from './lessonFlow';

export type LessonBlockType = 'definition' | 'rule' | 'example' | 'tip';

export interface LessonBlock {
  id: number | string;
  lessonId: number | string;
  blockType: LessonBlockType;
  content: string;
  orderIndex: number;
  createdAt: string | null;
}

export interface Lesson {
  id: number | string;
  title: string;
  slug: string;
  section: string | null;
  topic: string | null;
  level: string | null;
  published: boolean;
  orderIndex: number;
  createdAt: string | null;
  blocks: LessonBlock[];
}

export interface LessonLoadResult {
  ok: boolean;
  lesson: Lesson | null;
  message: string;
}

export interface LessonSummary {
  id: number | string;
  title: string;
  slug: string;
  section: string | null;
  topic: string | null;
  level: string | null;
  published: boolean;
  orderIndex: number;
  createdAt: string | null;
}

export interface LessonListLoadResult {
  ok: boolean;
  lessons: LessonSummary[];
  message: string;
}

interface LessonRow {
  id: number | string | null;
  topic_id: number | string | null;
  slug: string | null;
  title_eu: string | null;
  subtitle_eu: string | null;
  level: string | null;
  published: boolean | null;
  sort_order: number | null;
  created_at: string | null;
}

interface TopicRow {
  id: number | string | null;
  title_eu: string | null;
}

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const toNullableText = (value: unknown): string | null => {
  const text = toText(value);
  return text || null;
};
const toOrder = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function parseLessonSummary(row: LessonRow, topicsById: Map<number | string, string>): LessonSummary | null {
  if (row.id === null || row.id === undefined) return null;
  const title = toText(row.title_eu);
  const slug = toText(row.slug);
  if (!title || !slug) return null;

  return {
    id: row.id,
    title,
    slug,
    section: row.topic_id !== null && row.topic_id !== undefined ? topicsById.get(row.topic_id) ?? null : null,
    topic: toNullableText(row.subtitle_eu),
    level: toNullableText(row.level)?.toUpperCase() ?? null,
    published: row.published !== false,
    orderIndex: toOrder(row.sort_order),
    createdAt: row.created_at ?? null,
  };
}

function buildLegacyLessonFromSummary(summary: LessonSummary): Lesson {
  return {
    ...summary,
    blocks: [],
  };
}

export async function loadLessonBySlug(slug: string): Promise<LessonLoadResult> {
  const result = await loadLessonFlowBySlug(slug);
  if (!result.ok || !result.lesson) {
    return {
      ok: false,
      lesson: null,
      message: result.message,
    };
  }

  return {
    ok: true,
    lesson: buildLegacyLessonFromSummary({
      id: result.lesson.id,
      title: result.lesson.titleEu,
      slug: result.lesson.slug,
      section: result.lesson.topic?.titleEu ?? null,
      topic: result.lesson.subtitleEu,
      level: result.lesson.level?.toUpperCase() ?? null,
      published: result.lesson.published,
      orderIndex: result.lesson.sortOrder,
      createdAt: null,
    }),
    message: result.message,
  };
}

export async function loadFirstPublishedLesson(): Promise<LessonLoadResult> {
  const result = await loadFirstPublishedLessonFlow();
  if (!result.ok || !result.lesson) {
    return {
      ok: false,
      lesson: null,
      message: result.message,
    };
  }

  return {
    ok: true,
    lesson: buildLegacyLessonFromSummary({
      id: result.lesson.id,
      title: result.lesson.titleEu,
      slug: result.lesson.slug,
      section: result.lesson.topic?.titleEu ?? null,
      topic: result.lesson.subtitleEu,
      level: result.lesson.level?.toUpperCase() ?? null,
      published: result.lesson.published,
      orderIndex: result.lesson.sortOrder,
      createdAt: null,
    }),
    message: result.message,
  };
}

export async function loadPublishedLessons(limit = 10): Promise<LessonListLoadResult> {
  const normalizedLimit = Math.max(1, limit);

  if (!isSupabaseConfigured) {
    return {
      ok: false,
      lessons: [],
      message: 'Supabase ez dago prest; ezin dira ikasgaiak kargatu.',
    };
  }

  const lessonResult = await selectSupabaseRows<LessonRow>(lessonsTable, {
    select: 'id, topic_id, slug, title_eu, subtitle_eu, level, published, sort_order, created_at',
    filters: [{ column: 'published', operator: 'eq', value: true }],
    order: [{ column: 'sort_order', ascending: true }],
    limit: normalizedLimit,
  });

  if (lessonResult.error || !lessonResult.data) {
    return {
      ok: false,
      lessons: [],
      message: lessonResult.error?.message || 'Ezin izan dira ikasgaiak kargatu.',
    };
  }

  const lessonRows = lessonResult.data as LessonRow[];
  const topicIds = Array.from(new Set(lessonRows.map((row) => row.topic_id).filter((value): value is number | string => value !== null && value !== undefined)));
  const topicResult = topicIds.length > 0
    ? await selectSupabaseRows<TopicRow>(grammarTopicsTable, {
        select: 'id, title_eu',
        filters: [{ column: 'id', operator: 'in', value: topicIds }],
      })
    : { data: [] as TopicRow[], error: null };

  if (topicResult.error) {
    return {
      ok: false,
      lessons: [],
      message: topicResult.error.message || 'Ezin izan dira ikasgaiaren gaiak kargatu.',
    };
  }

  const topicsById = new Map(
    ((topicResult.data ?? []) as TopicRow[])
      .filter((row) => row.id !== null && row.id !== undefined && toText(row.title_eu))
      .map((row) => [row.id as number | string, toText(row.title_eu)] as const)
  );

  const lessons = lessonRows
    .map((row) => parseLessonSummary(row, topicsById))
    .filter((entry): entry is LessonSummary => Boolean(entry))
    .sort((left, right) => left.orderIndex - right.orderIndex);

  return {
    ok: true,
    lessons,
    message: lessons.length > 0 ? `${lessons.length} ikasgai kargatuta.` : 'Ez dago ikasgai argitaraturik.',
  };
}
