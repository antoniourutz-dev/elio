import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DictionarySearchResult } from '../lib/dictionary';
import {
  readDictionaryFavorites,
  toDictionaryFavorite,
  writeDictionaryFavorites,
  type DictionaryFavoriteEntry,
} from '../lib/dictionaryFavorites';

export function useDictionaryFavorites(playerId: string | null | undefined) {
  const [favorites, setFavorites] = useState<DictionaryFavoriteEntry[]>(() => readDictionaryFavorites(playerId));

  useEffect(() => {
    setFavorites(readDictionaryFavorites(playerId));
  }, [playerId]);

  const favoriteKeys = useMemo(() => new Set(favorites.map((favorite) => favorite.key)), [favorites]);

  const toggleFavorite = useCallback(
    (result: DictionarySearchResult) => {
      if (!playerId) return;

      setFavorites((current) => {
        const exists = current.some((favorite) => favorite.key === result.key);
        const next = exists
          ? current.filter((favorite) => favorite.key !== result.key)
          : [toDictionaryFavorite(result), ...current.filter((favorite) => favorite.key !== result.key)];

        writeDictionaryFavorites(playerId, next);
        return next;
      });
    },
    [playerId]
  );

  return {
    favorites,
    favoriteKeys,
    toggleFavorite,
  };
}
