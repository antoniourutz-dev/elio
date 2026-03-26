const GRAMMAR_PROGRESS_KEY = 'grammar-map-progress-v1';

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function readGrammarProgress(playerId: string | null | undefined): number {
  if (!canUseStorage() || !playerId) return 0;

  try {
    const raw = window.localStorage.getItem(`${GRAMMAR_PROGRESS_KEY}:${playerId}`);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function writeGrammarProgress(playerId: string | null | undefined, value: number): void {
  if (!canUseStorage() || !playerId) return;

  try {
    window.localStorage.setItem(`${GRAMMAR_PROGRESS_KEY}:${playerId}`, String(Math.max(0, value)));
  } catch {
    // Ignore storage failures and keep in-memory progress.
  }
}
