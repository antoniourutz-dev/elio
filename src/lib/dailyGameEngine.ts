import type {
  DailyQuestion,
  EroglificoDailyQuestion,
  EroglificoEntry,
  GameWord,
  OrthographyDailyQuestion,
  OrthographyExercise,
  SpellingDailyQuestion,
  SynonymDailyQuestion,
} from '../appTypes';
import { uniqueNonEmptyStrings } from '../wordUtils';
import { buildEntryTerms, normalizeTextKey } from './parsing';
import type { SynonymEntry } from './types';

const DAILY_SPELLING_COUNT = 3;
const DAILY_ORTHOGRAPHY_COUNT = 2;
const ORTHOGRAPHY_PRACTICE_COUNT = 10;
const ORTHOGRAPHY_PRACTICE_ORTHOGRAPHY_COUNT = 5;
const ORTHOGRAPHY_PRACTICE_SPELLING_COUNT = 5;
const DAILY_SYNONYM_COUNT = 5;
const DAILY_HIEROGLYPH_COUNT = 2;
const DAILY_TOTAL_QUESTIONS =
  DAILY_SPELLING_COUNT + DAILY_ORTHOGRAPHY_COUNT + DAILY_SYNONYM_COUNT + DAILY_HIEROGLYPH_COUNT;

function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function makeLcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function buildSpellingQuestion(word: GameWord): SpellingDailyQuestion {
  return {
    type: 'spelling',
    id: `spell-${word.id}`,
    displayText: word.text,
    correctAnswer: word.egoera ? 'ZUZEN' : 'OKER',
  };
}

function buildOrthographyQuestion(exercise: OrthographyExercise): OrthographyDailyQuestion {
  const toWords = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    type: 'orthography',
    id: `orth-${exercise.id}`,
    exerciseNumber: exercise.exerciseNumber,
    options: [
      { key: 'A', text: exercise.optionA, words: toWords(exercise.optionA) },
      { key: 'B', text: exercise.optionB, words: toWords(exercise.optionB) },
      { key: 'C', text: exercise.optionC, words: toWords(exercise.optionC) },
    ],
    correctAnswer: exercise.solution,
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
  const distractorPool = uniqueNonEmptyStrings(allEntries.flatMap((candidate) => buildEntryTerms(candidate))).filter(
    (term) => !forbidden.has(normalizeTextKey(term))
  );

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

function buildHieroglyphQuestion(entry: EroglificoEntry): EroglificoDailyQuestion | null {
  const imageUrl = entry.imagePath.trim();
  if (!imageUrl) return null;

  const acceptedAnswers = uniqueNonEmptyStrings([
    entry.solution,
    entry.normalizedSolution ?? '',
    ...(entry.alternativeAnswers ?? []),
  ]).map((item) => normalizeTextKey(item));

  return {
    type: 'eroglifico',
    id: `ero-${entry.id}`,
    imageUrl,
    clue: entry.clue,
    correctAnswer: entry.solution,
    acceptedAnswers,
  };
}

export function buildDailyGame(
  dayKey: string,
  gameWords: GameWord[],
  orthographyExercises: OrthographyExercise[],
  synonymEntries: SynonymEntry[],
  hieroglyphs: EroglificoEntry[]
): DailyQuestion[] {
  const rng = makeLcg(fnv1a(dayKey));
  const spellingQuestions = shuffleWithRng(gameWords, rng).slice(0, DAILY_SPELLING_COUNT).map(buildSpellingQuestion);
  const orthographyQuestions = shuffleWithRng(orthographyExercises, rng)
    .slice(0, DAILY_ORTHOGRAPHY_COUNT)
    .map(buildOrthographyQuestion);

  const synonymQuestions: SynonymDailyQuestion[] = [];
  for (const entry of shuffleWithRng(synonymEntries, rng)) {
    if (synonymQuestions.length >= DAILY_SYNONYM_COUNT) break;
    const question = buildSynonymQuestion(entry, synonymEntries, rng);
    if (question) synonymQuestions.push(question);
  }

  const hieroglyphQuestions = shuffleWithRng(hieroglyphs, rng)
    .slice(0, DAILY_HIEROGLYPH_COUNT)
    .map(buildHieroglyphQuestion)
    .filter((question): question is EroglificoDailyQuestion => Boolean(question));

  const questions: DailyQuestion[] = [];
  const languageQuestions: DailyQuestion[] = [];

  if (spellingQuestions[0]) languageQuestions.push(spellingQuestions[0]);
  if (synonymQuestions[0]) languageQuestions.push(synonymQuestions[0]);
  if (orthographyQuestions[0]) languageQuestions.push(orthographyQuestions[0]);
  if (synonymQuestions[1]) languageQuestions.push(synonymQuestions[1]);
  if (spellingQuestions[1]) languageQuestions.push(spellingQuestions[1]);
  if (synonymQuestions[2]) languageQuestions.push(synonymQuestions[2]);
  if (orthographyQuestions[1]) languageQuestions.push(orthographyQuestions[1]);
  if (synonymQuestions[3]) languageQuestions.push(synonymQuestions[3]);
  if (spellingQuestions[2]) languageQuestions.push(spellingQuestions[2]);
  if (synonymQuestions[4]) languageQuestions.push(synonymQuestions[4]);

  questions.push(...languageQuestions);

  if (hieroglyphQuestions[0]) {
    questions.splice(Math.min(4, questions.length), 0, hieroglyphQuestions[0]);
  }
  if (hieroglyphQuestions[1]) {
    questions.splice(Math.min(9, questions.length), 0, hieroglyphQuestions[1]);
  }

  return questions.slice(0, DAILY_TOTAL_QUESTIONS);
}

export function buildOrthographyPracticeGame(
  dayKey: string,
  exercises: OrthographyExercise[],
  gameWords: GameWord[]
): DailyQuestion[] {
  const rng = makeLcg(fnv1a(`${dayKey}-orthography-practice`));
  const orthographyQuestions = shuffleWithRng(exercises, rng)
    .slice(0, ORTHOGRAPHY_PRACTICE_ORTHOGRAPHY_COUNT)
    .map(buildOrthographyQuestion);
  const spellingQuestions = shuffleWithRng(gameWords, rng)
    .slice(0, ORTHOGRAPHY_PRACTICE_SPELLING_COUNT)
    .map(buildSpellingQuestion);

  const questions: DailyQuestion[] = [];
  const pairedCount = Math.min(orthographyQuestions.length, spellingQuestions.length);

  for (let index = 0; index < pairedCount; index += 1) {
    questions.push(orthographyQuestions[index], spellingQuestions[index]);
  }

  questions.push(...orthographyQuestions.slice(pairedCount));
  questions.push(...spellingQuestions.slice(pairedCount));

  if (questions.length < ORTHOGRAPHY_PRACTICE_COUNT) {
    const extraOrthography = shuffleWithRng(exercises, rng)
      .slice(ORTHOGRAPHY_PRACTICE_ORTHOGRAPHY_COUNT)
      .map(buildOrthographyQuestion)
      .filter((question) => !questions.some((existing) => existing.id === question.id));
    const extraSpelling = shuffleWithRng(gameWords, rng)
      .slice(ORTHOGRAPHY_PRACTICE_SPELLING_COUNT)
      .map(buildSpellingQuestion)
      .filter((question) => !questions.some((existing) => existing.id === question.id));

    questions.push(...extraOrthography, ...extraSpelling);
  }

  return questions.slice(0, ORTHOGRAPHY_PRACTICE_COUNT);
}
