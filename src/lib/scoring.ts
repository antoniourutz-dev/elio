// Límites fijos del juego diario
const MAX_SYNONYMS = 5;
const MAX_SPELLING = 5;
const MAX_HIEROGLYPHS = 2;

const POINTS_SYNONYM = 100;
const POINTS_SPELLING = 100;
const POINTS_HIEROGLYPH = 150;

const TIME_BONUS_MAX = 200;
const TIME_BONUS_PENALTY_PER_SECOND = 4;

const BONUS_FULL_SYNONYMS = 50;
const BONUS_FULL_SPELLING = 50;
const BONUS_FULL_HIEROGLYPHS = 50;
const BONUS_PERFECT_GAME = 100;

export interface DailyGameInput {
  synonymsCorrect: number;
  spellingCorrect: number;
  hieroglyphsCorrect: number;
  totalTimeInSeconds: number;
}

export interface DailyGameScore {
  baseScore: number;
  timeBonus: number;
  extraBonus: number;
  finalScore: number;
}

const validateInput = (input: DailyGameInput): void => {
  const { synonymsCorrect, spellingCorrect, hieroglyphsCorrect, totalTimeInSeconds } = input;

  if (synonymsCorrect < 0 || !Number.isInteger(synonymsCorrect))
    throw new Error(`synonymsCorrect must be a non-negative integer, got ${synonymsCorrect}`);
  if (spellingCorrect < 0 || !Number.isInteger(spellingCorrect))
    throw new Error(`spellingCorrect must be a non-negative integer, got ${spellingCorrect}`);
  if (hieroglyphsCorrect < 0 || !Number.isInteger(hieroglyphsCorrect))
    throw new Error(`hieroglyphsCorrect must be a non-negative integer, got ${hieroglyphsCorrect}`);
  if (totalTimeInSeconds < 0 || !Number.isFinite(totalTimeInSeconds))
    throw new Error(`totalTimeInSeconds must be a non-negative number, got ${totalTimeInSeconds}`);

  if (synonymsCorrect > MAX_SYNONYMS)
    throw new Error(`synonymsCorrect cannot exceed ${MAX_SYNONYMS}, got ${synonymsCorrect}`);
  if (spellingCorrect > MAX_SPELLING)
    throw new Error(`spellingCorrect cannot exceed ${MAX_SPELLING}, got ${spellingCorrect}`);
  if (hieroglyphsCorrect > MAX_HIEROGLYPHS)
    throw new Error(`hieroglyphsCorrect cannot exceed ${MAX_HIEROGLYPHS}, got ${hieroglyphsCorrect}`);
};

// Puntos base: cada tipo de pregunta tiene su propio valor por acierto.
// Los jeroglíficos valen más porque son más difíciles.
const calcBaseScore = (input: DailyGameInput): number =>
  input.synonymsCorrect * POINTS_SYNONYM +
  input.spellingCorrect * POINTS_SPELLING +
  input.hieroglyphsCorrect * POINTS_HIEROGLYPH;

// Bonus de tiempo: cuanto más rápido, mayor bonus. Nunca negativo.
const calcTimeBonus = (totalTimeInSeconds: number): number =>
  Math.max(0, TIME_BONUS_MAX - totalTimeInSeconds * TIME_BONUS_PENALTY_PER_SECOND);

// Bonus extra por completar bloques enteros y por partida perfecta.
const calcExtraBonus = (input: DailyGameInput): number => {
  const { synonymsCorrect, spellingCorrect, hieroglyphsCorrect } = input;

  const fullSynonyms = synonymsCorrect === MAX_SYNONYMS ? BONUS_FULL_SYNONYMS : 0;
  const fullSpelling = spellingCorrect === MAX_SPELLING ? BONUS_FULL_SPELLING : 0;
  const fullHieroglyphs = hieroglyphsCorrect === MAX_HIEROGLYPHS ? BONUS_FULL_HIEROGLYPHS : 0;

  const totalCorrect = synonymsCorrect + spellingCorrect + hieroglyphsCorrect;
  const totalQuestions = MAX_SYNONYMS + MAX_SPELLING + MAX_HIEROGLYPHS;
  const perfectGame = totalCorrect === totalQuestions ? BONUS_PERFECT_GAME : 0;

  return fullSynonyms + fullSpelling + fullHieroglyphs + perfectGame;
};

/**
 * Calcula la puntuación final de una partida diaria.
 *
 * La puntuación combina tres componentes:
 * - baseScore: puntos por cada acierto según el tipo de pregunta
 * - timeBonus: recompensa por completar la partida rápido (máx. 200 pts)
 * - extraBonus: bonus por completar bloques enteros y partida perfecta
 */
export const calcDailyScore = (input: DailyGameInput): DailyGameScore => {
  validateInput(input);

  const baseScore = calcBaseScore(input);
  const timeBonus = calcTimeBonus(input.totalTimeInSeconds);
  const extraBonus = calcExtraBonus(input);

  return {
    baseScore,
    timeBonus,
    extraBonus,
    finalScore: baseScore + timeBonus + extraBonus,
  };
};

/**
 * Compara dos jugadores por su puntuación diaria.
 * - Gana quien tenga mayor finalScore.
 * - En caso de empate, gana quien haya tardado menos (totalTimeInSeconds).
 *
 * Devuelve un número negativo si a gana, positivo si gana b, 0 si son iguales.
 * Compatible con Array.sort().
 */
export const compareDailyScores = (
  a: { score: DailyGameScore; totalTimeInSeconds: number },
  b: { score: DailyGameScore; totalTimeInSeconds: number }
): number => {
  if (b.score.finalScore !== a.score.finalScore) {
    return b.score.finalScore - a.score.finalScore;
  }
  return a.totalTimeInSeconds - b.totalTimeInSeconds;
};
