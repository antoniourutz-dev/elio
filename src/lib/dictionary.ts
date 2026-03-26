import {
  dictionarySearchRpc,
  dictionaryDefinitionsTable,
  dictionaryTable,
  isSupabaseConfigured,
  synonymGroupsSecondaryTable,
  synonymsTable,
} from './supabaseConfig';
import { loadSupabaseModule } from './loadSupabaseModule';
import { selectSupabaseRows } from './supabaseRest';

export interface DictionaryDefinition {
  id: number | string;
  text: string;
  order: number;
}

export interface DictionarySearchResult {
  key: string;
  basque: string;
  spanish: string | null;
  definitions: DictionaryDefinition[];
  synonyms: string[];
  score: number;
  source: 'dictionary' | 'synonym_only';
}

export interface DictionarySearchLoadResult {
  ok: boolean;
  results: DictionarySearchResult[];
  message: string;
  total: number;
  page: number;
  pageSize: number;
}

type DictionarySearchMode = 'contains' | 'exact' | 'prefix' | 'suffix';

interface DictionaryRow {
  id: number | string | null;
  basque: string | null;
  spanish: string | null;
}

interface DictionaryDefinitionRow {
  id: number | string | null;
  diccionario_id: number | string | null;
  orden: number | null;
  texto: string | null;
}

interface SynonymGroupRow {
  id: number | string | null;
  word: string | null;
  synonyms: unknown;
  active: boolean | null;
}

interface SynonymGroupSecondaryRow {
  id: number | string | null;
  hitza: string | null;
  sinonimoak: unknown;
  active: boolean | null;
  search_text?: string | null;
}

interface DictionaryQueryError {
  message: string;
}

interface DictionaryRpcRow {
  key: string | null;
  basque: string | null;
  spanish: string | null;
  definitions: unknown;
  synonyms: unknown;
  score: number | null;
  source: string | null;
  total_count: number | null;
}

const PAGE_SIZE = 24;
const FETCH_LIMIT = 120;
const CLIENT_FILTER_LIMIT = 400;
const ACTIVE_SYNONYM_CACHE_TTL_MS = 1000 * 60 * 5;

interface ActiveSynonymCacheEntry {
  primary: SynonymGroupRow[];
  secondary: SynonymGroupSecondaryRow[];
  expiresAt: number;
}

let activeSynonymCache: ActiveSynonymCacheEntry | null = null;
let activeSynonymCachePromise: Promise<{ primary: SynonymGroupRow[]; secondary: SynonymGroupSecondaryRow[] }> | null = null;

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('eu');

const parseSearchMode = (value: string): { query: string; mode: DictionarySearchMode } => {
  const exactRequested = /\s+$/.test(value);
  const trimmed = value.trim();
  const startsWithWildcard = trimmed.startsWith('*');
  const endsWithWildcard = trimmed.endsWith('*');
  const query = normalizeSearchText(trimmed.replace(/^\*+/, '').replace(/\*+$/, ''));

  if (exactRequested) {
    return { query, mode: 'exact' };
  }
  if (startsWithWildcard && !endsWithWildcard) {
    return { query, mode: 'suffix' };
  }
  if (!startsWithWildcard && endsWithWildcard) {
    return { query, mode: 'prefix' };
  }
  return { query, mode: 'contains' };
};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const uniqueTerms = (terms: string[]): string[] =>
  uniqueStrings(
    terms
      .map((term) => normalizeText(term))
      .filter(Boolean)
  );

const parseStringArray = (value: unknown): string[] => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return uniqueStrings(
          parsed
            .map((item) => normalizeText(item))
            .filter(Boolean)
        );
      }
    } catch {
      // Fall through to comma-separated parsing.
    }

    return uniqueStrings(
      trimmed
        .split(',')
        .map((item) => normalizeText(item))
        .filter(Boolean)
    );
  }

  if (!Array.isArray(value)) return [];
  return uniqueStrings(
    value
      .map((item) => normalizeText(item))
      .filter(Boolean)
  );
};

const matchesMode = (value: string, query: string, mode: DictionarySearchMode): boolean => {
  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue || !query) return false;
  if (mode === 'exact') return normalizedValue === query;
  if (mode === 'prefix') return normalizedValue.startsWith(query);
  if (mode === 'suffix') return normalizedValue.endsWith(query);
  return normalizedValue.includes(query);
};

const buildPattern = (query: string, mode: DictionarySearchMode): string => {
  if (mode === 'exact') return query;
  if (mode === 'prefix') return `${query}%`;
  if (mode === 'suffix') return `%${query}`;
  return `%${query}%`;
};

const sqlOperatorForMode = (mode: DictionarySearchMode): 'eq' | 'ilike' => (mode === 'exact' ? 'eq' : 'ilike');

export const clearDictionarySearchCache = (): void => {
  activeSynonymCache = null;
  activeSynonymCachePromise = null;
};

const scoreTextMatch = (
  value: string,
  query: string,
  mode: DictionarySearchMode,
  exact: number,
  prefix: number,
  partial: number
): number => {
  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue) return 0;
  if (!matchesMode(value, query, mode)) return 0;
  if (normalizedValue === query) return exact;
  if (normalizedValue.startsWith(query)) return prefix;
  if (normalizedValue.endsWith(query)) return partial;
  if (normalizedValue.includes(query)) return partial;
  return 0;
};

function buildInitialResultMap(rows: DictionaryRow[]): Map<string, DictionarySearchResult> {
  const resultMap = new Map<string, DictionarySearchResult>();

  for (const row of rows) {
    if (row.id === null || row.id === undefined) continue;
    const basque = normalizeText(row.basque);
    if (!basque) continue;
    const key = normalizeSearchText(basque);

    if (!resultMap.has(key)) {
      resultMap.set(key, {
        key,
        basque,
        spanish: normalizeText(row.spanish) || null,
        definitions: [],
        synonyms: [],
        score: 0,
        source: 'dictionary',
      });
    } else {
      const current = resultMap.get(key)!;
      if (!current.spanish && normalizeText(row.spanish)) {
        current.spanish = normalizeText(row.spanish);
      }
    }
  }

  return resultMap;
}

function applyDictionaryRows(
  resultMap: Map<string, DictionarySearchResult>,
  rows: DictionaryRow[]
) {
  for (const row of rows) {
    if (row.id === null || row.id === undefined) continue;
    const basque = normalizeText(row.basque);
    if (!basque) continue;

    const key = normalizeSearchText(basque);
    const existing = resultMap.get(key);
    if (existing) {
      existing.basque = existing.basque || basque;
      if (!existing.spanish && normalizeText(row.spanish)) {
        existing.spanish = normalizeText(row.spanish);
      }
      existing.source = 'dictionary';
      continue;
    }

    resultMap.set(key, {
      key,
      basque,
      spanish: normalizeText(row.spanish) || null,
      definitions: [],
      synonyms: [],
      score: 0,
      source: 'dictionary',
    });
  }
}

function applyDefinitions(
  resultMap: Map<string, DictionarySearchResult>,
  dictionaryRows: DictionaryRow[],
  definitionRows: DictionaryDefinitionRow[]
) {
  const keyByDictionaryId = new Map<number | string, string>();
  for (const row of dictionaryRows) {
    if (row.id === null || row.id === undefined) continue;
    const basque = normalizeText(row.basque);
    if (!basque) continue;
    keyByDictionaryId.set(row.id, normalizeSearchText(basque));
  }

  for (const row of definitionRows) {
    if (row.id === null || row.id === undefined || row.diccionario_id === null || row.diccionario_id === undefined) {
      continue;
    }
    const text = normalizeText(row.texto);
    if (!text) continue;

    const key = keyByDictionaryId.get(row.diccionario_id);
    if (!key) continue;
    const result = resultMap.get(key);
    if (!result) continue;

    result.definitions.push({
      id: row.id,
      text,
      order: typeof row.orden === 'number' ? row.orden : 0,
    });
  }

  for (const result of resultMap.values()) {
    const uniqueDefinitions = new Map<string, DictionaryDefinition>();
    for (const definition of result.definitions) {
      const definitionKey = `${definition.order}::${normalizeSearchText(definition.text)}`;
      if (!uniqueDefinitions.has(definitionKey)) {
        uniqueDefinitions.set(definitionKey, definition);
      }
    }

    result.definitions = Array.from(uniqueDefinitions.values());
    result.definitions.sort((left, right) => left.order - right.order || left.text.localeCompare(right.text, 'eu'));
  }
}

function applySynonyms(
  resultMap: Map<string, DictionarySearchResult>,
  synonymRows: SynonymGroupRow[],
  synonymRowsSecondary: SynonymGroupSecondaryRow[]
) {
  const ensureResult = (term: string): DictionarySearchResult => {
    const key = normalizeSearchText(term);
    const existing = resultMap.get(key);
    if (existing) return existing;

    const created: DictionarySearchResult = {
      key,
      basque: term,
      spanish: null,
      definitions: [],
      synonyms: [],
      score: 0,
      source: 'synonym_only',
    };
    resultMap.set(key, created);
    return created;
  };

  for (const row of synonymRows) {
    if (row.active === false) continue;
    const term = normalizeText(row.word);
    if (!term) continue;
    const result = ensureResult(term);
    result.synonyms = uniqueStrings([...result.synonyms, ...parseStringArray(row.synonyms)]);
  }

  for (const row of synonymRowsSecondary) {
    if (row.active === false) continue;
    const term = normalizeText(row.hitza);
    if (!term) continue;
    const result = ensureResult(term);
    result.synonyms = uniqueStrings([...result.synonyms, ...parseStringArray(row.sinonimoak)]);
  }
}

function applyScores(resultMap: Map<string, DictionarySearchResult>, query: string, mode: DictionarySearchMode) {
  for (const result of resultMap.values()) {
    let score = 0;

    score += scoreTextMatch(result.basque, query, mode, 600, 360, 220);
    if (result.spanish) {
      score += scoreTextMatch(result.spanish, query, mode, 200, 140, 90);
    }

    for (const definition of result.definitions) {
      score += scoreTextMatch(definition.text, query, mode, 110, 80, 45);
    }

    for (const synonym of result.synonyms) {
      score += scoreTextMatch(synonym, query, mode, 320, 220, 120);
    }

    if (result.source === 'dictionary') score += 40;
    result.score = score;
  }
}

const parseDefinitionsPayload = (value: unknown): DictionaryDefinition[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const text = normalizeText(candidate.text);
      if (!text) return null;

      return {
        id: candidate.id ?? text,
        text,
        order: typeof candidate.order === 'number' ? candidate.order : 0,
      } satisfies DictionaryDefinition;
    })
    .filter((item): item is DictionaryDefinition => item !== null)
    .sort((left, right) => left.order - right.order || left.text.localeCompare(right.text, 'eu'));
};

const normalizeRpcResults = (rows: DictionaryRpcRow[]): DictionarySearchResult[] =>
  rows
    .map((row) => {
      const basque = normalizeText(row.basque);
      const key = normalizeText(row.key) || normalizeSearchText(basque);
      if (!basque || !key) return null;

      return {
        key,
        basque,
        spanish: normalizeText(row.spanish) || null,
        definitions: parseDefinitionsPayload(row.definitions),
        synonyms: uniqueStrings(parseStringArray(row.synonyms)),
        score: typeof row.score === 'number' ? row.score : 0,
        source: row.source === 'dictionary' ? 'dictionary' : 'synonym_only',
      } satisfies DictionarySearchResult;
    })
    .filter((item): item is DictionarySearchResult => item !== null);

async function searchDictionaryViaRpc(
  query: string,
  mode: DictionarySearchMode,
  page: number
): Promise<DictionarySearchLoadResult | null> {
  try {
    const { supabase } = await loadSupabaseModule();
    if (!supabase) return null;

    const { data, error } = await supabase.rpc(dictionarySearchRpc, {
      search_query: query,
      search_mode: mode,
      requested_page: page,
      requested_page_size: PAGE_SIZE,
    });

    if (error) {
      if (error.code === '42883' || error.code === 'PGRST202' || /function .* does not exist/i.test(error.message)) {
        return null;
      }
      throw new Error(`${dictionarySearchRpc}: ${error.message}`);
    }

    const rows = Array.isArray(data) ? (data as DictionaryRpcRow[]) : [];
    const results = normalizeRpcResults(rows);
    const total = rows[0]?.total_count && Number.isFinite(rows[0].total_count) ? Number(rows[0].total_count) : results.length;

    return {
      ok: true,
      results,
      message:
        total > 0
          ? `${total} emaitza.`
          : mode === 'exact'
            ? 'Hitz hori ez dago hiztegian.'
            : 'Ez da emaitzarik aurkitu.',
      total,
      page: Math.max(1, page),
      pageSize: PAGE_SIZE,
    };
  } catch (error) {
    if (
      error instanceof Error
      && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))
    ) {
      return null;
    }

    throw error;
  }
}

async function searchDictionaryRows(query: string, mode: DictionarySearchMode): Promise<DictionaryRow[]> {
  const operator = sqlOperatorForMode(mode);
  const value = buildPattern(query, mode);
  const [basqueMatches, spanishMatches] = await Promise.all([
    selectSupabaseRows<DictionaryRow>(dictionaryTable, {
      select: 'id, basque, spanish',
      filters: [{ column: 'basque', operator, value }],
      limit: FETCH_LIMIT,
    }),
    selectSupabaseRows<DictionaryRow>(dictionaryTable, {
      select: 'id, basque, spanish',
      filters: [{ column: 'spanish', operator, value }],
      limit: Math.max(24, Math.floor(FETCH_LIMIT / 2)),
    }),
  ]);

  if (basqueMatches.error) {
    throw new Error(`diccionario.basque: ${basqueMatches.error.message}`);
  }
  if (spanishMatches.error) {
    throw new Error(`diccionario.spanish: ${spanishMatches.error.message}`);
  }

  return [...(basqueMatches.data ?? []), ...(spanishMatches.data ?? [])];
}

async function searchDefinitionRows(query: string, mode: DictionarySearchMode): Promise<DictionaryDefinitionRow[]> {
  const operator = sqlOperatorForMode(mode);
  const value = buildPattern(query, mode);
  const { data, error } = await selectSupabaseRows<DictionaryDefinitionRow>(dictionaryDefinitionsTable, {
    select: 'id, diccionario_id, orden, texto',
    filters: [{ column: 'texto', operator, value }],
    limit: FETCH_LIMIT,
  });

  if (error) {
    throw new Error(`diccionario_definiciones.texto: ${error.message}`);
  }

  return data ?? [];
}

async function loadActiveSynonymRows(): Promise<{ primary: SynonymGroupRow[]; secondary: SynonymGroupSecondaryRow[] }> {
  if (activeSynonymCache && activeSynonymCache.expiresAt > Date.now()) {
    return {
      primary: activeSynonymCache.primary,
      secondary: activeSynonymCache.secondary,
    };
  }

  if (activeSynonymCachePromise) {
    return activeSynonymCachePromise;
  }

  activeSynonymCachePromise = (async () => {
    const [primaryRows, secondaryRows] = await Promise.all([
      selectSupabaseRows<SynonymGroupRow>(synonymsTable, {
        select: 'id, word, synonyms, active',
        filters: [{ column: 'active', operator: 'eq', value: true }],
        limit: CLIENT_FILTER_LIMIT,
      }),
      selectSupabaseRows<SynonymGroupSecondaryRow>(synonymGroupsSecondaryTable, {
        select: 'id, hitza, sinonimoak, active, search_text',
        filters: [{ column: 'active', operator: 'eq', value: true }],
        limit: CLIENT_FILTER_LIMIT,
      }),
    ]);

    if (primaryRows.error) {
      throw new Error(`${synonymsTable}.active cache: ${primaryRows.error.message}`);
    }
    if (secondaryRows.error) {
      throw new Error(`${synonymGroupsSecondaryTable}.active cache: ${secondaryRows.error.message}`);
    }

    const cached = {
      primary: primaryRows.data ?? [],
      secondary: secondaryRows.data ?? [],
    };

    activeSynonymCache = {
      ...cached,
      expiresAt: Date.now() + ACTIVE_SYNONYM_CACHE_TTL_MS,
    };

    return cached;
  })();

  try {
    return await activeSynonymCachePromise;
  } finally {
    activeSynonymCachePromise = null;
  }
}

async function loadDefinitionsForDictionaryIds(ids: Array<number | string>): Promise<DictionaryDefinitionRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await selectSupabaseRows<DictionaryDefinitionRow>(dictionaryDefinitionsTable, {
    select: 'id, diccionario_id, orden, texto',
    filters: [{ column: 'diccionario_id', operator: 'in', value: ids }],
    limit: FETCH_LIMIT * 3,
  });

  if (error) {
    throw new Error(`diccionario_definiciones.diccionario_id: ${error.message}`);
  }

  return data ?? [];
}

async function loadDictionaryRowsForTerms(terms: string[]): Promise<DictionaryRow[]> {
  const normalizedTerms = uniqueTerms(terms);
  if (normalizedTerms.length === 0) return [];

  const { data, error } = await selectSupabaseRows<DictionaryRow>(dictionaryTable, {
    select: 'id, basque, spanish',
    filters: [{ column: 'basque', operator: 'in', value: normalizedTerms }],
    limit: Math.min(Math.max(normalizedTerms.length * 2, 24), FETCH_LIMIT * 2),
  });

  if (error) {
    throw new Error(`diccionario.basque in: ${error.message}`);
  }

  const rowsByKey = new Map<string, DictionaryRow>();
  for (const row of data ?? []) {
    if (row.id === null || row.id === undefined) continue;
    rowsByKey.set(String(row.id), row);
  }

  return Array.from(rowsByKey.values());
}

async function searchSynonymRows(
  query: string,
  mode: DictionarySearchMode
): Promise<{ primary: SynonymGroupRow[]; secondary: SynonymGroupSecondaryRow[] }> {
  const operator = sqlOperatorForMode(mode);
  const value = buildPattern(query, mode);
  const [primaryByWord, secondaryBySearchText, activeSynonymRows] = await Promise.all([
    selectSupabaseRows<SynonymGroupRow>(synonymsTable, {
      select: 'id, word, synonyms, active',
      filters: [
        { column: 'active', operator: 'eq', value: true },
        { column: 'word', operator, value },
      ],
      limit: FETCH_LIMIT,
    }),
    selectSupabaseRows<SynonymGroupSecondaryRow>(synonymGroupsSecondaryTable, {
      select: 'id, hitza, sinonimoak, active, search_text',
      filters: [
        { column: 'active', operator: 'eq', value: true },
        { column: 'search_text', operator, value },
      ],
      limit: FETCH_LIMIT,
    }),
    loadActiveSynonymRows(),
  ]);

  if (primaryByWord.error) {
    throw new Error(`${synonymsTable}.word: ${primaryByWord.error.message}`);
  }
  if (secondaryBySearchText.error) {
    throw new Error(`${synonymGroupsSecondaryTable}.search_text: ${secondaryBySearchText.error.message}`);
  }

  const matchesSynonymOption = (value: unknown): boolean =>
    parseStringArray(value).some((item) => matchesMode(item, query, mode));

  const uniquePrimary = new Map<string, SynonymGroupRow>();
  for (const row of [
    ...(primaryByWord.data ?? []),
    ...(activeSynonymRows.primary.filter((entry) => matchesSynonymOption(entry.synonyms))),
  ]) {
    if (row.id === null || row.id === undefined) continue;
    uniquePrimary.set(String(row.id), row);
  }

  const uniqueSecondary = new Map<string, SynonymGroupSecondaryRow>();
  for (const row of [
    ...(secondaryBySearchText.data ?? []),
    ...(activeSynonymRows.secondary.filter((entry) => matchesSynonymOption(entry.sinonimoak))),
  ]) {
    if (row.id === null || row.id === undefined) continue;
    uniqueSecondary.set(String(row.id), row);
  }

  return {
    primary: Array.from(uniquePrimary.values()),
    secondary: Array.from(uniqueSecondary.values()),
  };
}

async function loadSynonymRowsForTerms(terms: string[]): Promise<{ primary: SynonymGroupRow[]; secondary: SynonymGroupSecondaryRow[] }> {
  const normalizedTerms = uniqueTerms(terms);
  if (normalizedTerms.length === 0) {
    return { primary: [], secondary: [] };
  }

  const [primaryMatch, secondaryMatch] = await Promise.all([
    selectSupabaseRows<SynonymGroupRow>(synonymsTable, {
      select: 'id, word, synonyms, active',
      filters: [
        { column: 'active', operator: 'eq', value: true },
        { column: 'word', operator: 'in', value: normalizedTerms },
      ],
      limit: Math.min(Math.max(normalizedTerms.length * 2, 24), FETCH_LIMIT * 2),
    }),
    selectSupabaseRows<SynonymGroupSecondaryRow>(synonymGroupsSecondaryTable, {
      select: 'id, hitza, sinonimoak, active, search_text',
      filters: [
        { column: 'active', operator: 'eq', value: true },
        { column: 'hitza', operator: 'in', value: normalizedTerms },
      ],
      limit: Math.min(Math.max(normalizedTerms.length * 2, 24), FETCH_LIMIT * 2),
    }),
  ]);

  if (primaryMatch.error) {
    throw new Error(`${synonymsTable}.word in: ${primaryMatch.error.message}`);
  }
  if (secondaryMatch.error) {
    throw new Error(`${synonymGroupsSecondaryTable}.hitza in: ${secondaryMatch.error.message}`);
  }

  return {
    primary: primaryMatch.data ?? [],
    secondary: secondaryMatch.data ?? [],
  };
}

export async function searchDictionary(queryInput: string, requestedPage = 1): Promise<DictionarySearchLoadResult> {
  try {
    const { query, mode } = parseSearchMode(queryInput);
    const page = Math.max(1, Math.floor(requestedPage));

    if (!isSupabaseConfigured) {
      return {
        ok: false,
        results: [],
        message: 'Supabase ez dago prest; ezin da hiztegia kargatu.',
        total: 0,
        page,
        pageSize: PAGE_SIZE,
      };
    }

    if (query.length < 2) {
      return {
        ok: true,
        results: [],
        message: 'Idatzi gutxienez 2 karaktere.',
        total: 0,
        page,
        pageSize: PAGE_SIZE,
      };
    }

    const rpcResult = await searchDictionaryViaRpc(query, mode, page);
    if (rpcResult) {
      return rpcResult;
    }

    const [dictionaryMatches, definitionMatches, synonymMatches] = await Promise.all([
      searchDictionaryRows(query, mode),
      searchDefinitionRows(query, mode),
      searchSynonymRows(query, mode),
    ]);

    const dictionaryIdsFromDefinitions = uniqueStrings(
      definitionMatches
        .map((row) => (row.diccionario_id === null || row.diccionario_id === undefined ? '' : String(row.diccionario_id)))
        .filter(Boolean)
    );

    let extraDictionaryRows: DictionaryRow[] = [];
    if (dictionaryIdsFromDefinitions.length > 0) {
      const { data, error } = await selectSupabaseRows<DictionaryRow>(dictionaryTable, {
        select: 'id, basque, spanish',
        filters: [{ column: 'id', operator: 'in', value: dictionaryIdsFromDefinitions }],
        limit: FETCH_LIMIT,
      });

      if (error) {
        throw new Error(`diccionario.id: ${error.message}`);
      }

      extraDictionaryRows = data ?? [];
    }

    const allDictionaryRows = [...dictionaryMatches, ...extraDictionaryRows];
    const resultMap = buildInitialResultMap(allDictionaryRows);

    const dictionaryIds = uniqueStrings(
      allDictionaryRows
        .map((row) => (row.id === null || row.id === undefined ? '' : String(row.id)))
        .filter(Boolean)
    );
    const extraDefinitionRows = await loadDefinitionsForDictionaryIds(dictionaryIds);
    applyDefinitions(resultMap, allDictionaryRows, [...definitionMatches, ...extraDefinitionRows]);

    const synonymTermsToEnrich = Array.from(resultMap.values()).map((item) => item.basque);
    const synonymRowsForTerms = await loadSynonymRowsForTerms(synonymTermsToEnrich);
    applySynonyms(resultMap, [...synonymMatches.primary, ...synonymRowsForTerms.primary], [...synonymMatches.secondary, ...synonymRowsForTerms.secondary]);

    const enrichmentTerms = Array.from(resultMap.values()).map((item) => item.basque);
    const dictionaryRowsForSynonymResults = await loadDictionaryRowsForTerms(enrichmentTerms);
    if (dictionaryRowsForSynonymResults.length > 0) {
      applyDictionaryRows(resultMap, dictionaryRowsForSynonymResults);
      const enrichedDefinitionRows = await loadDefinitionsForDictionaryIds(
        uniqueStrings(
          dictionaryRowsForSynonymResults
            .map((row) => (row.id === null || row.id === undefined ? '' : String(row.id)))
            .filter(Boolean)
        )
      );
      applyDefinitions(resultMap, dictionaryRowsForSynonymResults, enrichedDefinitionRows);
    }

    applyScores(resultMap, query, mode);

    const allResults = Array.from(resultMap.values())
      .map((result) => ({
        ...result,
        definitions: result.definitions.filter(
          (definition, index, definitions) =>
            definitions.findIndex(
              (candidate) =>
                candidate.order === definition.order
                && normalizeSearchText(candidate.text) === normalizeSearchText(definition.text)
            ) === index
        ),
        synonyms: uniqueStrings(result.synonyms),
      }))
      .filter(
        (result) =>
          result.score > 0
          || result.definitions.some((definition) => matchesMode(definition.text, query, mode))
          || result.synonyms.some((synonym) => matchesMode(synonym, query, mode))
      )
      .sort((left, right) => right.score - left.score || left.basque.localeCompare(right.basque, 'eu'));

    const total = allResults.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * PAGE_SIZE;
    const results = allResults.slice(start, start + PAGE_SIZE);

    return {
      ok: true,
      results,
      message:
        total > 0
          ? `${total} emaitza.`
          : mode === 'exact'
            ? 'Hitz hori ez dago hiztegian.'
            : 'Ez da emaitzarik aurkitu.',
      total,
      page: safePage,
      pageSize: PAGE_SIZE,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ezin izan da hiztegia kargatu.';
    return {
      ok: false,
      results: [],
      message,
      total: 0,
      page: Math.max(1, Math.floor(requestedPage)),
      pageSize: PAGE_SIZE,
    };
  }
}
