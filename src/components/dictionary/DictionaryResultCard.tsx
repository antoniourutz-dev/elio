import { memo } from 'react';
import { Heart } from 'lucide-react';
import type { DictionarySearchResult } from '../../lib/dictionary';
import { HighlightedLessonText } from '../lessons/LessonText';

interface DictionaryResultCardProps {
  result: DictionarySearchResult;
  highlightQuery?: string;
  onSynonymClick?: (value: string) => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (result: DictionarySearchResult) => void;
}

const normalizeForMatch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('eu');

function getHighlightRanges(text: string, query: string): Array<{ start: number; end: number }> {
  const cleanQuery = normalizeForMatch(query).trim();
  if (cleanQuery.length < 2) return [];

  const characters = Array.from(text);
  let normalizedText = '';
  const normalizedIndexToCharacterIndex: number[] = [];

  characters.forEach((character, characterIndex) => {
    const normalizedCharacter = normalizeForMatch(character);
    for (const normalizedPiece of Array.from(normalizedCharacter)) {
      normalizedText += normalizedPiece;
      normalizedIndexToCharacterIndex.push(characterIndex);
    }
  });

  const ranges: Array<{ start: number; end: number }> = [];
  let searchStart = 0;

  while (searchStart < normalizedText.length) {
    const matchIndex = normalizedText.indexOf(cleanQuery, searchStart);
    if (matchIndex === -1) break;

    const start = normalizedIndexToCharacterIndex[matchIndex];
    const endIndex = normalizedIndexToCharacterIndex[matchIndex + cleanQuery.length - 1];
    if (start !== undefined && endIndex !== undefined) {
      ranges.push({ start, end: endIndex + 1 });
    }
    searchStart = matchIndex + cleanQuery.length;
  }

  return ranges;
}

function SubtleSearchHighlight({ text, query }: { text: string; query?: string }) {
  const ranges = getHighlightRanges(text, query ?? '');
  if (ranges.length === 0) {
    return <>{text}</>;
  }

  const characters = Array.from(text);
  const nodes: Array<string | JSX.Element> = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      nodes.push(characters.slice(cursor, range.start).join(''));
    }

    nodes.push(
      <mark
        key={`mark-${index}-${range.start}`}
        className="rounded-[0.38rem] bg-[rgba(144,224,208,0.2)] text-inherit not-italic no-underline decoration-transparent [text-decoration:none]"
      >
        {characters.slice(range.start, range.end).join('')}
      </mark>
    );

    cursor = range.end;
  });

  if (cursor < characters.length) {
    nodes.push(characters.slice(cursor).join(''));
  }

  return <>{nodes}</>;
}

export const DictionaryResultCard = memo(function DictionaryResultCard({
  result,
  highlightQuery,
  onSynonymClick,
  isFavorite = false,
  onFavoriteToggle,
}: DictionaryResultCardProps) {
  const hasDefinitions = result.definitions.length > 0;

  return (
    <article className="relative overflow-hidden rounded-[1.65rem] border border-[rgba(218,227,233,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,251,0.95))] px-4 py-4 shadow-[0_16px_30px_rgba(104,129,146,0.075)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,rgba(43,191,164,0.92),rgba(201,238,221,0.65),transparent)]"
      />

      <header className="grid gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="m-0 min-w-0 flex-1 font-display text-[1.52rem] leading-[0.9] tracking-[-0.06em] text-[var(--text)]">
            {highlightQuery ? (
              <SubtleSearchHighlight text={result.basque} query={highlightQuery} />
            ) : (
              <HighlightedLessonText text={result.basque} tone="soft" />
            )}
          </h3>

          <button
            type="button"
            onClick={() => onFavoriteToggle?.(result)}
            disabled={!onFavoriteToggle}
            aria-label={isFavorite ? 'Gogokoetatik kendu' : 'Gogokoetan gorde'}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(219,227,232,0.88)] bg-[rgba(255,255,255,0.96)] text-[var(--muted)] transition-all duration-150 hover:-translate-y-[1px] hover:border-[rgba(233,166,178,0.55)] hover:text-[#d96781] disabled:cursor-default"
          >
            <Heart
              className="h-[1.05rem] w-[1.05rem]"
              fill={isFavorite ? 'currentColor' : 'none'}
            />
          </button>
        </div>
        {result.spanish && !hasDefinitions ? (
          <p className="m-0 max-w-[34ch] text-[0.86rem] font-semibold leading-relaxed text-[var(--muted)]">
            <SubtleSearchHighlight text={result.spanish} query={highlightQuery} />
          </p>
        ) : null}
      </header>

      {hasDefinitions ? (
        <div className="mt-2.5 grid gap-1.5 rounded-[1.15rem] border border-[rgba(235,241,245,0.84)] bg-[linear-gradient(180deg,rgba(248,250,251,0.92),rgba(243,247,249,0.88))] px-3.5 py-2.5">
          {result.definitions.map((definition, index) => (
            <div
              key={definition.id}
              className={index > 0 ? 'grid gap-1.5 border-t border-[rgba(226,234,239,0.84)] pt-2' : 'grid gap-1.5'}
            >
              <p className="m-0 text-[0.88rem] font-semibold leading-relaxed text-[var(--text)]">
                <SubtleSearchHighlight text={definition.text} query={highlightQuery} />
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {result.synonyms.length > 0 ? (
        <div className="mt-2.5 grid gap-2">
          <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[var(--muted)]">
            Sinonimoak
          </span>
          <div className="flex flex-wrap gap-1.5">
            {result.synonyms.map((synonym) => (
              <button
                key={synonym}
                type="button"
                onClick={() => onSynonymClick?.(synonym)}
                disabled={!onSynonymClick}
                className="rounded-full border border-[rgba(196,227,218,0.78)] bg-[linear-gradient(180deg,rgba(242,251,248,0.98),rgba(235,247,243,0.95))] px-3 py-1.5 text-[0.76rem] font-bold text-[#177f76] transition-all duration-150 hover:-translate-y-[1px] hover:bg-[rgba(232,247,241,0.98)] hover:shadow-[0_8px_16px_rgba(113,173,161,0.1)] disabled:cursor-default"
              >
                <SubtleSearchHighlight text={synonym} query={highlightQuery} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
});
