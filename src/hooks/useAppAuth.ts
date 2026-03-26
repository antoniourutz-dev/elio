import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  accessPlayer,
  loadPlayerSessionState,
  signOutPlayer,
} from '../lib/auth';
import type { GameProgress, PlayerIdentity } from '../lib/types';
import { createInitialProgress } from '../lib/storage';
import { clearCachedSessionState, readCachedSessionState, writeCachedSessionState } from '../lib/authCache';
import { clearSupabaseRestAuthCache } from '../lib/supabaseRest';

export interface UseAppAuthProps {
  onLoginSuccess: () => Promise<void> | void;
  onLogoutSuccess: () => void;
  setUiMessage: (msg: string | null) => void;
}

export function useAppAuth({ onLoginSuccess, onLogoutSuccess, setUiMessage }: UseAppAuthProps) {
  const [cachedSession] = useState(() => readCachedSessionState());
  const [activePlayer, setActivePlayer] = useState<PlayerIdentity | null>(cachedSession.player);
  const [progress, setProgress] = useState<GameProgress>(cachedSession.progress);
  
  const [accessCode, setAccessCode] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmittingAccess, setIsSubmittingAccess] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(cachedSession.player === null);

  useEffect(() => {
    const hydrateSession = async () => {
      if (!cachedSession.player) {
        setIsSessionLoading(true);
      }
      const sessionState = await loadPlayerSessionState();
      clearSupabaseRestAuthCache();
      setActivePlayer(sessionState.player);
      setProgress(sessionState.progress);
      setUiMessage(sessionState.message);
      if (sessionState.player) {
        writeCachedSessionState(sessionState);
      } else {
        clearCachedSessionState();
      }
      setIsSessionLoading(false);
    };

    void hydrateSession();
  }, [cachedSession.player, setUiMessage]);

  useEffect(() => {
    if (activePlayer) {
      writeCachedSessionState({
        player: activePlayer,
        progress,
        message: null,
      });
      return;
    }

    clearCachedSessionState();
  }, [activePlayer, progress]);

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible((v) => !v);
  }, []);

  const submitAccess = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setIsSubmittingAccess(true);
    let result: Awaited<ReturnType<typeof accessPlayer>>;
    try {
      result = await accessPlayer(accessCode, accessPassword);
    } finally {
      setIsSubmittingAccess(false);
    }

    if (!result.ok) {
      setAccessMessage(result.message);
      return;
    }

    setActivePlayer(result.player);
    setProgress(result.progress);
    clearSupabaseRestAuthCache();
    
    // reset local form state
    setAccessCode('');
    setAccessPassword('');
    setAccessMessage(null);
    setIsPasswordVisible(false);
    
    // The message could be a "demo" mode message. We keep it globally or clear it out
    setUiMessage(result.message);
    writeCachedSessionState({
      player: result.player,
      progress: result.progress,
      message: result.message,
    });
    
    // Let parent know to refresh banks, clear games, set screen...
    await onLoginSuccess();
  }, [accessCode, accessPassword, onLoginSuccess, setUiMessage]);

  const logoutPlayer = useCallback(async () => {
    await signOutPlayer();
    clearSupabaseRestAuthCache();
    setActivePlayer(null);
    setProgress(createInitialProgress());
    setAccessCode('');
    setAccessMessage(null);
    setAccessPassword('');
    setIsPasswordVisible(false);
    clearCachedSessionState();
    onLogoutSuccess();
  }, [onLogoutSuccess]);

  return {
    activePlayer,
    progress,
    setProgress,
    isSessionLoading,
    accessCode,
    setAccessCode,
    accessPassword,
    setAccessPassword,
    accessMessage,
    isPasswordVisible,
    togglePasswordVisibility,
    isSubmittingAccess,
    submitAccess,
    logoutPlayer,
  };
}
