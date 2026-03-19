import { QUESTIONS_PER_LEVEL } from './constants';
import type { LevelQuestionSeed } from './constants';
import type {
  SynonymEntry,
  QuizQuestion,
  GameLevel,
  LevelRecord,
  LevelChallengeSuccess,
  LevelChallengeFailure,
  QuestionMemoryRecord,
} from './types';
import { uniqueNonEmptyStrings } from '../wordUtils';
import { buildEntryTerms, normalizeTextKey, sortEntries } from './parsing';

const shuffleWithRng = <T,>(items: T[], rng: () => number): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const pickWeightedEntries = <T,>(
  items: T[],
  count: number,
  weightOf: (item: T) => number,
  rng: () => number
): T[] => {
  const pool = [...items];
  const selected: T[] = [];

  while (pool.length > 0 && selected.length < count) {
    const weightedPool = pool.map((item) => Math.max(0.01, weightOf(item)));
    const totalWeight = weightedPool.reduce((sum, weight) => sum + weight, 0);
    let target = rng() * totalWeight;
    let chosenIndex = 0;

    for (let index = 0; index < pool.length; index += 1) {
      target -= weightedPool[index];
      if (target <= 0) {
        chosenIndex = index;
        break;
      }
    }

    selected.push(pool.splice(chosenIndex, 1)[0]);
  }

  return selected;
};

const buildLevelQuestionSeeds = (entries: SynonymEntry[], levelIndex: number): LevelQuestionSeed[] =>
  entries
    .filter((entry) => entry.levelOrder === levelIndex)
    .flatMap((entry) => {
      const terms = buildEntryTerms(entry);

      return terms
        .map((term) => {
          const answerTerms = terms.filter((candidate) => normalizeTextKey(candidate) !== normalizeTextKey(term));
          if (answerTerms.length === 0) return null;

          return {
            id: `${entry.id}::${normalizeTextKey(term)}`,
            promptWord: term,
            answerTerms,
            sourceEntry: entry,
          } satisfies LevelQuestionSeed;
        })
        .filter((seed): seed is LevelQuestionSeed => seed !== null);
    });

const buildSupportText = (entry: SynonymEntry): string => {
  if (entry.example) {
    return `Adibidea: ${entry.example}`;
  }
  if (entry.theme) {
    return `Gaia: ${entry.theme}`;
  }
  return 'Aukeratu hitz honen sinonimo egokiena.';
};

const buildPrompt = (word: string): string => `"${word}" hitzaren sinonimoa aukeratu.`;

const getDaysSinceSeen = (lastSeenAt: string | null): number => {
  if (!lastSeenAt) return 0;

  const lastSeenMs = Date.parse(lastSeenAt);
  if (Number.isNaN(lastSeenMs)) return 0;

  return Math.max(0, Math.floor((Date.now() - lastSeenMs) / (1000 * 60 * 60 * 24)));
};

const getQuestionMemory = (levelRecord: LevelRecord | null, questionId: string): QuestionMemoryRecord | null => {
  if (!levelRecord) return null;
  if (levelRecord.questionMemory?.[questionId]) return levelRecord.questionMemory[questionId];
  if (levelRecord.incorrectQuestionIds.includes(questionId)) {
    return {
      attempts: 1,
      correctCount: 0,
      incorrectCount: 1,
      correctStreak: 0,
      incorrectStreak: 1,
      masteryLevel: 0,
      lastResult: 'incorrect',
      lastSeenAt: levelRecord.lastPlayedAt,
    };
  }
  if (levelRecord.masteredQuestionIds.includes(questionId)) {
    return {
      attempts: 1,
      correctCount: 1,
      incorrectCount: 0,
      correctStreak: 1,
      incorrectStreak: 0,
      masteryLevel: 2,
      lastResult: 'correct',
      lastSeenAt: levelRecord.lastPlayedAt,
    };
  }
  return null;
};

const needsRecovery = (memory: QuestionMemoryRecord | null): boolean =>
  Boolean(memory && (memory.lastResult === 'incorrect' || memory.incorrectStreak > 0 || memory.masteryLevel <= 1));

const needsConsolidation = (memory: QuestionMemoryRecord | null): boolean =>
  Boolean(memory && !needsRecovery(memory) && (memory.masteryLevel <= 2 || memory.correctStreak <= 1));

const getPriorityWeight = (memory: QuestionMemoryRecord | null): number => {
  if (!memory) return 95;

  const spacingBoost = Math.min(18, getDaysSinceSeen(memory.lastSeenAt) * 3);

  if (memory.lastResult === 'incorrect') {
    return 160 + memory.incorrectStreak * 25 + Math.min(30, memory.incorrectCount * 4) + spacingBoost;
  }

  if (memory.masteryLevel <= 1) {
    return 120 + Math.min(24, memory.attempts * 4) + spacingBoost;
  }

  if (memory.masteryLevel === 2) {
    return 70 + spacingBoost;
  }

  if (memory.masteryLevel === 3) {
    return 42 + spacingBoost;
  }

  return 18 + spacingBoost;
};

const buildQuestionFromSeed = (
  seed: LevelQuestionSeed,
  allEntries: SynonymEntry[],
  rng: () => number
): QuizQuestion | null => {
  const correctAnswer = shuffleWithRng(seed.answerTerms, rng)[0];
  const forbidden = new Set([seed.promptWord, ...seed.answerTerms].map(normalizeTextKey));

  const distractorPool = uniqueNonEmptyStrings(
    allEntries.flatMap((candidate) => buildEntryTerms(candidate))
  ).filter((candidate) => !forbidden.has(normalizeTextKey(candidate)));

  if (distractorPool.length < 3) {
    return null;
  }

  const options = shuffleWithRng([correctAnswer, ...shuffleWithRng(distractorPool, rng).slice(0, 3)], rng);

  return {
    id: seed.id,
    word: seed.promptWord,
    prompt: buildPrompt(seed.promptWord),
    supportText: buildSupportText(seed.sourceEntry),
    correctAnswer,
    options,
    translation: seed.sourceEntry.translation,
    example: seed.sourceEntry.example,
  };
};

export const buildLevelChallenge = (
  entries: SynonymEntry[],
  level: GameLevel,
  levelRecord: LevelRecord | null = null
): LevelChallengeSuccess | LevelChallengeFailure => {
  if (entries.length === 0) {
    return {
      ok: false,
      message: 'Ez dago sinonimo bankurik kargatuta.',
    };
  }

  const rng = Math.random;
  const sortedEntries = sortEntries(entries);
  const levelSeeds = buildLevelQuestionSeeds(sortedEntries, level.index);
  const totalAvailableQuestions = levelSeeds.length;

  if (totalAvailableQuestions === 0) {
    return {
      ok: false,
      message: `${level.name} mailak ez du hitz esleiturik. Egiaztatu ${level.index} balioa duen group_number eremua.`,
    };
  }

  const masteredQuestionIds = new Set(levelRecord?.masteredQuestionIds ?? []);
  const incorrectQuestionIds = new Set(levelRecord?.incorrectQuestionIds ?? []);
  const batchSize = totalAvailableQuestions >= QUESTIONS_PER_LEVEL ? QUESTIONS_PER_LEVEL : totalAvailableQuestions;
  const recoveryEntries = levelSeeds.filter((seed) => needsRecovery(getQuestionMemory(levelRecord, seed.id)));
  const newEntries = levelSeeds.filter(
    (seed) => !masteredQuestionIds.has(seed.id) && !incorrectQuestionIds.has(seed.id) && !getQuestionMemory(levelRecord, seed.id)
  );
  const consolidationEntries = levelSeeds.filter((seed) => needsConsolidation(getQuestionMemory(levelRecord, seed.id)));
  const strongMasteredEntries = levelSeeds.filter((seed) => {
    const memory = getQuestionMemory(levelRecord, seed.id);
    return Boolean(memory && !needsRecovery(memory) && !needsConsolidation(memory));
  });

  const selectedRecovery = pickWeightedEntries(
    recoveryEntries,
    Math.min(batchSize, Math.max(4, Math.ceil(batchSize * 0.4)), recoveryEntries.length),
    (seed) => getPriorityWeight(getQuestionMemory(levelRecord, seed.id)),
    rng
  );
  const afterRecovery = batchSize - selectedRecovery.length;
  const remainingAfterRecoveryIds = new Set(selectedRecovery.map((seed) => seed.id));
  const selectedNew = pickWeightedEntries(
    newEntries.filter((seed) => !remainingAfterRecoveryIds.has(seed.id)),
    Math.min(afterRecovery, Math.min(3, newEntries.length)),
    () => 100,
    rng
  );
  const remainingAfterNewIds = new Set([...remainingAfterRecoveryIds, ...selectedNew.map((seed) => seed.id)]);
  const selectedConsolidation = pickWeightedEntries(
    consolidationEntries.filter((seed) => !remainingAfterNewIds.has(seed.id)),
    Math.min(batchSize - remainingAfterNewIds.size, Math.min(3, consolidationEntries.length)),
    (seed) => getPriorityWeight(getQuestionMemory(levelRecord, seed.id)),
    rng
  );
  const alreadySelected = new Set(
    [...selectedRecovery, ...selectedNew, ...selectedConsolidation].map((seed) => seed.id)
  );
  const fillerEntries = pickWeightedEntries(
    levelSeeds.filter((seed) => !alreadySelected.has(seed.id)),
    batchSize - alreadySelected.size,
    (seed) => {
      const memory = getQuestionMemory(levelRecord, seed.id);
      const baseWeight = getPriorityWeight(memory);
      return strongMasteredEntries.some((candidate) => candidate.id === seed.id) ? Math.min(baseWeight, 28) : baseWeight;
    },
    rng
  );
  const prioritizedSeeds = [...selectedRecovery, ...selectedNew, ...selectedConsolidation, ...fillerEntries];
  const questions: QuizQuestion[] = [];

  for (const seed of prioritizedSeeds) {
    const question = buildQuestionFromSeed(seed, sortedEntries, rng);
    if (!question) continue;

    questions.push(question);
    if (questions.length === batchSize) break;
  }

  if (questions.length !== batchSize) {
    return {
      ok: false,
      message: `${level.name} mailako hitzek ez dute nahikoa aukera osatzen. Gehitu sinonimo edo hitz gehiago bankuan.`,
    };
  }

  return {
    ok: true,
    questions,
    totalAvailableQuestions,
    message: null,
  };
};

export { buildLevelQuestionSeeds };
