import { memo, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useVerbForms } from '../hooks/useVerbForms';
import {
  formatTenseLabel,
  formatVerbValueLabel,
  sortArgumentValues,
  VERB_TYPE_LABELS,
} from '../lib/verbs';
import type { VerbFormRecord, VerbType } from '../lib/verbs';

interface VerbsViewProps {
  isActive: boolean;
}

type SelectableValue = string | null;

const VERB_TYPES: VerbType[] = ['nor', 'nor_nork', 'nor_nori', 'nor_nori_nork'];

const chooseNextValue = (options: string[], current: SelectableValue): SelectableValue =>
  current && options.includes(current) ? current : (options[0] ?? null);

const getUniqueValues = (
  rows: VerbFormRecord[],
  key: 'tense' | 'numberType' | 'nor' | 'nori' | 'nork'
): string[] => Array.from(new Set(rows.map((row) => row[key]).filter((value): value is string => Boolean(value))));

const filterNorNorkRows = (rows: VerbFormRecord[]): VerbFormRecord[] => {
  const detailedRows = rows.filter((row) => row.nor);
  return detailedRows.length > 0 ? detailedRows : rows.filter((row) => row.numberType);
};

const StepHeader = ({
  index,
  title,
  helper,
  tone,
}: {
  index: string;
  title: string;
  helper: string;
  tone: {
    bar: string;
    bubbleBorder: string;
    bubbleBg: string;
    bubbleText: string;
  };
}) => (
  <>
    <div className={clsx('absolute inset-x-0 top-0 h-1', tone.bar)} />
    <div className="mb-4 flex items-center gap-3">
      <span
        className={clsx(
          'inline-flex h-8 w-8 items-center justify-center rounded-full border text-[0.78rem] font-black',
          tone.bubbleBorder,
          tone.bubbleBg,
          tone.bubbleText
        )}
      >
        {index}
      </span>
      <div className="grid gap-0.5">
        <div className="text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">{title}</div>
        <div className="text-[0.82rem] font-semibold text-[var(--muted)]">{helper}</div>
      </div>
    </div>
  </>
);

const LoadingCard = () => (
  <div className="grid gap-5 rounded-[34px] border border-[rgba(216,224,231,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,249,0.95))] p-6 shadow-[var(--shadow-card)] animate-pulse">
    <div className="grid gap-2">
      <div className="h-3 w-24 rounded-full bg-[rgba(94,182,160,0.18)]" />
      <div className="h-12 max-w-[24rem] rounded-[20px] bg-[rgba(33,48,67,0.08)]" />
      <div className="flex gap-2">
        <div className="h-7 w-20 rounded-full bg-[rgba(33,48,67,0.08)]" />
        <div className="h-7 w-24 rounded-full bg-[rgba(33,48,67,0.08)]" />
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[30px] border border-[rgba(216,224,231,0.8)] bg-white/84 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[rgba(33,48,67,0.08)]" />
          <div className="grid gap-2">
            <div className="h-3 w-20 rounded-full bg-[rgba(33,48,67,0.1)]" />
            <div className="h-3 w-32 rounded-full bg-[rgba(33,48,67,0.08)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-14 rounded-[18px] bg-[rgba(33,48,67,0.08)]" />
          ))}
        </div>
      </div>

      <div className="rounded-[30px] border border-[rgba(216,224,231,0.8)] bg-white/84 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[rgba(33,48,67,0.08)]" />
          <div className="grid gap-2">
            <div className="h-3 w-24 rounded-full bg-[rgba(33,48,67,0.1)]" />
            <div className="h-3 w-28 rounded-full bg-[rgba(33,48,67,0.08)]" />
          </div>
        </div>
        <div className="h-14 rounded-[18px] bg-[rgba(33,48,67,0.08)]" />
      </div>
    </div>

    <div className="rounded-[32px] border border-[rgba(84,190,162,0.22)] bg-[linear-gradient(135deg,rgba(246,255,252,0.98),rgba(228,248,240,0.95))] p-6">
      <div className="h-3 w-20 rounded-full bg-[rgba(37,148,134,0.18)]" />
      <div className="mx-auto mt-8 h-12 w-32 rounded-[16px] bg-[rgba(37,148,134,0.14)]" />
    </div>
  </div>
);

const ErrorCard = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="grid gap-4 rounded-[28px] border border-[rgba(224,192,149,0.3)] bg-[linear-gradient(135deg,rgba(255,248,242,0.98),rgba(255,238,225,0.96))] p-5 shadow-[0_14px_30px_rgba(201,130,52,0.08)]">
    <div className="flex items-start gap-3">
      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#c78044]" />
      <div className="grid gap-2">
        <h3 className="m-0 font-display text-[1.45rem] tracking-[-0.04em] text-[#6f4624]">Aditzak ezin izan dira kargatu</h3>
        <p className="m-0 text-[0.95rem] font-semibold leading-relaxed text-[#8c6544]">{message}</p>
      </div>
    </div>
    <div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-full bg-[#c98234] px-4 py-2 text-[0.88rem] font-extrabold text-white shadow-[0_14px_26px_rgba(201,130,52,0.26)] transition-transform duration-150 hover:-translate-y-[1px]"
      >
        <RefreshCw className="h-4 w-4" />
        Berriro saiatu
      </button>
    </div>
  </div>
);

const ArgumentGroup = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: SelectableValue;
  options: string[];
  onChange: (nextValue: string) => void;
}) => {
  if (options.length === 0) return null;

  return (
      <div className="grid min-w-0 gap-3">
      <div className="text-[0.78rem] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</div>
      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => {
          const isActive = value === option;

          return (
            <button
              key={`${label}-${option}`}
              type="button"
              onClick={() => onChange(option)}
              className={clsx(
                'min-w-0 rounded-[16px] border px-4 py-2.5 text-center text-[0.9rem] font-extrabold leading-tight [overflow-wrap:anywhere] transition-[transform,border-color,background-color,color,box-shadow] duration-150 hover:-translate-y-[1px]',
                isActive
                  ? 'border-[rgba(56,183,178,0.42)] bg-[rgba(229,249,244,0.98)] text-[var(--primary-deep)] shadow-[0_14px_28px_rgba(56,183,178,0.16)]'
                  : 'border-[rgba(220,228,236,0.9)] bg-white/88 text-[var(--muted)]'
              )}
            >
              {formatVerbValueLabel(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ResultCard = ({
  verbType,
  tense,
  result,
  summary,
}: {
  verbType: VerbType;
  tense: string;
  result: VerbFormRecord | null;
  summary: string[];
}) => (
  <div className="relative overflow-hidden rounded-[32px] border border-[rgba(84,190,162,0.22)] bg-[linear-gradient(135deg,rgba(246,255,252,0.98),rgba(228,248,240,0.95))] p-6 shadow-[0_20px_44px_rgba(77,166,146,0.12)]">
    <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#2db3ad,#79d5a4,#d8ea62)]" />

    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="text-[0.74rem] font-extrabold uppercase tracking-[0.18em] text-[#2a9f8f]">Emaitza</div>
          <div className="text-[0.82rem] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">
            {VERB_TYPE_LABELS[verbType]} / {formatTenseLabel(tense)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-[28px] border border-white/60 bg-white/78 px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        {result ? (
          <>
            <div className="font-display text-[clamp(2.3rem,7vw,4rem)] leading-none tracking-[-0.06em] text-[#107a67]">
              {result.form}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {summary.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[rgba(220,231,235,0.9)] bg-[rgba(246,250,251,0.98)] px-3 py-1 text-[0.8rem] font-extrabold text-[var(--muted)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="grid gap-2">
            <div className="font-display text-[1.8rem] tracking-[-0.05em] text-[var(--text-2)]">Ez dago forma erabilgarririk</div>
            <div className="text-[0.95rem] font-semibold text-[var(--muted)]">Aukeratu beste konbinazio bat.</div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const VerbsView = memo(function VerbsView({ isActive }: VerbsViewProps) {
  const { isLoading, forms, message, isReady, refresh } = useVerbForms(isActive);
  const [selectedVerbType, setSelectedVerbType] = useState<VerbType>('nor');
  const [selectedTense, setSelectedTense] = useState<SelectableValue>(null);
  const [selectedNumberType, setSelectedNumberType] = useState<SelectableValue>(null);
  const [selectedNor, setSelectedNor] = useState<SelectableValue>(null);
  const [selectedNori, setSelectedNori] = useState<SelectableValue>(null);
  const [selectedNork, setSelectedNork] = useState<SelectableValue>(null);

  const availableVerbTypes = VERB_TYPES.filter((verbType) => forms.some((form) => form.verbType === verbType));
  const activeVerbType = availableVerbTypes.includes(selectedVerbType) ? selectedVerbType : (availableVerbTypes[0] ?? 'nor');

  useEffect(() => {
    if (activeVerbType !== selectedVerbType) {
      setSelectedVerbType(activeVerbType);
    }
  }, [activeVerbType, selectedVerbType]);

  const verbTypeRows = forms.filter((form) => form.verbType === activeVerbType);
  const availableTenses = Array.from(new Set(verbTypeRows.map((form) => form.tense))).sort((left, right) =>
    left.localeCompare(right, 'eu', { sensitivity: 'base' })
  );
  availableTenses.sort((left, right) => {
    const ordered = [
      'oraina',
      'iragana',
      'baldintza',
      'hipotetikoa',
      'hipotetikoa_oraina',
      'hipotetikoa_iragana',
      'ahalera',
      'ahalera_oraina',
      'ahalera_iragana',
      'ahalera_alegiazkoa',
      'subjuntiboa_oraina',
      'subjuntiboa_iragana',
    ];
    return (ordered.indexOf(left) === -1 ? Number.MAX_SAFE_INTEGER : ordered.indexOf(left))
      - (ordered.indexOf(right) === -1 ? Number.MAX_SAFE_INTEGER : ordered.indexOf(right))
      || left.localeCompare(right, 'eu');
  });
  const activeTense = chooseNextValue(availableTenses, selectedTense);

  useEffect(() => {
    if (activeTense !== selectedTense) {
      setSelectedTense(activeTense);
    }
  }, [activeTense, selectedTense]);

  const tenseRows = activeTense ? verbTypeRows.filter((form) => form.tense === activeTense) : [];
  const calculatorRows = activeVerbType === 'nor_nork' ? filterNorNorkRows(tenseRows) : tenseRows;
  const usesNumberType =
    activeVerbType === 'nor_nori_nork'
    || (activeVerbType === 'nor_nork' && calculatorRows.every((row) => !row.nor && Boolean(row.numberType)));

  const numberTypeRows =
    usesNumberType && selectedNumberType ? calculatorRows.filter((row) => row.numberType === selectedNumberType) : calculatorRows;
  const norRows = !usesNumberType && selectedNor ? calculatorRows.filter((row) => row.nor === selectedNor) : numberTypeRows;
  const noriRows = selectedNori ? norRows.filter((row) => row.nori === selectedNori) : norRows;

  const numberTypeOptions = usesNumberType ? sortArgumentValues(getUniqueValues(calculatorRows, 'numberType'), 'numberType') : [];
  const norOptions = !usesNumberType ? sortArgumentValues(getUniqueValues(calculatorRows, 'nor'), 'nor') : [];
  const noriOptions =
    activeVerbType === 'nor_nori' || activeVerbType === 'nor_nori_nork'
      ? sortArgumentValues(getUniqueValues(usesNumberType ? numberTypeRows : norRows, 'nori'), 'nori')
      : [];
  const norkOptions =
    activeVerbType === 'nor_nork' || activeVerbType === 'nor_nori_nork'
      ? sortArgumentValues(getUniqueValues(noriRows, 'nork'), 'nork')
      : [];

  const activeNumberType = chooseNextValue(numberTypeOptions, selectedNumberType);
  const activeNor = chooseNextValue(norOptions, selectedNor);
  const activeNori = chooseNextValue(noriOptions, selectedNori);
  const activeNork = chooseNextValue(norkOptions, selectedNork);

  useEffect(() => {
    if (activeNumberType !== selectedNumberType) {
      setSelectedNumberType(activeNumberType);
    }
  }, [activeNumberType, selectedNumberType]);

  useEffect(() => {
    if (activeNor !== selectedNor) {
      setSelectedNor(activeNor);
    }
  }, [activeNor, selectedNor]);

  useEffect(() => {
    if (activeNori !== selectedNori) {
      setSelectedNori(activeNori);
    }
  }, [activeNori, selectedNori]);

  useEffect(() => {
    if (activeNork !== selectedNork) {
      setSelectedNork(activeNork);
    }
  }, [activeNork, selectedNork]);

  const result = calculatorRows.find(
    (row) =>
      (!usesNumberType || row.numberType === activeNumberType)
      && (usesNumberType || !norOptions.length || row.nor === activeNor)
      && (!noriOptions.length || row.nori === activeNori)
      && (!norkOptions.length || row.nork === activeNork)
  ) ?? null;

  const summary = [activeNumberType, activeNor, activeNori, activeNork]
    .filter((value): value is string => Boolean(value))
    .map(formatVerbValueLabel);

  if (isLoading && forms.length === 0) {
    return <LoadingCard />;
  }

  if (!isLoading && !isReady && forms.length === 0) {
    return <ErrorCard message={message} onRetry={() => void refresh()} />;
  }

  return (
    <section className="grid gap-4 rounded-[34px] border border-[rgba(216,224,231,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,249,0.95))] p-6 shadow-[var(--shadow-card)]">
      <div className="grid gap-2">
        <p className="m-0 text-[0.74rem] font-extrabold uppercase tracking-[0.18em] text-[#cf6d56]">Aditzak</p>
        <div className="grid gap-2">
          <h2 className="m-0 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[0.92] tracking-[-0.06em] text-[var(--text)]">
            Aditz jokagailua
          </h2>
          <p className="m-0 max-w-[30rem] text-[0.9rem] font-medium leading-relaxed text-[var(--muted)]">
            Aukeratu kasua, denbora eta argumentuak; forma zuzena berehala agertzen da.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[rgba(225,232,238,0.94)] bg-[rgba(248,250,252,0.96)] px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">
            {availableVerbTypes.length} kasu
          </span>
          <span className="rounded-full border border-[rgba(225,232,238,0.94)] bg-[rgba(248,250,252,0.96)] px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">
            {availableTenses.length} denbora
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid min-w-0 gap-4">
          <div className="relative overflow-hidden rounded-[28px] border border-[rgba(227,234,240,0.88)] bg-white/86 p-5 shadow-[0_12px_28px_rgba(118,137,154,0.08)]">
            <StepHeader
              index="1"
              title="Kasua"
              helper="Lehenik aditz mota aukeratu."
              tone={{
                bar: 'bg-[linear-gradient(90deg,#4dc8c0,#8ddfbc)]',
                bubbleBorder: 'border-[rgba(105,214,194,0.34)]',
                bubbleBg: 'bg-[rgba(235,251,246,0.96)]',
                bubbleText: 'text-[#188f7e]',
              }}
            />
            <div className="grid min-w-0 grid-cols-2 gap-3">
              {availableVerbTypes.map((verbType) => (
                <button
                  key={verbType}
                  type="button"
                  onClick={() => setSelectedVerbType(verbType)}
                  className={clsx(
                    'min-w-0 rounded-[18px] border px-4 py-3.5 text-center text-[0.94rem] font-extrabold leading-tight [overflow-wrap:anywhere] transition-[transform,border-color,background-color,color,box-shadow] duration-150 hover:-translate-y-[1px]',
                    activeVerbType === verbType
                      ? 'border-[rgba(56,183,178,0.46)] bg-[rgba(232,249,244,0.98)] text-[var(--primary-deep)] shadow-[0_18px_34px_rgba(56,183,178,0.12)]'
                      : 'border-[rgba(226,233,239,0.92)] bg-[rgba(248,250,252,0.96)] text-[var(--muted)]'
                  )}
                >
                  {VERB_TYPE_LABELS[verbType]}
                </button>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-[rgba(227,234,240,0.88)] bg-white/86 p-5 shadow-[0_12px_28px_rgba(118,137,154,0.08)]">
            <StepHeader
              index="2"
              title="Denbora / Modua"
              helper="Egoera egokia aukeratu."
              tone={{
                bar: 'bg-[linear-gradient(90deg,#72baf3,#adcaf8)]',
                bubbleBorder: 'border-[rgba(127,183,237,0.34)]',
                bubbleBg: 'bg-[rgba(236,245,255,0.96)]',
                bubbleText: 'text-[#4b82c8]',
              }}
            />
            <label className="flex items-center gap-3 rounded-[18px] border border-[rgba(218,226,233,0.88)] bg-[rgba(249,251,252,0.98)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <select
                value={activeTense ?? ''}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedTense(event.target.value)}
                className="w-full appearance-none border-0 bg-transparent p-0 text-[0.98rem] font-extrabold text-[var(--text)] outline-none"
              >
                {availableTenses.map((tense) => (
                  <option key={tense} value={tense}>
                    {formatTenseLabel(tense)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-[rgba(227,234,240,0.88)] bg-white/86 p-5 shadow-[0_12px_28px_rgba(118,137,154,0.08)]">
            <StepHeader
              index="3"
              title="Argumentuak"
              helper="Nor, nori eta nork doitu."
              tone={{
                bar: 'bg-[linear-gradient(90deg,#ef8e70,#f5bc88)]',
                bubbleBorder: 'border-[rgba(237,151,118,0.34)]',
                bubbleBg: 'bg-[rgba(255,242,236,0.98)]',
                bubbleText: 'text-[#cd6b54]',
              }}
            />
            <div className="grid gap-4">
              <ArgumentGroup
                label="Zenbakia"
                value={activeNumberType}
                options={numberTypeOptions}
                onChange={setSelectedNumberType}
              />
              <ArgumentGroup
                label="Nor"
                value={activeNor}
                options={norOptions}
                onChange={setSelectedNor}
              />
              <ArgumentGroup
                label="Nori"
                value={activeNori}
                options={noriOptions}
                onChange={setSelectedNori}
              />
              <ArgumentGroup
                label="Nork"
                value={activeNork}
                options={norkOptions}
                onChange={setSelectedNork}
              />
            </div>
          </div>
        </div>

        <div className="self-start xl:sticky xl:top-3">
          <ResultCard
            verbType={activeVerbType}
            tense={activeTense ?? ''}
            result={result}
            summary={summary}
          />
        </div>
      </div>
    </section>
  );
});
