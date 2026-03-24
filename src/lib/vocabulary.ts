import { supabase } from '../supabaseClient';

export interface VocabularyItem {
  id: number | string;
  text: string;
  normalizedText: string;
  type: string;
  sortIndex: number;
}

export interface VocabularyCategory {
  key: string;
  label: string;
  icon: string | null;
  orderIndex: number;
  items: VocabularyItem[];
}

export interface VocabularyTopic {
  id: number | string;
  slug: string;
  title: string;
  categories: VocabularyCategory[];
  totalItems: number;
}

interface VocabularyRow {
  topic_id: number | string | null;
  topic_slug: string | null;
  topic_title: string | null;
  category_key: string | null;
  category_label: string | null;
  category_icon: string | null;
  category_order: number | null;
  study_item_id: number | string | null;
  item: string | null;
  item_norm: string | null;
  item_type: string | null;
  sort_index: number | null;
}

export interface VocabularyLoadResult {
  ok: boolean;
  topics: VocabularyTopic[];
  message: string;
}

let vocabularyCache: VocabularyLoadResult | null = null;
let vocabularyRequest: Promise<VocabularyLoadResult> | null = null;

const TOPIC_ITEMS_VIEW = 'v_topic_items';
const TOPIC_ITEMS_SELECT = [
  'topic_id',
  'topic_slug',
  'topic_title',
  'category_key',
  'category_label',
  'category_icon',
  'category_order',
  'study_item_id',
  'item',
  'item_norm',
  'item_type',
  'sort_index',
].join(', ');

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeOrder = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 100;
};

const normalizeSortIndex = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortCategories = (left: VocabularyCategory, right: VocabularyCategory): number =>
  left.orderIndex - right.orderIndex || left.label.localeCompare(right.label, 'eu');

const sortItems = (left: VocabularyItem, right: VocabularyItem): number =>
  left.sortIndex - right.sortIndex || left.text.localeCompare(right.text, 'eu');

export async function loadVocabularyTopics(): Promise<VocabularyLoadResult> {
  if (vocabularyCache) {
    return vocabularyCache;
  }

  if (vocabularyRequest) {
    return vocabularyRequest;
  }

  vocabularyRequest = (async (): Promise<VocabularyLoadResult> => {
  if (!supabase) {
    return {
      ok: false,
      topics: [],
      message: 'Supabase ez dago prest; ezin da hiztegia kargatu.',
    };
  }

  const { data, error } = await supabase
    .from(TOPIC_ITEMS_VIEW)
    .select(TOPIC_ITEMS_SELECT)
    .order('topic_title', { ascending: true })
    .order('category_order', { ascending: true })
    .order('sort_index', { ascending: true })
    .order('study_item_id', { ascending: true })
    .limit(5000);

  if (error || !data) {
    return {
      ok: false,
      topics: [],
      message: error?.message ?? 'Ezin izan da hiztegia kargatu.',
    };
  }

  const topicMap = new Map<string, VocabularyTopic>();

  for (const rawRow of data as unknown as VocabularyRow[]) {
    const row = rawRow as VocabularyRow;
    const topicSlug = normalizeText(row.topic_slug);
    const topicTitle = normalizeText(row.topic_title);
    const categoryKey = normalizeText(row.category_key);
    const itemText = normalizeText(row.item);

    if (!topicSlug || !topicTitle || !categoryKey || !itemText) {
      continue;
    }

    const topicId = row.topic_id ?? topicSlug;
    const categoryLabel = normalizeText(row.category_label) || categoryKey;
    const categoryOrder = normalizeOrder(row.category_order);
    const categoryIcon = normalizeText(row.category_icon) || null;
    const itemId = row.study_item_id ?? `${topicSlug}-${categoryKey}-${itemText}`;
    const itemNorm = normalizeText(row.item_norm) || itemText.toLocaleLowerCase('eu');
    const itemType = normalizeText(row.item_type) || 'generic';
    const itemSortIndex = normalizeSortIndex(row.sort_index);

    const topic =
      topicMap.get(topicSlug) ??
      (() => {
        const nextTopic: VocabularyTopic = {
          id: topicId,
          slug: topicSlug,
          title: topicTitle,
          categories: [],
          totalItems: 0,
        };
        topicMap.set(topicSlug, nextTopic);
        return nextTopic;
      })();

    let category = topic.categories.find((entry) => entry.key === categoryKey);
    if (!category) {
      category = {
        key: categoryKey,
        label: categoryLabel,
        icon: categoryIcon,
        orderIndex: categoryOrder,
        items: [],
      };
      topic.categories.push(category);
    }

    category.items.push({
      id: itemId,
      text: itemText,
      normalizedText: itemNorm,
      type: itemType,
      sortIndex: itemSortIndex,
    });
    topic.totalItems += 1;
  }

  const topics = Array.from(topicMap.values())
    .map((topic) => ({
      ...topic,
      categories: topic.categories
        .map((category) => ({
          ...category,
          items: [...category.items].sort(sortItems),
        }))
        .sort(sortCategories),
    }))
    .sort((left, right) => left.title.localeCompare(right.title, 'eu'));

  return {
    ok: true,
    topics,
    message: topics.length > 0 ? `${topics.length} gai kargatuta.` : 'Ez dago hiztegi edukirik oraindik.',
  };
  })();

  const result = await vocabularyRequest;
  vocabularyCache = result;
  vocabularyRequest = null;
  return result;
}

export function preloadVocabularyTopics(): void {
  void loadVocabularyTopics();
}

export function getVocabularyTopicsSnapshot(): VocabularyLoadResult | null {
  return vocabularyCache;
}

export function clearVocabularyTopicsCache(): void {
  vocabularyCache = null;
  vocabularyRequest = null;
}
