import type { GameProgress, LevelRecord, GameLevel, SynonymEntry, QuestionMemoryRecord } from './types';
import { GAME_LEVELS, LEVEL_PASS_SCORE } from './constants';
import { calculateLevelProgressPercentage, buildLocalDayKey } from './parsing';
import { sanitizeForcedUnlockLevels } from './storage';
import { buildLevelQuestionSeeds } from './quiz';

export const getLevelUnlockTargetCount = (levelQuestionCount: number): number => {
  if (levelQuestionCount <= 0) return 0;
  return Math.ceil((levelQuestionCount * LEVEL_PASS_SCORE) / 100);
};

export const getLevelQuestionCount = (entries: SynonymEntry[], levelIndex: number): number =>
  buildLevelQuestionSeeds(entries, levelIndex).length;

export const getLevelRecord = (progress: GameProgress, levelId: string): LevelRecord | null =>
  progress.levelRecords.find((record) => record.levelId === levelId) ?? null;

export const getResolvedLevelRecord = (
  progress: GameProgress,
  entries: SynonymEntry[],
  level: GameLevel
): LevelRecord | null => {
  const record = getLevelRecord(progress, level.id);
  if (!record) return null;

  const totalQuestions = getLevelQuestionCount(entries, level.index);
  if (totalQuestions <= 0) {
    return {
      ...record,
      totalQuestions: 0,
      bestCorrectCount: 0,
      bestScore: 0,
      isCompleted: false,
    };
  }

  const bestCorrectCount = Math.min(record.bestCorrectCount, totalQuestions);
  const bestScore = calculateLevelProgressPercentage(bestCorrectCount, totalQuestions);
  const unlockTargetCount = getLevelUnlockTargetCount(totalQuestions);

  return {
    ...record,
    totalQuestions,
    bestCorrectCount,
    bestScore,
    isCompleted: bestCorrectCount >= unlockTargetCount,
  };
};

export const isLevelUnlocked = (progress: GameProgress, levelIndex: number, entries?: SynonymEntry[]): boolean => {
  if (levelIndex <= 1) return true;
  if (sanitizeForcedUnlockLevels(progress.forcedUnlockLevels).includes(levelIndex)) return true;

  const previousLevel = GAME_LEVELS[levelIndex - 2];
  const previousRecord = entries ? getResolvedLevelRecord(progress, entries, previousLevel) : getLevelRecord(progress, previousLevel.id);
  return Boolean(previousRecord?.isCompleted);
};

export const getUnlockedLevels = (progress: GameProgress, entries?: SynonymEntry[]): GameLevel[] =>
  GAME_LEVELS.filter((level) => isLevelUnlocked(progress, level.index, entries));

export const recordLevelResult = (
  progress: GameProgress,
  level: GameLevel,
  sessionScore: number,
  correctCount: number,
  _sessionQuestions: number,
  levelQuestionsTotal: number,
  correctQuestionIds: string[],
  incorrectQuestionIds: string[]
): GameProgress => {
  const playedAt = new Date().toISOString();
  const playedDay = buildLocalDayKey(playedAt);
  const existing = getLevelRecord(progress, level.id);
  const masteredSet = new Set((existing?.masteredQuestionIds ?? []).map((value) => value.trim()).filter(Boolean));
  const incorrectSet = new Set((existing?.incorrectQuestionIds ?? []).map((value) => value.trim()).filter(Boolean));
  const questionMemory: Record<string, QuestionMemoryRecord> = { ...(existing?.questionMemory ?? {}) };

  const updateQuestionMemory = (questionId: string, isCorrect: boolean) => {
    const previous = questionMemory[questionId] ?? {
      attempts: 0,
      correctCount: 0,
      incorrectCount: 0,
      correctStreak: 0,
      incorrectStreak: 0,
      masteryLevel: masteredSet.has(questionId) ? 2 : 0,
      lastResult: null,
      lastSeenAt: null,
    };

    questionMemory[questionId] = isCorrect
      ? {
          ...previous,
          attempts: previous.attempts + 1,
          correctCount: previous.correctCount + 1,
          correctStreak: previous.correctStreak + 1,
          incorrectStreak: 0,
          masteryLevel: Math.min(4, previous.masteryLevel + 1),
          lastResult: 'correct',
          lastSeenAt: playedAt,
        }
      : {
          ...previous,
          attempts: previous.attempts + 1,
          incorrectCount: previous.incorrectCount + 1,
          correctStreak: 0,
          incorrectStreak: previous.incorrectStreak + 1,
          masteryLevel: Math.max(0, previous.masteryLevel - 2),
          lastResult: 'incorrect',
          lastSeenAt: playedAt,
        };
  };

  for (const questionId of correctQuestionIds.map((value) => value.trim()).filter(Boolean)) {
    updateQuestionMemory(questionId, true);
    masteredSet.add(questionId);
    incorrectSet.delete(questionId);
  }

  for (const questionId of incorrectQuestionIds.map((value) => value.trim()).filter(Boolean)) {
    updateQuestionMemory(questionId, false);
    masteredSet.delete(questionId);
    incorrectSet.add(questionId);
  }

  const masteredQuestionIds = Array.from(masteredSet).sort((left, right) => left.localeCompare(right, 'eu'));
  const nextIncorrectQuestionIds = Array.from(incorrectSet).sort((left, right) => left.localeCompare(right, 'eu'));
  const masteredCount = levelQuestionsTotal > 0 ? Math.min(masteredQuestionIds.length, levelQuestionsTotal) : 0;
  const nextProgressScore = calculateLevelProgressPercentage(masteredCount, levelQuestionsTotal);
  const unlockTargetCount = getLevelUnlockTargetCount(levelQuestionsTotal);
  const playedDates = Array.from(new Set([...(existing?.playedDates ?? []), playedDay])).sort((left, right) =>
    left.localeCompare(right, 'eu')
  );
  const dailyAttempts = {
    ...(existing?.dailyAttempts ?? {}),
    [playedDay]: (existing?.dailyAttempts?.[playedDay] ?? 0) + 1,
  };

  const nextRecord: LevelRecord = existing
    ? {
        ...existing,
        attempts: existing.attempts + 1,
        bestScore: nextProgressScore,
        lastScore: sessionScore,
        bestCorrectCount: masteredCount,
        lastCorrectCount: correctCount,
        totalQuestions: levelQuestionsTotal,
        lastPlayedAt: playedAt,
        playedDates,
        dailyAttempts,
        masteredQuestionIds,
        incorrectQuestionIds: nextIncorrectQuestionIds,
        questionMemory,
        isCompleted: masteredCount >= unlockTargetCount,
      }
    : {
        levelId: level.id,
        levelIndex: level.index,
        attempts: 1,
        bestScore: nextProgressScore,
        lastScore: sessionScore,
        bestCorrectCount: masteredCount,
        lastCorrectCount: correctCount,
        totalQuestions: levelQuestionsTotal,
        lastPlayedAt: playedAt,
        playedDates,
        dailyAttempts,
        masteredQuestionIds,
        incorrectQuestionIds: nextIncorrectQuestionIds,
        questionMemory,
        isCompleted: masteredCount >= unlockTargetCount,
      };

  const nextRecords = [nextRecord, ...progress.levelRecords.filter((record) => record.levelId !== level.id)].sort(
    (left, right) => left.levelIndex - right.levelIndex
  );

  return {
    ...progress,
    levelRecords: nextRecords,
  };
};
