import { memo, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ChevronLeft, ChevronRight, Heart, Search, X } from 'lucide-react';
import { useDictionarySearch } from '../hooks/useDictionarySearch';
import { DictionaryResultCard } from '../components/dictionary/DictionaryResultCard';
import { useDictionaryFavorites } from '../hooks/useDictionaryFavorites';

interface DictionaryViewProps {
  isActive: boolean;
  playerId?: string | null;
}

const SEARCH_DEBOUNCE_MS = 280;

export const DictionaryView = memo(function DictionaryView({ isActive, playerId = null }: DictionaryViewProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const { results, total, message, isLoading, isError, refresh, normalizedQuery, highlightQuery, page: currentPage, pageSize } =
    useDictionarySearch(debouncedQuery, page, isActive);
  const { favorites, favoriteKeys, toggleFavorite } = useDictionaryFavorites(playerId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery]);

  const dictionaryFieldShellClass =
    'relative flex items-center gap-3 min-h-[60px] px-4 rounded-[24px] border border-[rgba(208,224,233,0.92)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(247,250,252,0.95))] shadow-[0_12px_28px_rgba(90,128,139,0.08)] transition-all duration-150 focus-within:border-[rgba(107,184,217,0.48)] focus-within:bg-[rgba(252,254,255,0.99)] focus-within:shadow-[0_0_0_4px_rgba(107,184,217,0.07),0_16px_30px_rgba(90,128,139,0.1)]';

  const dictionaryFieldInputClass =
    'w-full min-w-0 appearance-none rounded-none border-0! bg-transparent outline-none! shadow-none! ring-0! text-[var(--text)] text-[1rem] font-extrabold caret-[#3bb5b1] focus:border-0! focus:outline-none! focus:shadow-none! focus:ring-0! placeholder:text-[var(--muted)]/90';

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, currentPage * pageSize);

  return (
    <section className="grid gap-3">
      <div className="grid gap-4 rounded-[34px] border border-[rgba(216,224,231,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(247,249,249,0.94))] p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-2.5">
          <div className="inline-flex w-fit items-center rounded-full border border-[rgba(232,211,170,0.62)] bg-[linear-gradient(180deg,rgba(255,249,241,0.98),rgba(255,244,228,0.95))] px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
            <p className="m-0 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-[#c28a21]">Hiztegia</p>
          </div>
          <h2 className="m-0 max-w-[8ch] font-display text-[clamp(2rem,4vw,2.9rem)] leading-[0.88] tracking-[-0.075em] text-[var(--text)]">
            Bilatu hitzak
          </h2>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className={dictionaryFieldShellClass}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(232,249,244,0.98),rgba(243,251,248,0.95))] text-[#17897d] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input
                type="search"
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                placeholder="Hitza, definizioa edo sinonimoa..."
                className={dictionaryFieldInputClass}
              />
              {query.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(216,226,241,0.92)] bg-white/96 text-[var(--muted)] transition-all hover:border-[rgba(184,202,214,0.92)] hover:text-[var(--text)]"
                  aria-label="Bilaketa garbitu"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </span>
          </label>

          <div className="grid gap-2.5">
            {normalizedQuery.length < 2 ? (
              <div className="grid gap-2.5 rounded-[1.7rem] border border-dashed border-[rgba(204,217,224,0.88)] bg-[linear-gradient(180deg,rgba(249,251,252,0.88),rgba(244,248,249,0.84))] px-5 py-6">
                <p className="m-0 font-display text-[1.55rem] leading-none tracking-[-0.05em] text-[var(--text)]">
                  Bilatu azkar
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[rgba(241,246,248,0.96)] px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
                    hitz zehatza
                  </span>
                  <span className="rounded-full bg-[rgba(241,246,248,0.96)] px-3 py-1 text-[0.8rem] font-bold text-[var(--muted)]">
                    abe*
                  </span>
                  <span className="rounded-full bg-[rgba(241,246,248,0.96)] px-3 py-1 text-[0.8rem] font-bold text-[var(--muted)]">
                    *kor
                  </span>
                </div>
              </div>
            ) : null}

            {!isLoading && normalizedQuery.length < 2 && favorites.length > 0 ? (
              <div className="grid gap-2.5">
                <div className="flex items-center justify-between gap-3 px-1">
                  <span className="inline-flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-[#17897d]">
                    <Heart className="h-3.5 w-3.5" fill="currentColor" />
                    Gogokoak
                  </span>
                  <span className="rounded-full bg-[rgba(241,246,248,0.96)] px-2.5 py-1 text-[0.76rem] font-bold text-[var(--muted)]">
                    {favorites.length}
                  </span>
                </div>
                <div className="grid gap-2.5">
                  {favorites.map((favorite) => (
                    <DictionaryResultCard
                      key={favorite.key}
                      result={{
                        ...favorite,
                        score: 0,
                      }}
                      isFavorite={favoriteKeys.has(favorite.key)}
                      onFavoriteToggle={toggleFavorite}
                      onSynonymClick={(value) => setQuery(value)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {isLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid gap-2.5 rounded-[1.6rem] border border-[rgba(220,228,235,0.72)] bg-white/90 px-4 py-4 animate-pulse"
                  >
                    <div className="h-5 w-36 rounded-full bg-slate-100/90" />
                    <div className="h-4 w-28 rounded-full bg-slate-100/80" />
                    <div className="h-16 rounded-[1rem] bg-slate-100/80" />
                  </div>
                ))}
              </div>
            ) : null}

            {!isLoading && isError ? (
              <div className="grid gap-3 rounded-[1.6rem] border border-[rgba(233,189,189,0.38)] bg-[linear-gradient(180deg,rgba(255,250,249,0.98),rgba(250,242,240,0.96))] px-5 py-5">
                <p className="m-0 font-display text-[1.45rem] leading-none tracking-[-0.05em] text-[var(--text)]">
                  Hiztegia ezin izan da kargatu
                </p>
                <p className="m-0 text-[0.92rem] font-semibold leading-relaxed text-[var(--muted)]">
                  {message}
                </p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="inline-flex min-h-[2.7rem] w-fit items-center justify-center rounded-full bg-[linear-gradient(180deg,#0b6f69,#0c847b)] px-4 text-[0.9rem] font-black text-white"
                >
                  Berriro saiatu
                </button>
              </div>
            ) : null}

            {!isLoading && !isError && normalizedQuery.length >= 2 && results.length === 0 ? (
              <div className="grid gap-2 rounded-[1.6rem] border border-dashed border-[rgba(202,214,223,0.88)] bg-[rgba(248,250,251,0.86)] px-5 py-8 text-center">
                <p className="m-0 font-display text-[1.45rem] leading-none tracking-[-0.05em] text-[var(--text)]">
                  Ez da emaitzarik aurkitu
                </p>
                <p className="m-0 text-[0.92rem] font-semibold leading-relaxed text-[var(--muted)]">
                  {message}
                </p>
              </div>
            ) : null}

            {!isLoading && !isError && results.length > 0 ? (
              <>
                <div className="grid gap-2.5 px-1">
                  {totalPages > 1 ? (
                    <div className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-[rgba(223,230,235,0.84)] bg-[rgba(249,251,252,0.82)] px-2.5 py-2 text-[0.8rem] font-bold text-[var(--muted)]">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={currentPage <= 1}
                        className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-full px-2.5 text-[var(--text)] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Aurrekoa</span>
                      </button>

                      <span className="rounded-full bg-white/82 px-3 py-1 text-center leading-tight text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                        <span className="block text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
                          Orria
                        </span>
                        {currentPage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        disabled={currentPage >= totalPages}
                        className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-full px-2.5 text-[var(--text)] transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <span>Hurrengoa</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-[#17897d]">
                      Emaitzak
                    </span>
                    <span className="rounded-full bg-[rgba(241,246,248,0.96)] px-2.5 py-1 text-[0.76rem] font-bold text-[var(--muted)]">
                      {rangeStart}-{rangeEnd} / {total}
                    </span>
                  </div>
                </div>
                <div className="grid gap-2.5">
                  {results.map((result) => (
                    <DictionaryResultCard
                      key={result.key}
                      result={result}
                      highlightQuery={highlightQuery}
                      isFavorite={favoriteKeys.has(result.key)}
                      onFavoriteToggle={toggleFavorite}
                      onSynonymClick={(value) => setQuery(value)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
});
