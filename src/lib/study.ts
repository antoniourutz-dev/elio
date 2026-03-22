import type { SynonymEntry } from './types';
import { buildEntryTerms, normalizeTextKey } from './parsing';

export type StudyRating = 'again' | 'hard' | 'good' | 'easy';
export type StudyCardStatus = 'new' | 'learning' | 'review' | 'relearning';
export interface StudySelectionOptions {
  lastSemanticGroup?: string | null;
  dailyNewLimit?: number;
  newCardsStudiedToday?: number;
  sessionReviewLimit?: number;
  sessionReviewsCompleted?: number;
}

export interface StudyDailyProgress {
  dateKey: string;
  newCardsStudied: number;
  reviewsCompleted: number;
}

export interface StudyQueueSummary {
  dueCount: number;
  newCount: number;
  totalCount: number;
  dueRemainingTotal: number;
  newRemainingTotal: number;
}

export interface StudyCardSeed {
  id: string;
  promptWord: string;
  answerWord: string;
  semanticGroup: string;
  theme: string | null;
  translation: string | null;
  example: string | null;
}

export interface StudyCard extends StudyCardSeed {
  status: StudyCardStatus;
  stepIndex: number;
  intervalDays: number;
  ease: number;
  dueAt: string;
  lastReviewedAt: string | null;
  lastRating: StudyRating | null;
  lapses: number;
  reps: number;
  leech: boolean;
}

const STUDY_STORAGE_VERSION = 1;
const STUDY_STORAGE_PREFIX = 'elio-study-srs';
const STUDY_PROGRESS_STORAGE_PREFIX = 'elio-study-progress';
const LEARNING_STEPS_MINUTES = [2, 12, 24 * 60] as const;
const RELEARNING_STEPS_MINUTES = [10, 24 * 60] as const;
const DEFAULT_EASE = 2.3;
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
export const DEFAULT_STUDY_DAILY_NEW_LIMIT = 12;
export const DEFAULT_STUDY_SESSION_REVIEW_LIMIT = 50;

interface StoredStudyDeck {
  version: number;
  cards: StudyCard[];
}

interface StoredStudyProgress {
  version: number;
  progress: StudyDailyProgress;
}

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const roundEase = (value: number): number => Math.round(value * 100) / 100;

const addMinutes = (date: Date, minutes: number): string => new Date(date.getTime() + minutes * 60 * 1000).toISOString();
const addDays = (date: Date, days: number): string => new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getStorageKey = (playerId: string, levelId: string): string => `${STUDY_STORAGE_PREFIX}:v${STUDY_STORAGE_VERSION}:${playerId}:${levelId}`;
const getProgressStorageKey = (playerId: string, levelId: string): string =>
  `${STUDY_PROGRESS_STORAGE_PREFIX}:v${STUDY_STORAGE_VERSION}:${playerId}:${levelId}`;

const isDue = (card: StudyCard, now: Date): boolean => {
  if (card.status === 'new') return false;

  const dueMs = Date.parse(card.dueAt);
  return Number.isFinite(dueMs) && dueMs <= now.getTime();
};

const toStudyCard = (seed: StudyCardSeed, now: Date, stored?: Partial<StudyCard> | null): StudyCard => ({
  ...seed,
  status:
    stored?.status === 'learning' || stored?.status === 'review' || stored?.status === 'relearning' || stored?.status === 'new'
      ? stored.status
      : 'new',
  stepIndex: Math.max(0, Math.floor(Number(stored?.stepIndex ?? 0))),
  intervalDays: Math.max(0, Number(stored?.intervalDays ?? 0)),
  ease: roundEase(clamp(Number(stored?.ease ?? DEFAULT_EASE), MIN_EASE, MAX_EASE)),
  dueAt: typeof stored?.dueAt === 'string' ? stored.dueAt : now.toISOString(),
  lastReviewedAt: typeof stored?.lastReviewedAt === 'string' ? stored.lastReviewedAt : null,
  lastRating:
    stored?.lastRating === 'again' || stored?.lastRating === 'hard' || stored?.lastRating === 'good' || stored?.lastRating === 'easy'
      ? stored.lastRating
      : null,
  lapses: Math.max(0, Math.floor(Number(stored?.lapses ?? 0))),
  reps: Math.max(0, Math.floor(Number(stored?.reps ?? 0))),
  leech: Boolean(stored?.leech),
});

const sortByPriority = (cards: StudyCard[], now: Date): StudyCard[] =>
  [...cards].sort((left, right) => {
    const leftDue = Date.parse(left.dueAt);
    const rightDue = Date.parse(right.dueAt);

    if (left.status !== right.status) {
      const priority = (status: StudyCardStatus): number => {
        if (status === 'learning') return 0;
        if (status === 'relearning') return 1;
        if (status === 'review') return 2;
        return 3;
      };

      return priority(left.status) - priority(right.status);
    }

    if (isDue(left, now) && isDue(right, now) && leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    if (left.reps !== right.reps) return left.reps - right.reps;
    return left.id.localeCompare(right.id, 'eu');
  });

const shuffleCards = (cards: StudyCard[]): StudyCard[] => {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const getSelectionConfig = (options: StudySelectionOptions = {}) => ({
  lastSemanticGroup: options.lastSemanticGroup ?? null,
  dailyNewLimit: Math.max(0, Math.floor(options.dailyNewLimit ?? DEFAULT_STUDY_DAILY_NEW_LIMIT)),
  newCardsStudiedToday: Math.max(0, Math.floor(options.newCardsStudiedToday ?? 0)),
  sessionReviewLimit: Math.max(0, Math.floor(options.sessionReviewLimit ?? DEFAULT_STUDY_SESSION_REVIEW_LIMIT)),
  sessionReviewsCompleted: Math.max(0, Math.floor(options.sessionReviewsCompleted ?? 0)),
});

const getDueBuckets = (cards: StudyCard[], now: Date): [StudyCard[], StudyCard[]] => {
  const activeDue = sortByPriority(
    cards.filter((card) => (card.status === 'learning' || card.status === 'relearning') && isDue(card, now)),
    now
  );
  const reviewDue = sortByPriority(cards.filter((card) => card.status === 'review' && isDue(card, now)), now);

  return [activeDue, reviewDue];
};

const createEmptyDailyProgress = (now: Date): StudyDailyProgress => ({
  dateKey: toDateKey(now),
  newCardsStudied: 0,
  reviewsCompleted: 0,
});

const normalizeDailyProgress = (progress: Partial<StudyDailyProgress> | null | undefined, now: Date): StudyDailyProgress => {
  const empty = createEmptyDailyProgress(now);

  if (!progress || progress.dateKey !== empty.dateKey) {
    return empty;
  }

  return {
    dateKey: empty.dateKey,
    newCardsStudied: Math.max(0, Math.floor(Number(progress.newCardsStudied ?? 0))),
    reviewsCompleted: Math.max(0, Math.floor(Number(progress.reviewsCompleted ?? 0))),
  };
};

const pickWithoutRepeatingGroup = (
  buckets: StudyCard[][],
  lastSemanticGroup: string | null
): StudyCard | null => {
  if (!lastSemanticGroup) {
    for (const bucket of buckets) {
      if (bucket.length > 0) return bucket[0];
    }
    return null;
  }

  for (const bucket of buckets) {
    const candidate = bucket.find((card) => card.semanticGroup !== lastSemanticGroup);
    if (candidate) return candidate;
  }

  for (const bucket of buckets) {
    if (bucket.length > 0) return bucket[0];
  }

  return null;
};

export const buildStudyCardSeeds = (entries: SynonymEntry[], levelIndex: number): StudyCardSeed[] =>
  entries
    .filter((entry) => entry.levelOrder === levelIndex)
    .flatMap((entry) => {
      const terms = buildEntryTerms(entry);

      return terms.flatMap((promptWord) =>
        terms
          .filter((candidate) => normalizeTextKey(candidate) !== normalizeTextKey(promptWord))
          .map((answerWord) => ({
            id: `${entry.id}::${normalizeTextKey(promptWord)}::${normalizeTextKey(answerWord)}`,
            promptWord,
            answerWord,
            semanticGroup: String(entry.id),
            theme: entry.theme ?? null,
            translation: entry.translation ?? null,
            example: entry.example ?? null,
          }))
      );
    });

export const loadStudyDeck = (playerId: string, levelId: string, seeds: StudyCardSeed[], now = new Date()): StudyCard[] => {
  const storedMap = new Map<string, Partial<StudyCard>>();

  if (canUseStorage()) {
    try {
      const raw = window.localStorage.getItem(getStorageKey(playerId, levelId));
      if (raw) {
        const parsed = JSON.parse(raw) as StoredStudyDeck;
        if (parsed?.version === STUDY_STORAGE_VERSION && Array.isArray(parsed.cards)) {
          for (const card of parsed.cards) {
            if (card && typeof card.id === 'string') {
              storedMap.set(card.id, card);
            }
          }
        }
      }
    } catch {
      // Ignore malformed persisted study data.
    }
  }

  return seeds.map((seed) => toStudyCard(seed, now, storedMap.get(seed.id)));
};

export const saveStudyDeck = (playerId: string, levelId: string, cards: StudyCard[]): void => {
  if (!canUseStorage()) return;

  try {
    const payload: StoredStudyDeck = {
      version: STUDY_STORAGE_VERSION,
      cards,
    };

    window.localStorage.setItem(getStorageKey(playerId, levelId), JSON.stringify(payload));
  } catch {
    // Ignore local persistence failures.
  }
};

export const loadStudyDailyProgress = (playerId: string, levelId: string, now = new Date()): StudyDailyProgress => {
  if (!canUseStorage()) {
    return createEmptyDailyProgress(now);
  }

  try {
    const raw = window.localStorage.getItem(getProgressStorageKey(playerId, levelId));
    if (!raw) {
      return createEmptyDailyProgress(now);
    }

    const parsed = JSON.parse(raw) as StoredStudyProgress;
    if (parsed?.version !== STUDY_STORAGE_VERSION) {
      return createEmptyDailyProgress(now);
    }

    return normalizeDailyProgress(parsed.progress, now);
  } catch {
    return createEmptyDailyProgress(now);
  }
};

export const saveStudyDailyProgress = (playerId: string, levelId: string, progress: StudyDailyProgress): void => {
  if (!canUseStorage()) return;

  try {
    const payload: StoredStudyProgress = {
      version: STUDY_STORAGE_VERSION,
      progress,
    };

    window.localStorage.setItem(getProgressStorageKey(playerId, levelId), JSON.stringify(payload));
  } catch {
    // Ignore local persistence failures.
  }
};

export const recordStudyDailyProgress = (
  progress: StudyDailyProgress,
  cardStatus: StudyCardStatus,
  now = new Date()
): StudyDailyProgress => {
  const normalized = normalizeDailyProgress(progress, now);

  if (cardStatus === 'new') {
    return {
      ...normalized,
      newCardsStudied: normalized.newCardsStudied + 1,
    };
  }

  return {
    ...normalized,
    reviewsCompleted: normalized.reviewsCompleted + 1,
  };
};

function handleLearning(card: StudyCard, rating: StudyRating, now: Date): StudyCard {
  if (rating === 'again') {
    return {
      ...card,
      status: 'learning',
      stepIndex: 0,
      dueAt: addMinutes(now, 2),
    };
  }

  if (rating === 'hard') {
    return {
      ...card,
      status: 'learning',
      dueAt: addMinutes(now, 6),
    };
  }

  if (rating === 'easy') {
    return {
      ...card,
      status: 'review',
      stepIndex: 0,
      intervalDays: 3,
      ease: roundEase(clamp(card.ease || DEFAULT_EASE, MIN_EASE, MAX_EASE)),
      dueAt: addDays(now, 3),
    };
  }

  const nextStep = (card.stepIndex || 0) + 1;

  if (nextStep >= LEARNING_STEPS_MINUTES.length) {
    return {
      ...card,
      status: 'review',
      stepIndex: 0,
      intervalDays: 1,
      ease: roundEase(clamp(card.ease || DEFAULT_EASE, MIN_EASE, MAX_EASE)),
      dueAt: addDays(now, 1),
    };
  }

  return {
    ...card,
    status: 'learning',
    stepIndex: nextStep,
    dueAt: addMinutes(now, LEARNING_STEPS_MINUTES[nextStep]),
  };
}

function handleReview(card: StudyCard, rating: StudyRating, now: Date): StudyCard {
  const prev = Math.max(1, card.intervalDays || 1);
  let ease = roundEase(clamp(card.ease || DEFAULT_EASE, MIN_EASE, MAX_EASE));
  let nextInterval = prev;

  if (rating === 'again') {
    const lapses = (card.lapses || 0) + 1;
    ease = roundEase(clamp(ease - 0.2, MIN_EASE, MAX_EASE));

    return {
      ...card,
      ease,
      lapses,
      leech: lapses >= 4,
      status: 'relearning',
      stepIndex: 0,
      intervalDays: Math.max(0.125, prev * 0.15),
      dueAt: addMinutes(now, 10),
    };
  }

  if (rating === 'hard') {
    ease = roundEase(clamp(ease - 0.05, MIN_EASE, MAX_EASE));
    nextInterval = Math.max(1, prev * 1.2);
  } else if (rating === 'good') {
    nextInterval = Math.max(1, prev * ease);
  } else if (rating === 'easy') {
    ease = roundEase(clamp(ease + 0.05, MIN_EASE, MAX_EASE));
    nextInterval = Math.max(2, prev * (ease + 0.25));
  }

  return {
    ...card,
    status: 'review',
    ease,
    intervalDays: Math.round(nextInterval),
    dueAt: addDays(now, Math.round(nextInterval)),
  };
}

function handleRelearning(card: StudyCard, rating: StudyRating, now: Date): StudyCard {
  if (rating === 'again') {
    return {
      ...card,
      stepIndex: 0,
      dueAt: addMinutes(now, 10),
    };
  }

  if (rating === 'hard') {
    return {
      ...card,
      dueAt: addMinutes(now, 30),
    };
  }

  if (rating === 'easy') {
    const intervalDays = Math.max(2, Math.round((card.intervalDays || 1) * 1.5));
    return {
      ...card,
      status: 'review',
      stepIndex: 0,
      intervalDays,
      dueAt: addDays(now, intervalDays),
    };
  }

  const nextStep = (card.stepIndex || 0) + 1;

  if (nextStep >= RELEARNING_STEPS_MINUTES.length) {
    const intervalDays = Math.max(1, Math.round(card.intervalDays || 1));
    return {
      ...card,
      status: 'review',
      stepIndex: 0,
      intervalDays,
      dueAt: addDays(now, intervalDays),
    };
  }

  return {
    ...card,
    status: 'relearning',
    stepIndex: nextStep,
    dueAt: addMinutes(now, RELEARNING_STEPS_MINUTES[nextStep]),
  };
}

export const reviewStudyCard = (card: StudyCard, rating: StudyRating, now = new Date()): StudyCard => {
  const baseCard: StudyCard = {
    ...card,
    reps: card.reps + 1,
    lastRating: rating,
    lastReviewedAt: now.toISOString(),
  };

  if (baseCard.status === 'new' || baseCard.status === 'learning') {
    return handleLearning(baseCard, rating, now);
  }

  if (baseCard.status === 'review') {
    return handleReview(baseCard, rating, now);
  }

  if (baseCard.status === 'relearning') {
    return handleRelearning(baseCard, rating, now);
  }

  return baseCard;
};

export const selectNextStudyCard = (
  cards: StudyCard[],
  now = new Date(),
  options: StudySelectionOptions = {}
): StudyCard | null => {
  const config = getSelectionConfig(options);
  const [activeDue, reviewDue] = getDueBuckets(cards, now);
  const dueRemaining = Math.max(0, config.sessionReviewLimit - config.sessionReviewsCompleted);
  const newRemaining = Math.max(0, config.dailyNewLimit - config.newCardsStudiedToday);

  if (dueRemaining > 0) {
    const dueCandidate = pickWithoutRepeatingGroup(
      [activeDue.slice(0, dueRemaining), reviewDue.slice(0, Math.max(0, dueRemaining - activeDue.length))],
      config.lastSemanticGroup
    );
    if (dueCandidate) return dueCandidate;
  }

  if (newRemaining > 0) {
    return pickWithoutRepeatingGroup([shuffleCards(cards.filter((card) => card.status === 'new').slice(0, newRemaining))], config.lastSemanticGroup);
  }

  return null;
};

export const getStudyQueueSummary = (
  cards: StudyCard[],
  now = new Date(),
  options: StudySelectionOptions = {}
): StudyQueueSummary => {
  const config = getSelectionConfig(options);
  const [activeDue, reviewDue] = getDueBuckets(cards, now);
  const dueRemainingTotal = activeDue.length + reviewDue.length;
  const newRemainingTotal = cards.filter((card) => card.status === 'new').length;
  const dueCount = Math.min(dueRemainingTotal, Math.max(0, config.sessionReviewLimit - config.sessionReviewsCompleted));
  const newCount = Math.min(newRemainingTotal, Math.max(0, config.dailyNewLimit - config.newCardsStudiedToday));

  return {
    dueCount,
    newCount,
    totalCount: dueCount + newCount,
    dueRemainingTotal,
    newRemainingTotal,
  };
};

export const countAvailableStudyCards = (cards: StudyCard[], now = new Date(), options: StudySelectionOptions = {}): number =>
  getStudyQueueSummary(cards, now, options).totalCount;

export const getNextStudyDueAt = (cards: StudyCard[]): string | null => {
  const futureCards = cards
    .filter((card) => card.status !== 'new')
    .map((card) => Date.parse(card.dueAt))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (futureCards.length === 0) return null;
  return new Date(futureCards[0]).toISOString();
};
