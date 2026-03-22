import { memo, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Clock, LogOut, Mountain, Trophy, XCircle } from 'lucide-react';
import clsx from 'clsx';
import type { PlayerIdentity } from '../euskeraLearning';
import { GAME_LEVELS, getResolvedLevelRecord } from '../euskeraLearning';
import type { GameLevel, GameProgress, SynonymEntry } from '../euskeraLearning';
import type { DailyResult, DailyStoredAnswer } from '../appTypes';
import { formatMeters } from '../formatters';
import { getAvatarForPlayer } from '../lib/avatars';

interface ProfileViewProps {
  activePlayer: PlayerIdentity;
  weekHistory: DailyResult[];
  isLoadingData: boolean;
  progress: GameProgress;
  entries: SynonymEntry[];
  onStudyLevel: (level: GameLevel) => void;
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
  weekHistory,
  isLoadingData,
  progress,
  entries,
  onStudyLevel,
  onLogout,
}: ProfileViewProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const avatar = useMemo(() => getAvatarForPlayer(activePlayer), [activePlayer]);

  const summitedLevels = useMemo(
    () =>
      GAME_LEVELS.filter((level) => {
        const record = getResolvedLevelRecord(progress, entries, level);
        return (record?.bestScore ?? 0) >= 100;
      }),
    [progress, entries]
  );

  const toggleDay = (dayKey: string) => setExpandedDay((prev) => (prev === dayKey ? null : dayKey));

  return (
    <section className="grid gap-5 p-6 rounded-[32px] border border-[#e1e5ee] bg-gradient-to-b from-[rgba(255,255,255,0.98)] to-[rgba(248,252,255,0.97)] shadow-[0_4px_16px_rgba(110,130,150,0.06)]">

      {/* ── Header ── */}
      <div className="flex items-center gap-3.5">
        <span className="flex h-14 w-14 shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-[rgba(77,182,165,0.28)] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.96),rgba(229,246,242,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_20px_rgba(61,160,144,0.2)]">
          <img src={avatar.src} alt={avatar.label} className="h-11 w-11 object-contain" />
        </span>
        <div className="flex-1 min-w-0">
          <strong className="font-display text-[1.3rem] font-extrabold text-[#1a2e3b] leading-none tracking-[-0.03em] block">{activePlayer.code}</strong>
          <span className="text-[0.78rem] text-[#76889a] font-semibold">Jokalari erregistratua</span>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Gailurrak', value: `${summitedLevels.length}/${GAME_LEVELS.length}` },
          { label: 'Hitzak', value: entries.length > 0 ? `${entries.length}` : '—' },
          { label: 'Partida', value: weekHistory.length > 0 ? `${weekHistory.length}` : '0' },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 rounded-[18px] bg-[rgba(240,245,250,0.9)] border border-[rgba(216,226,241,0.6)] py-3 px-2">
            <strong className="font-display text-[1.3rem] font-extrabold text-[#1a2e3b] leading-none tracking-[-0.04em]">{value}</strong>
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#a5b5c4]">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Achievements ── */}
      {summitedLevels.length > 0 && (
        <div className="grid gap-2.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#c48a10]" />
            <p className="text-[0.65rem] font-extrabold tracking-[0.14em] uppercase text-[#c48a10] m-0">Lorpenak</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2.5">
            {summitedLevels.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => onStudyLevel(level)}
                className="achievement-card-sheen group relative overflow-hidden flex flex-col items-center gap-2 rounded-[22px] bg-[linear-gradient(160deg,rgba(255,250,220,0.99),rgba(255,232,140,0.95))] border border-[rgba(210,160,40,0.28)] px-3 py-4 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.65)_inset,0_6px_20px_rgba(190,140,20,0.16)] transition-[transform,box-shadow] duration-150 hover:-translate-y-[2px] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.75)_inset,0_10px_28px_rgba(190,140,20,0.24)]"
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[linear-gradient(145deg,#f5c842,#d4890a)] shadow-[0_4px_12px_rgba(190,130,10,0.28),0_1px_0_rgba(255,255,255,0.45)_inset]">
                  <Mountain className="w-5 h-5 text-white drop-shadow-sm" />
                </span>
                <div className="min-w-0 w-full">
                  <strong className="block font-display text-[0.92rem] font-extrabold text-[#5a3a00] tracking-[-0.03em] truncate leading-snug">
                    {level.name}
                  </strong>
                  <span className="text-[0.72rem] font-bold text-[#b07a18] tabular-nums">
                    {formatMeters(level.elevationMeters)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Weekly history ── */}
      <div className="p-[1.125rem_1.25rem] rounded-[24px] bg-[rgba(248,250,253,0.96)] border border-[#e1e5ee] shadow-[0_6px_20px_rgba(110,130,150,0.06)] lg:bg-white lg:border-[#dce5ef]">
        <p className="text-[0.65rem] font-extrabold tracking-[0.14em] uppercase text-[#35b1d4] mb-2">Historia</p>
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
                      aria-expanded={isExpanded}
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
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[#b0bfcc] font-inherit text-[0.82rem] font-bold cursor-pointer transition-colors duration-150 hover:text-[#d05060] w-full"
        type="button"
        onClick={onLogout}
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Saioa itxi</span>
      </button>
    </section>
  );
});
