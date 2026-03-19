export interface DbErrorLike {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

export interface RemoteProgressRow {
  owner_id: string;
  player_code: string;
  player_email: string;
  learner_name: string;
  level_records: unknown;
  forced_unlock_levels: number[] | null;
  forced_unlock_level: number | null;
  created_at: string;
  updated_at: string;
}

export const toDbError = (error: unknown): DbErrorLike | null => {
  if (!error || typeof error !== 'object') return null;
  if (!('message' in error) || typeof (error as { message: unknown }).message !== 'string') return null;
  return error as DbErrorLike;
};

export const isMissingTableError = (error: DbErrorLike | null): boolean => {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;

  const joined = `${error.message} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return joined.includes('does not exist') || joined.includes('not found');
};

export const isRowLevelSecurityError = (error: DbErrorLike | null): boolean => {
  if (!error) return false;
  if (error.code === '42501') return true;

  const joined = `${error.message} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return joined.includes('row-level security') || joined.includes('rls');
};

export const isMissingColumnError = (error: DbErrorLike | null, columnName: string): boolean => {
  if (!error) return false;
  if (error.code === '42703') return true;

  const joined = `${error.message} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return joined.includes(columnName.toLowerCase());
};

export const isMissingFunctionError = (error: DbErrorLike | null, functionName: string): boolean => {
  if (!error) return false;
  if (error.code === '42883' || error.code === 'PGRST202') return true;

  const joined = `${error.message} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return joined.includes(functionName.toLowerCase());
};

export const REMOTE_PROGRESS_SELECT = '*';
export const LEGACY_REMOTE_PROGRESS_SELECT = '*';
export let forcedUnlockLevelsColumnSupport: boolean | null = null;

export const rememberForcedUnlockLevelsSupport = (value: unknown): void => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  forcedUnlockLevelsColumnSupport = Object.prototype.hasOwnProperty.call(value, 'forced_unlock_levels');
};

export const rememberForcedUnlockLevelsSupportFromRows = (value: unknown): void => {
  if (!Array.isArray(value) || value.length === 0) return;
  rememberForcedUnlockLevelsSupport(value[0]);
};

export const setForcedUnlockLevelsColumnSupport = (value: boolean): void => {
  forcedUnlockLevelsColumnSupport = value;
};
