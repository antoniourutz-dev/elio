const REQUIRED_VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

export interface EnvValidationResult {
  ok: boolean;
  missing: string[];
}

export const validateEnv = (): EnvValidationResult => {
  const missing = REQUIRED_VARS.filter((key) => !import.meta.env[key]);
  return { ok: missing.length === 0, missing };
};
