import { lessonBlocksTable, lessonsTable, supabase } from '../supabaseClient';

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
  title: string | null;
  slug: string | null;
  section: string | null;
  topic: string | null;
  level: string | null;
  published: boolean | null;
  order_index: number | null;
  created_at: string | null;
}

interface LessonBlockRow {
  id: number | string | null;
  lesson_id: number | string | null;
  block_type: string | null;
  content: unknown;
  order_index: number | null;
  created_at: string | null;
}

const LESSON_SELECT = ['id', 'title', 'slug', 'section', 'topic', 'level', 'published', 'order_index', 'created_at'].join(', ');
const LESSON_BLOCK_SELECT = ['id', 'lesson_id', 'block_type', 'content', 'order_index', 'created_at'].join(', ');
const VALID_BLOCK_TYPES = new Set<LessonBlockType>(['definition', 'rule', 'example', 'tip']);

const lessonCache = new Map<string, LessonLoadResult>();
const lessonRequests = new Map<string, Promise<LessonLoadResult>>();
const lessonListCache = new Map<number, LessonListLoadResult>();
const lessonListRequests = new Map<number, Promise<LessonListLoadResult>>();

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toOrder = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function normalizeBlockType(value: unknown): LessonBlockType | null {
  const normalized = toText(value).toLowerCase() as LessonBlockType;
  return VALID_BLOCK_TYPES.has(normalized) ? normalized : null;
}

function extractBlockContent(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractBlockContent(item))
      .filter(Boolean)
      .join('\n');
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferredKeys = ['title', 'body', 'text', 'content', 'description', 'example', 'tip', 'rule', 'definition'];
    const orderedValues = [
      ...preferredKeys.map((key) => record[key]),
      ...Object.entries(record)
        .filter(([key]) => !preferredKeys.includes(key))
        .map(([, entryValue]) => entryValue),
    ];

    return orderedValues
      .map((entryValue) => extractBlockContent(entryValue))
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

function parseLesson(row: LessonRow): Omit<Lesson, 'blocks'> | null {
  const title = toText(row.title);
  const slug = toText(row.slug);
  if (!title || !slug || row.id === null || row.id === undefined) return null;

  return {
    id: row.id,
    title,
    slug,
    section: toText(row.section) || null,
    topic: toText(row.topic) || null,
    level: toText(row.level) || null,
    published: row.published !== false,
    orderIndex: toOrder(row.order_index),
    createdAt: row.created_at ?? null,
  };
}

function parseLessonSummary(row: LessonRow): LessonSummary | null {
  const lesson = parseLesson(row);
  if (!lesson) return null;
  return lesson;
}

function parseLessonBlock(row: LessonBlockRow): LessonBlock | null {
  const blockType = normalizeBlockType(row.block_type);
  const content = extractBlockContent(row.content);

  if (!blockType || !content || row.id === null || row.id === undefined || row.lesson_id === null || row.lesson_id === undefined) {
    return null;
  }

  return {
    id: row.id,
    lessonId: row.lesson_id,
    blockType,
    content,
    orderIndex: toOrder(row.order_index),
    createdAt: row.created_at ?? null,
  };
}

export async function loadLessonBySlug(slug: string): Promise<LessonLoadResult> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return {
      ok: false,
      lesson: null,
      message: 'Slug hutsik dago.',
    };
  }

  const cached = lessonCache.get(normalizedSlug);
  if (cached) return cached;

  const pending = lessonRequests.get(normalizedSlug);
  if (pending) return pending;

  const request = (async (): Promise<LessonLoadResult> => {
    if (!supabase) {
      return {
        ok: false,
        lesson: null,
        message: 'Supabase ez dago prest; ezin da ikasgaia kargatu.',
      };
    }

    const { data: lessonData, error: lessonError } = await supabase
      .from(lessonsTable)
      .select(LESSON_SELECT)
      .eq('slug', normalizedSlug)
      .eq('published', true)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (lessonError) {
      return {
        ok: false,
        lesson: null,
        message: lessonError.message || 'Ezin izan da ikasgaia kargatu.',
      };
    }

    const lesson = parseLesson((lessonData as LessonRow | null) ?? ({} as LessonRow));
    if (!lesson) {
      return {
        ok: false,
        lesson: null,
        message: 'Ez dago ikasgai argitaraturik slug horrekin.',
      };
    }

    const { data: blockData, error: blockError } = await supabase
      .from(lessonBlocksTable)
      .select(LESSON_BLOCK_SELECT)
      .eq('lesson_id', lesson.id)
      .order('order_index', { ascending: true })
      .order('id', { ascending: true });

    if (blockError) {
      return {
        ok: false,
        lesson: null,
        message: blockError.message || 'Ezin izan dira ikasgai-blokeak kargatu.',
      };
    }

    const blocks = ((blockData ?? []) as LessonBlockRow[])
      .map(parseLessonBlock)
      .filter((entry): entry is LessonBlock => Boolean(entry))
      .sort((left, right) => left.orderIndex - right.orderIndex);

    return {
      ok: true,
      lesson: {
        ...lesson,
        blocks,
      },
      message: blocks.length > 0 ? `${blocks.length} bloke kargatuta.` : 'Ikasgaia kargatuta dago, baina oraindik ez du blokerik.',
    };
  })();

  lessonRequests.set(normalizedSlug, request);
  const result = await request;
  lessonRequests.delete(normalizedSlug);
  lessonCache.set(normalizedSlug, result);
  return result;
}

export async function loadFirstPublishedLesson(): Promise<LessonLoadResult> {
  if (!supabase) {
    return {
      ok: false,
      lesson: null,
      message: 'Supabase ez dago prest; ezin da ikasgaia kargatu.',
    };
  }

  const { data: lessonData, error: lessonError } = await supabase
    .from(lessonsTable)
    .select(LESSON_SELECT)
    .eq('published', true)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (lessonError) {
    return {
      ok: false,
      lesson: null,
      message: lessonError.message || 'Ezin izan da lehen ikasgaia kargatu.',
    };
  }

  const lesson = parseLesson((lessonData as LessonRow | null) ?? ({} as LessonRow));
  if (!lesson) {
    return {
      ok: false,
      lesson: null,
      message: 'Ez dago ikasgai argitaraturik.',
    };
  }

  return loadLessonBySlug(lesson.slug);
}

export async function loadPublishedLessons(limit = 10): Promise<LessonListLoadResult> {
  const normalizedLimit = Math.max(1, limit);
  const cached = lessonListCache.get(normalizedLimit);
  if (cached) return cached;

  const pending = lessonListRequests.get(normalizedLimit);
  if (pending) return pending;

  const request = (async (): Promise<LessonListLoadResult> => {
    if (!supabase) {
      return {
        ok: false,
        lessons: [],
        message: 'Supabase ez dago prest; ezin dira ikasgaiak kargatu.',
      };
    }

    const { data, error } = await supabase
      .from(lessonsTable)
      .select(LESSON_SELECT)
      .eq('published', true)
      .order('order_index', { ascending: true })
      .order('id', { ascending: true })
      .limit(normalizedLimit);

    if (error || !data) {
      return {
        ok: false,
        lessons: [],
        message: error?.message || 'Ezin izan dira ikasgaiak kargatu.',
      };
    }

    const lessons = (data as LessonRow[])
      .map(parseLessonSummary)
      .filter((entry): entry is LessonSummary => Boolean(entry))
      .sort((left, right) => left.orderIndex - right.orderIndex);

    return {
      ok: true,
      lessons,
      message: lessons.length > 0 ? `${lessons.length} ikasgai kargatuta.` : 'Ez dago ikasgai argitaraturik.',
    };
  })();

  lessonListRequests.set(normalizedLimit, request);
  const result = await request;
  lessonListRequests.delete(normalizedLimit);
  lessonListCache.set(normalizedLimit, result);
  return result;
}

export function getLessonSnapshot(slug: string): LessonLoadResult | null {
  return lessonCache.get(slug.trim()) ?? null;
}

export function clearLessonCache(slug?: string): void {
  if (slug) {
    lessonCache.delete(slug.trim());
    lessonRequests.delete(slug.trim());
    return;
  }

  lessonCache.clear();
  lessonRequests.clear();
  lessonListCache.clear();
  lessonListRequests.clear();
}
