import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './supabaseConfig';
import { loadSupabaseModule } from './loadSupabaseModule';
import { logWarn } from './logger';

type RestFilterOperator = 'eq' | 'gte' | 'lte' | 'in' | 'ilike';

interface RestFilter {
  column: string;
  operator: RestFilterOperator;
  value: string | number | boolean | Array<string | number>;
}

interface RestOrder {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
}

interface SupabaseRestError {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
  status?: number;
}

interface SelectRestRowsOptions {
  select?: string;
  filters?: RestFilter[];
  order?: RestOrder[];
  limit?: number;
}

interface SelectRestRowsResult<T> {
  data: T[] | null;
  error: SupabaseRestError | null;
}

const REST_BEARER_CACHE_TTL_MS = 30_000;
let cachedRestBearerToken: string | null = null;
let cachedRestBearerTokenExpiresAt = 0;

export const clearSupabaseRestAuthCache = (): void => {
  cachedRestBearerToken = null;
  cachedRestBearerTokenExpiresAt = 0;
};

const stringifyRestValue = (value: RestFilter['value']): string => {
  if (Array.isArray(value)) {
    return `(${value.map((item) => String(item)).join(',')})`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
};

const buildOrderParam = (order: RestOrder[]): string =>
  order
    .map(({ column, ascending = true, nullsFirst }) => {
      let clause = `${column}.${ascending ? 'asc' : 'desc'}`;
      if (typeof nullsFirst === 'boolean') {
        clause += nullsFirst ? '.nullsfirst' : '.nullslast';
      }
      return clause;
    })
    .join(',');

const resolveRestBearerToken = async (forceRefresh = false): Promise<string> => {
  if (!forceRefresh && cachedRestBearerToken && cachedRestBearerTokenExpiresAt > Date.now()) {
    return cachedRestBearerToken;
  }

  try {
    const { supabase } = await loadSupabaseModule();
    if (!supabase) {
      cachedRestBearerToken = supabaseAnonKey;
      cachedRestBearerTokenExpiresAt = Date.now() + REST_BEARER_CACHE_TTL_MS;
      return supabaseAnonKey;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const resolvedToken = session?.access_token || supabaseAnonKey;
    cachedRestBearerToken = resolvedToken;
    cachedRestBearerTokenExpiresAt = Date.now() + REST_BEARER_CACHE_TTL_MS;
    return resolvedToken;
  } catch {
    cachedRestBearerToken = supabaseAnonKey;
    cachedRestBearerTokenExpiresAt = Date.now() + REST_BEARER_CACHE_TTL_MS;
    return supabaseAnonKey;
  }
};

const parseRestErrorResponse = async (response: Response): Promise<SupabaseRestError> => {
  let parsedError: Partial<SupabaseRestError> | null = null;
  try {
    parsedError = (await response.json()) as Partial<SupabaseRestError>;
  } catch {
    parsedError = null;
  }

  return {
    code: parsedError?.code,
    details: parsedError?.details ?? null,
    hint: parsedError?.hint ?? null,
    message: parsedError?.message || `Supabase REST error (${response.status})`,
    status: response.status,
  };
};

const buildRestHeaders = (bearerToken: string): HeadersInit => ({
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${bearerToken}`,
  Accept: 'application/json',
});

export async function selectSupabaseRows<T>(
  table: string,
  { select = '*', filters = [], order = [], limit }: SelectRestRowsOptions = {}
): Promise<SelectRestRowsResult<T>> {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    return {
      data: null,
      error: {
        message: 'Supabase ez dago prest.',
      },
    };
  }

  const params = new URLSearchParams();
  params.set('select', select);

  for (const filter of filters) {
    params.set(filter.column, `${filter.operator}.${stringifyRestValue(filter.value)}`);
  }

  if (order.length > 0) {
    params.set('order', buildOrderParam(order));
  }

  if (typeof limit === 'number' && Number.isFinite(limit)) {
    params.set('limit', String(limit));
  }

  const requestUrl = `${supabaseUrl}/rest/v1/${table}?${params.toString()}`;
  let bearerToken = await resolveRestBearerToken();
  let response = await fetch(requestUrl, {
    headers: buildRestHeaders(bearerToken),
  });

  if ((response.status === 401 || response.status === 403) && bearerToken !== supabaseAnonKey) {
    bearerToken = await resolveRestBearerToken(true);
    response = await fetch(requestUrl, {
      headers: buildRestHeaders(bearerToken),
    });
  }

  if (!response.ok) {
    const error = await parseRestErrorResponse(response);

    if (error.status === 401 || error.status === 403 || error.code === '42501') {
      logWarn('supabaseRest', `REST read blocked for ${table}.`, {
        table,
        status: error.status,
        code: error.code,
        message: error.message,
      });
    }

    return {
      data: null,
      error,
    };
  }

  const data = (await response.json()) as T[];
  return {
    data,
    error: null,
  };
}
