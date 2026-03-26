import { useQuery } from '@tanstack/react-query';
import { measureAsyncOperation } from '../lib/performanceMetrics';
import { searchDictionary } from '../lib/dictionary';

const normalizeQuery = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('eu');

const normalizeQueryForThreshold = (value: string): string =>
  value
    .replace(/^\*+/, '')
    .replace(/\*+$/, '')
    .trim();

export function useDictionarySearch(query: string, page: number, enabled: boolean) {
  const normalizedQuery = normalizeQuery(query);
  const thresholdQuery = normalizeQueryForThreshold(normalizedQuery);

  const queryState = useQuery({
    queryKey: ['dictionary-search', normalizedQuery, page],
    queryFn: () =>
      measureAsyncOperation('query', 'dictionary-search', () => searchDictionary(normalizedQuery, page), {
        details: { query: normalizedQuery, page },
      }),
    enabled: enabled && thresholdQuery.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  return {
    normalizedQuery,
    highlightQuery: thresholdQuery,
    results: queryState.data?.results ?? [],
    total: queryState.data?.total ?? 0,
    page: queryState.data?.page ?? page,
    pageSize: queryState.data?.pageSize ?? 24,
    message:
      thresholdQuery.length < 2
        ? 'Idatzi hitz bat edo bi karaktere gutxienez.'
        : queryState.data?.message ?? (queryState.error instanceof Error ? queryState.error.message : 'Bilatzen...'),
    isLoading: queryState.isLoading,
    isReady: queryState.data?.ok ?? false,
    isError: queryState.isError || queryState.data?.ok === false,
    refresh: queryState.refetch,
  };
}
