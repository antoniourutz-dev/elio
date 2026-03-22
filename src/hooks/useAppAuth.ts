import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  accessPlayer,
  createInitialProgress,
  loadPlayerSessionState,
  signOutPlayer,
} from '../euskeraLearning';
import type { GameProgress, PlayerIdentity } from '../euskeraLearning';

export interface UseAppAuthProps {
  onLoginSuccess: () => Promise<void> | void;
  onLogoutSuccess: () => void;
  setUiMessage: (msg: string | null) => void;
}

export function useAppAuth({ onLoginSuccess, onLogoutSuccess, setUiMessage }: UseAppAuthProps) {
  const [activePlayer, setActivePlayer] = useState<PlayerIdentity | null>(null);
  const [progress, setProgress] = useState<GameProgress>(createInitialProgress());
  
  const [accessCode, setAccessCode] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmittingAccess, setIsSubmittingAccess] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    const hydrateSession = async () => {
      setIsSessionLoading(true);
      const sessionState = await loadPlayerSessionState();
      setActivePlayer(sessionState.player);
      setProgress(sessionState.progress);
      setUiMessage(sessionState.message);
      setIsSessionLoading(false);
    };

    void hydrateSession();
  }, [setUiMessage]);

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
    
    // reset local form state
    setAccessCode('');
    setAccessPassword('');
    setAccessMessage(null);
    setIsPasswordVisible(false);
    
    // The message could be a "demo" mode message. We keep it globally or clear it out
    setUiMessage(result.message);
    
    // Let parent know to refresh banks, clear games, set screen...
    await onLoginSuccess();
  }, [accessCode, accessPassword, onLoginSuccess, setUiMessage]);

  const logoutPlayer = useCallback(async () => {
    await signOutPlayer();
    setActivePlayer(null);
    setProgress(createInitialProgress());
    setAccessCode('');
    setAccessMessage(null);
    setAccessPassword('');
    setIsPasswordVisible(false);
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
