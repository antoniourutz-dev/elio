import { isSupabaseConfigured, supabase } from '../supabaseClient';
import type { PlayerSessionState, PlayerIdentity, PlayerAccessSuccess, PlayerAccessFailure } from './types';
import { ADMIN_PLAYER_CODE, GAME_LEVELS, SUPERADMIN_PLAYER_CODE } from './constants';
import { normalizePlayerCode, parsePlayerCodeFromEmail, buildPlayerEmail } from './parsing';
import { createInitialProgress, createAuthPlayerIdentity, loadRemoteProgress } from './storage';

export { buildPlayerEmail } from './parsing';
export { savePlayerProgress } from './storage';

export const isSuperPlayer = (player: Pick<PlayerIdentity, 'code'> | null | undefined): boolean =>
  normalizePlayerCode(player?.code ?? '') === SUPERADMIN_PLAYER_CODE;

export const isTeacherPlayer = (player: Pick<PlayerIdentity, 'code'> | null | undefined): boolean => {
  const normalizedCode = normalizePlayerCode(player?.code ?? '');
  return normalizedCode === ADMIN_PLAYER_CODE || normalizedCode === SUPERADMIN_PLAYER_CODE;
};

const getPrivilegedForcedUnlockLevels = (): number[] => GAME_LEVELS.slice(1).map((level) => level.index);

const applyPrivilegedProgress = (player: Pick<PlayerIdentity, 'code'> | null | undefined, progress: ReturnType<typeof createInitialProgress>) =>
  isSuperPlayer(player)
    ? {
        ...progress,
        forcedUnlockLevels: getPrivilegedForcedUnlockLevels(),
      }
    : progress;

export const loadPlayerSessionState = async (): Promise<PlayerSessionState> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      player: null,
      progress: createInitialProgress(),
      message: 'Supabase ez dago prest.',
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return {
      player: null,
      progress: createInitialProgress(),
      message: sessionError.message,
    };
  }

  const user = session?.user;
  const code = parsePlayerCodeFromEmail(user?.email);
  if (!user || !code || !user.email) {
    return {
      player: null,
      progress: createInitialProgress(),
      message: null,
    };
  }

  const player = createAuthPlayerIdentity({
    userId: user.id,
    email: user.email,
    code,
    createdAt: user.created_at,
    lastLoginAt: user.last_sign_in_at ?? null,
  });

  const remote = await loadRemoteProgress(player);
  return {
    player,
    progress: applyPrivilegedProgress(player, remote.progress),
    message: remote.message,
  };
};

export const signOutPlayer = async (): Promise<void> => {
  if (!supabase || !isSupabaseConfigured) return;

  await supabase.auth.signOut();
};

export const accessPlayer = async (codeInput: string, passwordInput: string): Promise<PlayerAccessSuccess | PlayerAccessFailure> => {
  const playerCode = normalizePlayerCode(codeInput);
  const playerEmail = buildPlayerEmail(playerCode);
  const password = passwordInput.trim();

  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase ez dago prest; ezin da saioa hasi.',
    };
  }

  if (!playerCode) {
    return {
      ok: false,
      message: 'Erabiltzailea idatzi behar duzu.',
    };
  }

  if (!/^[a-z0-9_-]+$/.test(playerCode)) {
    return {
      ok: false,
      message: 'Kodeak letrak, zenbakiak, marratxoa edo azpimarra bakarrik izan ditzake.',
    };
  }

  if (password.length === 0) {
    return {
      ok: false,
      message: 'Pasahitza idatzi behar duzu.',
    };
  }

  const now = new Date().toISOString();
  const signInResult = await supabase.auth.signInWithPassword({
    email: playerEmail,
    password,
  });

  if (!signInResult.error && signInResult.data.user) {
    const authPlayer = createAuthPlayerIdentity({
      userId: signInResult.data.user.id,
      email: signInResult.data.user.email ?? playerEmail,
      code: playerCode,
      createdAt: signInResult.data.user.created_at,
      lastLoginAt: signInResult.data.user.last_sign_in_at ?? now,
    });
    const remote = await loadRemoteProgress(authPlayer);

    return {
      ok: true,
      player: authPlayer,
      progress: applyPrivilegedProgress(authPlayer, remote.progress),
      isNew: false,
      message: remote.message ?? `${authPlayer.code} berriro konektatu da.`,
    };
  }

  const normalizedError = signInResult.error?.message.toLowerCase() ?? '';
  if (
    normalizedError.includes('invalid login credentials')
    || normalizedError.includes('invalid credentials')
    || normalizedError.includes('email not confirmed')
  ) {
    return {
      ok: false,
      message: 'Erabiltzailea edo pasahitza ez dira zuzenak. Irakasleak kontua sortuta izan behar du.',
    };
  }

  return {
    ok: false,
    message: `Ezin izan da saioa hasi: ${signInResult.error?.message ?? 'errore ezezaguna'}`,
  };
};
