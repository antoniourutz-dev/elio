export function calculateDailyScore(correctCount: number, secondsElapsed: number): number {
  const baseScore = correctCount * 100;
  const timeBonus = Math.max(0, Math.floor(((90 - Math.min(secondsElapsed, 90)) / 90) * 300));
  return baseScore + timeBonus;
}
