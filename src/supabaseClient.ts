import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const wordsTable = import.meta.env.VITE_SUPABASE_WORDS_TABLE || 'words';
export const synonymsTable = import.meta.env.VITE_SUPABASE_SYNONYMS_TABLE || 'euskera_synonyms';
export const playerProgressTable = import.meta.env.VITE_SUPABASE_PLAYER_PROGRESS_TABLE || 'player_progress';
export const gameSessionsTable = import.meta.env.VITE_SUPABASE_GAME_SESSIONS_TABLE || 'game_sessions';
export const gamePlayerResultsTable =
  import.meta.env.VITE_SUPABASE_GAME_PLAYER_RESULTS_TABLE || 'game_player_results';
export const gameFailEventsTable = import.meta.env.VITE_SUPABASE_GAME_FAIL_EVENTS_TABLE || 'game_fail_events';
export const gameQuestionEventsTable =
  import.meta.env.VITE_SUPABASE_GAME_QUESTION_EVENTS_TABLE || 'game_question_events';
export const gameWordsTable = 'game_words';
export const dailyScoresTable = 'daily_scores';
export const dailyPillsTable = import.meta.env.VITE_SUPABASE_DAILY_PILLS_TABLE || 'eguneko_pildorak';
export const dailyHieroglyphsTable = import.meta.env.VITE_SUPABASE_EROGLIFIKOAK_TABLE || 'eroglifikoak';
export const orthographyExercisesTable = import.meta.env.VITE_SUPABASE_ORTHOGRAPHY_TABLE || 'ejercicios_orto';
export const lessonsTable = import.meta.env.VITE_SUPABASE_LESSONS_TABLE || 'lessons';
export const lessonBlocksTable = import.meta.env.VITE_SUPABASE_LESSON_BLOCKS_TABLE || 'lesson_blocks';
export const dailyHieroglyphsBucket = import.meta.env.VITE_SUPABASE_EROGLIFIKOAK_BUCKET || 'eroglificos';
export const dailyHieroglyphsBaseUrl =
  import.meta.env.VITE_SUPABASE_EROGLIFIKOAK_BASE_URL ||
  (supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${dailyHieroglyphsBucket}` : '');

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
