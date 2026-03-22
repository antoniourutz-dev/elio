import { memo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, CircleUserRound, Clock, LogOut, Sparkles, XCircle } from 'lucide-react';
import clsx from 'clsx';
import type { PlayerIdentity } from '../euskeraLearning';
import type { BankState, DailyResult, DailyStoredAnswer } from '../appTypes';

interface ProfileViewProps {
  activePlayer: PlayerIdentity;
  bankState: BankState;
  weekHistory: DailyResult[];
  isLoadingData: boolean;
  onLogout: () => void;
}

const DAY_LABELS: Record<string, string> = {
  '0': 'Ig', '1': 'Al', '2': 'Az', '3': 'Az', '4': 'Og', '5': 'Or', '6': 'La',
};

function dayLabel(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00`);
  const dow = String(date.getDay());
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${DAY_LABELS[dow] ?? '?'} ${dd}/${mm}`;
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function AnswerReview({ answers }: { answers: DailyStoredAnswer[] }) {
  if (answers.length === 0) {
    return <p className="text-[0.85rem] text-[#76889a] text-center pt-2 pb-1 m-0">Ez dago xehetasunik erregistro zahar honetatik.</p>;
  }

  return (
    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-[#e1e5ee]">
      {answers.map((ans, i) => (
        <div key={`${ans.word}-${i}`} className="flex items-center flex-wrap gap-[0.55rem] text-[0.8rem]">
          <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', ans.isCorrect ? 'bg-[#2ba074]' : 'bg-[#d05060]')} />
          <span className="font-bold text-[#223748] min-w-[65px]">{ans.word}</span>
          {ans.isCorrect ? (
            <span className="font-semibold text-[#2ba074]">{ans.selected}</span>
          ) : (
            <span className="font-semibold text-[#d05060]">
              {ans.selected} <span className="text-[#2ba074] ml-[0.2rem]">-&gt; {ans.correct}</span>
            </span>
          )}
          <span className="ml-auto text-[0.65rem] font-bold text-[#76889a] bg-[#f0f4fa] py-[0.1rem] px-[0.35rem] rounded">
            {ans.type === 'spelling' ? 'Ort.' : ans.type === 'synonym' ? 'Sin.' : 'Ero.'}
          </span>
        </div>
      ))}
    </div>
  );
}

export const ProfileView = memo(function ProfileView({
  activePlayer,
  bankState,
  weekHistory,
  isLoadingData,
  onLogout,
}: ProfileViewProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const bankStatusLabel = bankState.isLoading
    ? 'Kargatzen...'
    : bankState.isReady
      ? `${bankState.entries.length} hitz prest`
      : 'Demoko hitzak';

  const toggleDay = (dayKey: string) => setExpandedDay((prev) => (prev === dayKey ? null : dayKey));

  return (
    <section className="grid gap-[18px] p-6 rounded-[32px] border border-[#e1e5ee] bg-gradient-to-b from-[rgba(255,255,255,0.98)] to-[rgba(248,252,255,0.97)] shadow-[0_4px_16px_rgba(110,130,150,0.06)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-[2.9rem] h-[2.9rem] rounded-full bg-[#f0f4fa] text-[#76889a] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <CircleUserRound className="w-[1.4rem] h-[1.4rem]" />
          </span>
          <div className="flex flex-col">
            <strong className="font-display text-[1.25rem] font-extrabold text-[#223748] leading-[1.1] tracking-[-0.02em]">{activePlayer.code}</strong>
            <span className="text-[0.8rem] text-[#76889a] font-semibold">Jokalari erregistratua</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-[0.4rem] py-[0.35rem] px-[0.65rem] rounded-xl bg-[#f0f4fa] text-[0.75rem] font-bold text-[#76889a]">
          <Sparkles className="w-4 h-4" />
          <span>{bankStatusLabel}</span>
        </div>
      </div>

      <div className="p-[1.125rem_1.25rem] rounded-[24px] bg-[rgba(248,250,253,0.96)] border border-[#e1e5ee] shadow-[0_6px_20px_rgba(110,130,150,0.06)] lg:bg-white lg:border-[#dce5ef]">
        <p className="text-[0.65rem] font-extrabold tracking-[0.14em] uppercase text-[#35b1d4] mb-2">Eguneko jokoa</p>
        <h3 className="font-display text-[1.05rem] font-extrabold text-[#223748] m-[0_0_1rem] tracking-[-0.02em]">Aste honetako partida</h3>

        {isLoadingData && (
          <div className="h-14 rounded-xl bg-[#f0f4fa] animate-[skeleton-shimmer_1.4s_ease-in-out_infinite]" aria-label="Kargatzen..." />
        )}

        {!isLoadingData && weekHistory.length === 0 && (
          <p className="text-[0.85rem] text-[#76889a] text-center p-[1rem_0] m-0">Oraindik ez duzu aste honetan jokorik jokatu.</p>
        )}

        {!isLoadingData && weekHistory.length > 0 && (
          <div className="flex flex-col gap-[0.45rem]">
            {weekHistory.map((result) => {
              const isExpanded = expandedDay === result.dayKey;
              const perfect = result.correctCount === result.totalQuestions;

              return (
                <div
                  key={result.dayKey}
                  className="bg-white border border-[#e1e5ee] rounded-[16px] p-[0.65rem_0.8rem] shadow-[0_2px_10px_rgba(107,148,165,0.04)] transition-[border-color,box-shadow] duration-150"
                >
                  <div className="flex flex-col w-full">
                    <button
                      type="button"
                      className="flex items-center w-full min-h-[44px] bg-transparent border-none p-0 text-left cursor-pointer font-inherit outline-none gap-3 hover:opacity-90"
                      onClick={() => toggleDay(result.dayKey)}
                      aria-expanded={isExpanded ? 'true' : 'false'}
                    >
                      <span className="text-[0.8rem] font-extrabold text-[#223748] min-w-[46px]">{dayLabel(result.dayKey)}</span>
                      <span className="font-extrabold text-[0.85rem] tracking-[-0.02em] text-[#35b1d4]">{result.score} pt</span>
                      <span className="flex items-center gap-[0.35rem] text-[0.8rem] font-bold text-[#223748] ml-auto">
                        {perfect ? (
                          <CheckCircle2 className="w-[0.85rem] h-[0.85rem] text-[#2ba074]" />
                        ) : (
                          <XCircle className="w-[0.85rem] h-[0.85rem] text-[#d05060]" />
                        )}
                        {result.correctCount}/{result.totalQuestions}
                      </span>
                      <span className="flex items-center gap-[0.35rem] text-[0.75rem] font-semibold text-[#76889a]">
                        <Clock className="w-[0.85rem] h-[0.85rem]" />
                        {formatSeconds(result.secondsElapsed)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#76889a] ml-1 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#76889a] ml-1 shrink-0" />
                      )}
                    </button>

                    {isExpanded && <AnswerReview answers={result.answers} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        className="flex items-center justify-center gap-[0.6rem] p-[0.8rem_1.4rem] rounded-xl bg-white border border-[#e1e5ee] text-[#d05060] font-inherit text-[0.95rem] font-bold cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-[#fcfdfe] hover:border-[#f4bac0] w-full"
        type="button"
        onClick={onLogout}
      >
        <LogOut className="w-4 h-4" />
        <span>Saioa itxi</span>
      </button>
    </section>
  );
});
