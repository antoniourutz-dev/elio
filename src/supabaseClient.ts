import { createClient } from '@supabase/supabase-js';
export * from './lib/supabaseConfig';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './lib/supabaseConfig';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
      },
    })
  : null;

export const createIsolatedSupabaseClient = () =>
  isSupabaseConfigured
    ? createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      })
    : null;

export const ensureAnalyticsIdentity = async (): Promise<{ ok: boolean; message: string }> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase no esta configurado.',
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (session) {
    return {
      ok: true,
      message: 'Sesion anonima disponible.',
    };
  }

  if (sessionError) {
    return {
      ok: false,
      message: sessionError.message,
    };
  }

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Sesion anonima creada.',
  };
};
