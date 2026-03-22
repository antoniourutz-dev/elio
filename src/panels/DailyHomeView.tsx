import React, { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { ArrowRight, BookOpen, ChevronDown, CirclePlay, Medal } from 'lucide-react';
import type { DailyResult, DailyRankingEntry, DailyWeeklyRankingEntry } from '../appTypes';
import { ConfirmModal } from '../components/ConfirmModal';
import { getFallbackDailyPill, loadDailyPill, PILL_CATEGORY_LABELS } from '../lib/pills';

interface DailyHomeViewProps {
  dayKey: string;
  dailyResult: DailyResult | null;
  weekHistory: DailyResult[];
  ranking: DailyRankingEntry[];
  weeklyRanking: DailyWeeklyRankingEntry[];
  myRankEntry: DailyRankingEntry | null;
  myWeekRankEntry: DailyWeeklyRankingEntry | null;
  isLoadingData: boolean;
  canStartGame: boolean;
  onStartGame: () => void;
  onGoSynonyms: () => void;
}

const BASQUE_DAYS = ['Igandea', 'Astelehena', 'Asteartea', 'Asteazkena', 'Osteguna', 'Ostirala', 'Larunbata'];
const BASQUE_MONTHS = ['urt.', 'ots.', 'mar.', 'api.', 'mai.', 'eka.', 'uzt.', 'abu.', 'ira.', 'urr.', 'aza.', 'abe.'];
const WEEK_SHORT = ['Al', 'Az', 'Az', 'Og', 'Or', 'La', 'Ig'];

function formatDayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00`);
  return `${BASQUE_DAYS[date.getDay()]}, ${date.getDate()} ${BASQUE_MONTHS[date.getMonth()]}`;
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function buildLocalKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekDays(dayKey: string): { key: string; label: string }[] {
  const ref = new Date(`${dayKey}T12:00:00`);
  const dow = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { key: buildLocalKey(d), label: WEEK_SHORT[i] };
  });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="w-[1.125rem] h-[1.125rem] text-[#c8930a]" />;
  if (rank === 2) return <Medal className="w-[1.125rem] h-[1.125rem] text-[#7a8d9c]" />;
  if (rank === 3) return <Medal className="w-[1.125rem] h-[1.125rem] text-[#9a5c3a]" />;
  return <span className="text-[0.75rem] font-bold text-slate-400">#{rank}</span>;
}

function RankingSkeleton() {
  return (
    <div className="flex flex-col gap-[0.3rem]">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-2.5 px-2.5 py-[0.55rem] rounded-xl border border-slate-200/80 bg-slate-50/70 animate-pulse"
        >
          <div className="w-5 h-5 rounded-full bg-slate-200/80" />
          <div className="h-3 rounded bg-slate-200/80" />
          <div className="w-12 h-3 rounded bg-slate-200/80" />
          <div className="w-8 h-3 rounded bg-slate-200/80" />
        </div>
      ))}
    </div>
  );
}

function EmptyRankingState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/65 px-4 py-5 text-center">
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-[0_6px_18px_rgba(148,163,184,0.14)]">
        <Medal className="w-[1rem] h-[1rem] text-slate-400" />
      </span>
      <div className="grid gap-1 max-w-[15rem]">
        <strong className="text-[0.88rem] font-extrabold text-slate-700">{title}</strong>
        <p className="m-0 text-[0.81rem] font-medium leading-relaxed text-slate-600">{body}</p>
      </div>
    </div>
  );
}

export const DailyHomeView = memo(function DailyHomeView({
  dayKey,
  dailyResult,
  weekHistory,
  ranking,
  weeklyRanking,
  myRankEntry,
  myWeekRankEntry,
  isLoadingData,
  canStartGame,
  onStartGame,
  onGoSynonyms,
}: DailyHomeViewProps) {
  const [rankTab, setRankTab] = useState<'daily' | 'weekly'>('daily');
  const [isPillExpanded, setIsPillExpanded] = useState(false);
  const [pill, setPill] = useState(() => getFallbackDailyPill(dayKey));
  const [isStartWarningOpen, setIsStartWarningOpen] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);

  const top5Daily = ranking.slice(0, 5);
  const myDailyOutside = myRankEntry && myRankEntry.rank > 5;
  const top5Weekly = weeklyRanking.slice(0, 5);
  const myWeeklyOutside = myWeekRankEntry && myWeekRankEntry.rank > 5;
  const weekDays = getWeekDays(dayKey);
  const playedKeys = new Set(weekHistory.map((result) => result.dayKey));

  useEffect(() => {
    let cancelled = false;

    void loadDailyPill(dayKey).then((nextPill) => {
      if (!cancelled) {
        setPill(nextPill);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dayKey]);

  useEffect(() => {
    if (countdownValue === null) {
      return undefined;
    }

    if (countdownValue === 0) {
      const startTimer = window.setTimeout(() => {
        setCountdownValue(null);
        onStartGame();
      }, 180);

      return () => window.clearTimeout(startTimer);
    }

    const timer = window.setTimeout(() => {
      setCountdownValue((current) => (current === null ? null : current - 1));
    }, 820);

    return () => window.clearTimeout(timer);
  }, [countdownValue, onStartGame]);

  const handleDailyStartClick = () => {
    if (!canStartGame || isLoadingData || countdownValue !== null) {
      return;
    }

    setIsStartWarningOpen(true);
  };

  const handleConfirmDailyStart = () => {
    setIsStartWarningOpen(false);
    setCountdownValue(3);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="flex flex-col gap-[0.95rem]"
      >
      <div className="relative p-4 sm:p-[1.2rem] rounded-[1.25rem] border border-[rgba(138,205,206,0.34)] overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_32%),linear-gradient(135deg,#2fb8d1_0%,#43c4b8_42%,#84d398_78%,#d4e46b_100%)] shadow-[0_26px_56px_rgba(62,170,170,0.24),0_10px_24px_rgba(62,170,170,0.14)]">
        <div className="absolute rounded-full pointer-events-none -top-14 -right-4 w-[14rem] h-[14rem] bg-[radial-gradient(circle,rgba(255,255,255,0.16),rgba(255,255,255,0.02)_62%,transparent_72%)]" aria-hidden="true" />
        <div className="absolute rounded-full pointer-events-none -bottom-18 -left-8 w-[12rem] h-[12rem] bg-[radial-gradient(circle,rgba(255,255,255,0.09),transparent_68%)]" aria-hidden="true" />

        <div className="relative z-10 flex items-start justify-between mb-2 sm:mb-[0.6rem]">
          <div className="grid gap-[0.1rem]">
            <h2 className="font-display text-[1.6rem] font-extrabold text-white leading-none m-0 tracking-[-.04em]">Eguneko jokoa</h2>
            <p className="text-[0.82rem] font-bold text-white/84 m-0 capitalize">{formatDayKey(dayKey)}</p>
          </div>
        </div>

        <motion.div
          className="relative z-10 flex items-end gap-[0.3rem] mt-2 mb-[0.4rem] sm:mb-[0.5rem]"
          initial="initial"
          animate="animate"
          variants={{
            animate: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {weekDays.map(({ key, label }) => {
            const played = playedKeys.has(key);
            const isToday = key === dayKey;

            return (
              <motion.div
                key={key}
                className="flex flex-col items-center gap-[0.28rem] flex-1 will-change-transform"
                variants={{
                  initial: { opacity: 0, y: 12, scale: 0.8 },
                  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 12, stiffness: 200 } },
                }}
              >
                <div
                  className={clsx(
                    'flex items-center justify-center rounded-full transition-[transform,background-color] duration-150 ease-out',
                    played && !isToday && 'w-[26px] h-[26px] bg-white/90 border border-white/95 text-[#48c8ba]',
                    !played && !isToday && 'w-[26px] h-[26px] bg-white/20 border-[1.5px] border-white/40',
                    !played && isToday && 'w-[30px] h-[30px] border-2 border-white/85 bg-white/20 text-white',
                    played && isToday && 'w-[30px] h-[30px] border-2 border-white/85 bg-white text-[#2e9e93]'
                  )}
                >
                  {played && (
                    <svg viewBox="0 0 10 10" className="w-[14px] h-[14px]">
                      <polyline points="2,5.5 4,8 8,2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={clsx('text-[0.6rem] font-bold uppercase tracking-[0.02em]', isToday ? 'text-white/95' : 'text-white/65')}>{label}</span>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="relative z-10 grid mt-[0.875rem]">
          {isLoadingData ? (
            <button type="button" className="flex items-center justify-center gap-2 w-full min-h-[3.2rem] rounded-full text-[1rem] font-extrabold bg-white/95 text-[#2a5c6a] shadow-[0_14px_32px_rgba(0,0,0,0.14)] opacity-55 cursor-not-allowed" disabled>
              <CirclePlay className="w-[18px] h-[18px]" />
              <span>Kargatzen...</span>
            </button>
          ) : dailyResult ? (
            <button type="button" className="flex items-center justify-center gap-2 w-full min-h-[3.2rem] rounded-full text-[1rem] font-extrabold bg-white/90 text-[#466673] border border-white/35 opacity-100 cursor-default" disabled>
              <span>Bihar berriz</span>
            </button>
          ) : (
            <button
              type="button"
              className={clsx(
                'flex items-center justify-center gap-2 w-full min-h-[3.2rem] rounded-full text-[1rem] font-extrabold bg-white/95 text-[#1f5563] shadow-[0_14px_32px_rgba(0,0,0,0.14)] will-change-transform',
                canStartGame && countdownValue === null
                  ? 'animate-[play-button-entrance_0.5s_cubic-bezier(0.34,1.56,0.64,1)_0.3s_both] hover:bg-white hover:shadow-[0_18px_40px_rgba(0,0,0,0.18)] active:scale-95 transition-transform duration-75 ease-out'
                  : 'opacity-55 cursor-not-allowed'
              )}
              onClick={handleDailyStartClick}
              disabled={!canStartGame || countdownValue !== null}
            >
              <CirclePlay className="w-[18px] h-[18px]" />
              <span>{countdownValue !== null ? 'Prest...' : canStartGame ? 'Hasi jokoa' : 'Datuak prestatzen...'}</span>
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        className={clsx(
          'block w-full p-0 text-left cursor-pointer rounded-[1.25rem] bg-white border border-slate-200 border-t-[3px] shadow-[0_2px_12px_rgba(40,50,60,0.04)] overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-[2px] hover:shadow-[0_14px_36px_rgba(0,0,0,0.09)] focus-visible:outline-[3px] focus-visible:outline-purple-500/20 focus-visible:outline-offset-[3px]',
          pill.tone === 'gramatika' && 'border-t-[#45c8ba]',
          pill.tone === 'ortografia' && 'border-t-[#3ec4aa]',
          pill.tone === 'hiztegia' && 'border-t-[#e8a820]',
          pill.tone === 'puntuazioa' && 'border-t-[#8a50c8]',
          pill.tone === 'historia' && 'border-t-[#d05070]',
          !['gramatika', 'ortografia', 'hiztegia', 'puntuazioa', 'historia'].includes(pill.tone) && 'border-t-slate-300'
        )}
        aria-expanded={isPillExpanded}
        onClick={() => setIsPillExpanded((current) => !current)}
      >
        <div className="grid gap-[0.4rem] pt-[0.9rem] px-[1.1rem] pb-[0.75rem] bg-transparent">
          <div className="flex items-center justify-between gap-2">
            <span
              className={clsx(
                'text-[0.62rem] font-extrabold tracking-[0.12em] uppercase',
                (pill.tone === 'gramatika' || pill.tone === 'ortografia') && 'text-[#2aab9a]',
                pill.tone === 'hiztegia' && 'text-[#c48010]',
                pill.tone === 'puntuazioa' && 'text-[#7a40b8]',
                pill.tone === 'historia' && 'text-[#b83858]',
                !['gramatika', 'ortografia', 'hiztegia', 'puntuazioa', 'historia'].includes(pill.tone) && 'text-slate-500'
              )}
            >
              {pill.category || PILL_CATEGORY_LABELS[pill.tone]}
            </span>
            <span className="inline-flex items-center gap-[0.55rem]">
              <span className="text-[0.6rem] font-bold text-slate-500 bg-slate-100/90 border border-slate-200 rounded-full px-[0.55rem] py-[0.12rem] whitespace-nowrap">Eguneko pilula</span>
              <ChevronDown className={clsx('w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0', isPillExpanded && 'rotate-180')} />
            </span>
          </div>
          <h3 className="font-display text-[1rem] font-extrabold tracking-[-.025em] text-slate-800 m-0 leading-snug">{pill.title}</h3>
        </div>

        <div
          className={clsx(
            'grid bg-transparent px-[1.1rem] overflow-hidden transition-all duration-300 ease-in-out',
            isPillExpanded ? 'max-h-80 opacity-100 pb-4 gap-3' : 'max-h-0 opacity-0 pb-0 gap-0'
          )}
        >
          <p className="text-[0.88rem] font-medium text-slate-800 leading-[1.68] m-0">{pill.body}</p>
          {pill.example && (
            <div
              className={clsx(
                'flex flex-col gap-[0.2rem] py-[0.6rem] px-[0.8rem] rounded-lg border-l-[3px]',
                pill.tone === 'gramatika' && 'border-[#45c8ba] bg-[#d6f8f4]/50',
                pill.tone === 'ortografia' && 'border-[#3ec4aa] bg-[#d6f8ee]/50',
                pill.tone === 'hiztegia' && 'border-[#e8a820] bg-[#fff6d6]/55',
                pill.tone === 'puntuazioa' && 'border-[#8a50c8] bg-[#f4eaff]/55',
                pill.tone === 'historia' && 'border-[#d05070] bg-[#ffe8ee]/55',
                !['gramatika', 'ortografia', 'hiztegia', 'puntuazioa', 'historia'].includes(pill.tone) && 'border-slate-300 bg-slate-50'
              )}
            >
              <span className="text-[0.58rem] font-extrabold tracking-[0.1em] uppercase text-slate-400">Adibidea</span>
              <span className="text-[0.84rem] font-semibold text-slate-800 leading-normal italic">{pill.example}</span>
            </div>
          )}
        </div>
      </button>

        <button
          type="button"
          className="flex items-center gap-4 py-[1.05rem] px-[1.2rem] bg-[linear-gradient(135deg,#4db6a5_0%,#5fc8bd_34%,#86d2a6_68%,#cfe07e_100%)] border border-[rgba(113,201,181,0.34)] rounded-2xl cursor-pointer text-left w-full shadow-[0_16px_36px_rgba(77,182,165,0.24),0_4px_12px_rgba(77,182,165,0.12)] transition-[transform,box-shadow,filter,border-color] duration-150 ease-out hover:-translate-y-[2px] hover:border-[rgba(77,182,165,0.48)] hover:shadow-[0_22px_44px_rgba(77,182,165,0.3)] active:scale-[0.98] active:translate-y-0 active:duration-75"
          onClick={onGoSynonyms}
      >
        <span className="inline-flex items-center justify-center w-[46px] h-[46px] rounded-xl bg-white/18 border border-white/36 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          <BookOpen className="w-[1.25rem] h-[1.25rem] text-white" />
          </span>
          <div className="flex flex-col gap-[0.2rem] flex-1 min-w-0">
            <span className="text-[0.78rem] font-semibold text-white/82">Ikasketa modua</span>
            <strong className="text-[0.96rem] font-extrabold text-white">Sinonimoak ikasi</strong>
        </div>
        <ArrowRight className="w-[1.1rem] h-[1.1rem] text-white/80 shrink-0 opacity-100" />
      </button>

      <div className="p-4 sm:p-[0.95rem] rounded-[1.7rem] bg-white/90 shadow-[0_18px_44px_rgba(120,146,168,0.13),0_5px_18px_rgba(120,146,168,0.07)]">
        <div className="flex items-center gap-[0.4rem] mb-[0.9rem]">
          <div className="grid grid-cols-2 flex-1 bg-[rgba(230,236,243,0.8)] rounded-xl p-[3px] gap-[2px]">
            <button
              type="button"
              className={clsx('flex-1 py-[0.28rem] px-0 rounded-[10px] text-[0.78rem] font-bold cursor-pointer border-none tracking-[0.01em] transition-[background-color,color,box-shadow] duration-150', rankTab === 'daily' ? 'bg-white text-slate-800 shadow-[0_1px_6px_rgba(100,140,165,0.14)]' : 'bg-transparent text-slate-500 hover:text-slate-800')}
              onClick={() => setRankTab('daily')}
            >
              Gaur
            </button>
            <button
              type="button"
              className={clsx('flex-1 py-[0.28rem] px-0 rounded-[10px] text-[0.78rem] font-bold cursor-pointer border-none tracking-[0.01em] transition-[background-color,color,box-shadow] duration-150', rankTab === 'weekly' ? 'bg-white text-slate-800 shadow-[0_1px_6px_rgba(100,140,165,0.14)]' : 'bg-transparent text-slate-500 hover:text-slate-800')}
              onClick={() => setRankTab('weekly')}
            >
              Astea
            </button>
          </div>
          {isLoadingData && <span className="ml-auto inline-flex h-2.5 w-12 rounded-full bg-slate-200/80 animate-pulse" />}
        </div>

        {rankTab === 'daily' && (
          <>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key="daily-ranking"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex flex-col gap-[0.3rem]"
              >
                {isLoadingData && <RankingSkeleton />}
                {!isLoadingData && ranking.length === 0 && (
                  <EmptyRankingState
                    title="Gaurko sailkapena hutsik dago oraindik"
                    body="Lehen partida amaitzen denean hemen ikusiko dira eguneko emaitzarik onenak."
                  />
                )}
                {top5Daily.map((entry) => (
                <div
                  key={entry.playerCode}
                  className={clsx(
                    'grid grid-cols-[2rem_1fr_auto_auto] items-center gap-2.5 px-2.5 py-[0.55rem] rounded-[10px] border border-transparent transition-colors duration-150',
                    entry.playerCode === myRankEntry?.playerCode ? 'bg-emerald-50/60 border-emerald-200/60 rounded-xl' : 'hover:bg-slate-50',
                    entry.rank === 1 && entry.playerCode !== myRankEntry?.playerCode && 'bg-gradient-to-r from-[#ffeca0]/55 to-[#fff8d2]/30 border border-[#dcb43c]/25 rounded-xl'
                  )}
                >
                  <RankBadge rank={entry.rank} />
                  <span className="font-bold text-[0.85rem] overflow-hidden text-ellipsis whitespace-nowrap">{entry.playerCode}</span>
                  <span className="font-extrabold text-[0.85rem] text-slate-800 tracking-[-0.02em]">{entry.score} pt</span>
                  <span className="text-[0.75rem] text-slate-500 font-semibold">{formatSeconds(entry.secondsElapsed)}</span>
                </div>
                ))}
                {myDailyOutside && (
                  <>
                    <div className="text-center text-slate-400 text-[0.8rem] tracking-widest py-0.5">...</div>
                    <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-2.5 px-2.5 py-[0.55rem] rounded-xl bg-emerald-50/60 border border-emerald-200/60 transition-colors duration-150">
                      <RankBadge rank={myRankEntry.rank} />
                      <span className="font-bold text-[0.85rem] overflow-hidden text-ellipsis whitespace-nowrap">{myRankEntry.playerCode}</span>
                      <span className="font-extrabold text-[0.85rem] text-slate-800 tracking-[-0.02em]">{myRankEntry.score} pt</span>
                      <span className="text-[0.75rem] text-slate-500 font-semibold">{formatSeconds(myRankEntry.secondsElapsed)}</span>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {rankTab === 'weekly' && (
          <>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key="weekly-ranking"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex flex-col gap-[0.3rem]"
              >
                {isLoadingData && <RankingSkeleton />}
                {!isLoadingData && weeklyRanking.length === 0 && (
                  <EmptyRankingState
                    title="Asteko sailkapena hutsik dago oraindik"
                    body="Astean zehar puntuak pilatzen direnean hemen ikusiko da nor doan aurretik."
                  />
                )}
                {top5Weekly.map((entry) => (
                <div
                  key={entry.playerCode}
                  className={clsx(
                    'grid grid-cols-[2rem_1fr_auto_auto] items-center gap-2.5 px-2.5 py-[0.55rem] rounded-[10px] border border-transparent transition-colors duration-150',
                    entry.playerCode === myWeekRankEntry?.playerCode ? 'bg-emerald-50/60 border-emerald-200/60 rounded-xl' : 'hover:bg-slate-50',
                    entry.rank === 1 && entry.playerCode !== myWeekRankEntry?.playerCode && 'bg-gradient-to-r from-[#ffeca0]/55 to-[#fff8d2]/30 border border-[#dcb43c]/25 rounded-xl'
                  )}
                >
                  <RankBadge rank={entry.rank} />
                  <span className="font-bold text-[0.85rem] overflow-hidden text-ellipsis whitespace-nowrap">{entry.playerCode}</span>
                  <span className="font-extrabold text-[0.85rem] text-slate-800 tracking-[-0.02em]">{entry.totalScore} pt</span>
                  <span className="text-[0.75rem] text-slate-500 font-semibold">{entry.daysPlayed} egun</span>
                </div>
                ))}
                {myWeeklyOutside && (
                  <>
                    <div className="text-center text-slate-400 text-[0.8rem] tracking-widest py-0.5">...</div>
                    <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-2.5 px-2.5 py-[0.55rem] rounded-xl bg-emerald-50/60 border border-emerald-200/60 transition-colors duration-150">
                      <RankBadge rank={myWeekRankEntry.rank} />
                      <span className="font-bold text-[0.85rem] overflow-hidden text-ellipsis whitespace-nowrap">{myWeekRankEntry.playerCode}</span>
                      <span className="font-extrabold text-[0.85rem] text-slate-800 tracking-[-0.02em]">{myWeekRankEntry.totalScore} pt</span>
                      <span className="text-[0.75rem] text-slate-500 font-semibold">{myWeekRankEntry.daysPlayed} egun</span>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
      </motion.div>

      <ConfirmModal
        isOpen={isStartWarningOpen}
        title="Kontuz"
        message="Partida hasi ondoren ezin izango duzu gelditu edo bertan behera utzi. Prest zaude?"
        confirmLabel="Hasi"
        cancelLabel="Utzi"
        onConfirm={handleConfirmDailyStart}
        onCancel={() => setIsStartWarningOpen(false)}
      />

      <AnimatePresence>
        {countdownValue !== null && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[rgba(13,27,38,0.56)] backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="relative flex flex-col items-center gap-3">
              <div className="absolute inset-0 rounded-full blur-3xl bg-[radial-gradient(circle,rgba(112,233,206,0.4),transparent_68%)]" aria-hidden="true" />
              <span className="relative text-[0.88rem] font-black uppercase tracking-[0.22em] text-white/72">Prestatu</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={countdownValue}
                  className="relative font-display text-[6.4rem] leading-none font-black tracking-[-0.08em] text-white drop-shadow-[0_18px_38px_rgba(7,20,31,0.38)]"
                  initial={{ opacity: 0, scale: 0.6, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.12, y: -14 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                >
                  {countdownValue}
                </motion.span>
              </AnimatePresence>
              <span className="relative text-[0.92rem] font-bold text-white/82">Eguneko erronka hastear dago</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
