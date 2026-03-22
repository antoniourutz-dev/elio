/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PLAYER_EMAIL_DOMAIN?: string;
  readonly VITE_SUPABASE_PLAYER_PROGRESS_TABLE?: string;
  readonly VITE_SUPABASE_WORDS_TABLE?: string;
  readonly VITE_SUPABASE_SYNONYMS_TABLE?: string;
  readonly VITE_SUPABASE_GAME_SESSIONS_TABLE?: string;
  readonly VITE_SUPABASE_GAME_PLAYER_RESULTS_TABLE?: string;
  readonly VITE_SUPABASE_GAME_FAIL_EVENTS_TABLE?: string;
  readonly VITE_SUPABASE_GAME_QUESTION_EVENTS_TABLE?: string;
  readonly VITE_SUPABASE_DAILY_PILLS_TABLE?: string;
  readonly VITE_SUPABASE_EROGLIFIKOAK_TABLE?: string;
  readonly VITE_SUPABASE_EROGLIFIKOAK_BUCKET?: string;
  readonly VITE_SUPABASE_EROGLIFIKOAK_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
