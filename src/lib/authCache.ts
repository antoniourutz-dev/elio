import type { GameProgress, PlayerIdentity, PlayerSessionState } from './types';
import { createInitialProgress } from './storage';

const AUTH_SESSION_CACHE_KEY = 'elio-auth-session:v1';

interface CachedSessionPayload {
  player: PlayerIdentity | null;
  progress: GameProgress;
  message: string | null;
}

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function normalizeCachedSession(value: unknown): CachedSessionPayload {
  if (!value || typeof value !== 'object') {
    return {
      player: null,
      progress: createInitialProgress(),
      message: null,
    };
  }

  const candidate = value as Partial<CachedSessionPayload>;

  return {
    player: candidate.player && typeof candidate.player === 'object' ? (candidate.player as PlayerIdentity) : null,
    progress: candidate.progress && typeof candidate.progress === 'object'
      ? (candidate.progress as GameProgress)
      : createInitialProgress(),
    message: typeof candidate.message === 'string' ? candidate.message : null,
  };
}

export function readCachedSessionState(): PlayerSessionState {
  if (!canUseStorage()) {
    return {
      player: null,
      progress: createInitialProgress(),
      message: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_CACHE_KEY);
    if (!raw) {
      return {
        player: null,
        progress: createInitialProgress(),
        message: null,
      };
    }

    return normalizeCachedSession(JSON.parse(raw));
  } catch {
    return {
      player: null,
      progress: createInitialProgress(),
      message: null,
    };
  }
}

export function writeCachedSessionState(sessionState: PlayerSessionState): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      AUTH_SESSION_CACHE_KEY,
      JSON.stringify({
        player: sessionState.player,
        progress: sessionState.progress,
        message: sessionState.message,
      } satisfies CachedSessionPayload)
    );
  } catch {
    // Ignore cache write errors.
  }
}

export function clearCachedSessionState(): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(AUTH_SESSION_CACHE_KEY);
  } catch {
    // Ignore cache clear errors.
  }
}
