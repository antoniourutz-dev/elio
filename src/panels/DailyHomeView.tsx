import React, { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { BookOpen, ChevronDown, CirclePlay, Languages, LibraryBig, Medal, Sigma } from 'lucide-react';
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
  onGoLearn: () => void;
  onGoSynonyms: () => void;
  onGoGrammar: () => void;
  onGoVocabulary: () => void;
  onGoVerbs: () => void;
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
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 px-3 py-3 rounded-[18px] border border-[rgba(220,228,235,0.88)] bg-[linear-gradient(180deg,rgba(252,253,252,0.95),rgba(245,248,248,0.9))] animate-pulse"
        >
          <div className="w-6 h-6 rounded-full bg-slate-200/80" />
          <div className="h-3 rounded-full bg-slate-200/80" />
          <div className="w-12 h-3 rounded-full bg-slate-200/80" />
          <div className="w-8 h-3 rounded-full bg-slate-200/80" />
        </div>
      ))}
    </div>
  );
}

function EmptyRankingState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-[24px] border border-dashed border-[rgba(211,220,227,0.9)] bg-[rgba(248,250,250,0.92)] px-4 py-6 text-center">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
        <Medal className="w-[1rem] h-[1rem] text-slate-400" />
      </span>
      <div className="grid gap-1 max-w-[15rem]">
        <strong className="text-[0.9rem] font-extrabold text-slate-700">{title}</strong>
        <p className="m-0 text-[0.82rem] font-medium leading-relaxed text-slate-600">{body}</p>
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
  onGoLearn: _onGoLearn,
  onGoSynonyms,
  onGoGrammar,
  onGoVocabulary,
  onGoVerbs,
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
  const learnActions = [
    {
      id: 'synonyms',
      title: 'Sinonimoak',
      icon: BookOpen,
      onClick: onGoSynonyms,
      cardClass:
        'border-[rgba(90,197,182,0.24)] bg-[linear-gradient(135deg,rgba(244,255,251,0.98),rgba(224,249,241,0.96))] hover:border-[rgba(90,197,182,0.38)] hover:shadow-[0_24px_48px_rgba(90,197,182,0.16)]',
      iconClass: 'border-[rgba(90,197,182,0.2)] bg-[rgba(83,197,190,0.12)] text-[#279486]',
      bodyClass: 'text-[#6d857e]',
    },
    {
      id: 'grammar',
      title: 'Gramatika',
      icon: Languages,
      onClick: onGoGrammar,
      cardClass:
        'border-[rgba(130,167,229,0.24)] bg-[linear-gradient(135deg,rgba(246,250,255,0.98),rgba(230,242,253,0.96))] hover:border-[rgba(130,167,229,0.38)] hover:shadow-[0_24px_48px_rgba(130,167,229,0.16)]',
      iconClass: 'border-[rgba(130,167,229,0.2)] bg-[rgba(124,183,232,0.12)] text-[#4c82be]',
      bodyClass: 'text-[#72859a]',
    },
    {
      id: 'vocabulary',
      title: 'Hiztegia',
      icon: LibraryBig,
      onClick: onGoVocabulary,
      cardClass:
        'border-[rgba(223,183,79,0.24)] bg-[linear-gradient(135deg,rgba(255,252,243,0.98),rgba(252,245,220,0.96))] hover:border-[rgba(223,183,79,0.38)] hover:shadow-[0_24px_48px_rgba(223,183,79,0.16)]',
      iconClass: 'border-[rgba(223,183,79,0.2)] bg-[rgba(229,182,59,0.12)] text-[#b17d16]',
      bodyClass: 'text-[#8f8158]',
    },
    {
      id: 'verbs',
      title: 'Aditzak',
      icon: Sigma,
      onClick: onGoVerbs,
      cardClass:
        'border-[rgba(229,140,122,0.24)] bg-[linear-gradient(135deg,rgba(255,247,244,0.98),rgba(253,233,226,0.96))] hover:border-[rgba(229,140,122,0.38)] hover:shadow-[0_24px_48px_rgba(229,140,122,0.16)]',
      iconClass: 'border-[rgba(229,140,122,0.2)] bg-[rgba(229,140,122,0.12)] text-[#c46f5f]',
      bodyClass: 'text-[#93746b]',
    },
  ] as const;

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
        className="grid gap-4"
      >
      <section className="relative overflow-hidden rounded-[34px] border border-[rgba(132,206,194,0.26)] bg-[linear-gradient(135deg,#42bcb6_0%,#5bc7b2_38%,#98d29b_72%,#d5e57d_100%)] p-[0.95rem] shadow-[0_18px_40px_rgba(80,167,154,0.16),0_6px_18px_rgba(80,167,154,0.08)] sm:p-[1.1rem]">
        <div className="absolute inset-x-0 top-0 h-px bg-white/40" />
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.18),transparent_68%)]" aria-hidden="true" />
        <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.09),transparent_72%)]" aria-hidden="true" />

        <div className="relative z-10 grid gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <h2 className="m-0 font-display text-[clamp(1.8rem,5vw,2.7rem)] leading-[0.9] tracking-[-0.07em] text-white">Eguneko jokoa</h2>
              <p className="m-0 text-[0.86rem] font-bold capitalize text-white/84">{formatDayKey(dayKey)}</p>
            </div>
          </div>

        <motion.div
          className="grid grid-cols-7 gap-1.5 rounded-[24px] border border-white/18 bg-[rgba(255,255,255,0.12)] px-2.5 py-2.5 backdrop-blur-[10px]"
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
                className="flex flex-col items-center gap-1 will-change-transform"
                variants={{
                  initial: { opacity: 0, y: 12, scale: 0.8 },
                  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 12, stiffness: 200 } },
                }}
              >
                <div
                  className={clsx(
                    'flex items-center justify-center rounded-full transition-[transform,background-color,border-color] duration-150 ease-out',
                    played && !isToday && 'h-8 w-8 border border-white/94 bg-white text-[#3ca89f]',
                    !played && !isToday && 'h-8 w-8 border border-white/34 bg-white/10',
                    !played && isToday && 'h-[2.35rem] w-[2.35rem] border-2 border-white/88 bg-white/12 text-white',
                    played && isToday && 'h-[2.35rem] w-[2.35rem] border-2 border-white/88 bg-white text-[#2a8b84]'
                  )}
                >
                  {played && (
                    <svg viewBox="0 0 10 10" className={clsx(isToday ? 'h-[15px] w-[15px]' : 'h-[14px] w-[14px]')}>
                      <polyline points="2,5.5 4,8 8,2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={clsx('text-[0.58rem] font-extrabold uppercase tracking-[0.08em]', isToday ? 'text-white' : 'text-white/72')}>{label}</span>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid">
          {isLoadingData ? (
            <button type="button" className="flex min-h-[3.55rem] w-full items-center justify-center gap-2 rounded-full border border-white/44 bg-[rgba(255,255,255,0.92)] text-[1rem] font-extrabold text-[#305566] opacity-55" disabled>
              <CirclePlay className="h-[18px] w-[18px]" />
              <span>Kargatzen...</span>
            </button>
          ) : dailyResult ? (
            <button type="button" className="flex min-h-[3.55rem] w-full items-center justify-center gap-2 rounded-full border border-white/34 bg-[rgba(255,255,255,0.88)] text-[1rem] font-extrabold text-[#4d6872]" disabled>
              <span>Bihar berriz</span>
            </button>
          ) : (
            <button
              type="button"
              className={clsx(
                'flex min-h-[3.55rem] w-full items-center justify-center gap-2 rounded-full border border-white/50 bg-[rgba(255,255,255,0.96)] text-[1rem] font-extrabold text-[#244c58] shadow-[0_16px_36px_rgba(34,71,84,0.16)]',
                canStartGame && countdownValue === null
                  ? 'animate-[play-button-entrance_0.5s_cubic-bezier(0.34,1.56,0.64,1)_0.3s_both] transition-[transform,box-shadow] duration-150 hover:-translate-y-[1px] hover:shadow-[0_22px_42px_rgba(34,71,84,0.2)] active:scale-[0.985]'
                  : 'cursor-not-allowed opacity-55'
              )}
              onClick={handleDailyStartClick}
              disabled={!canStartGame || countdownValue !== null}
            >
              <CirclePlay className="h-[18px] w-[18px]" />
              <span>{countdownValue !== null ? 'Prest...' : canStartGame ? 'Hasi jokoa' : 'Datuak prestatzen...'}</span>
            </button>
          )}
        </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {learnActions.map(({ id, title, icon: Icon, onClick, cardClass, iconClass, bodyClass }) => (
          <button
            key={id}
            type="button"
            className={clsx(
              'group flex min-w-0 items-center gap-3 rounded-[26px] border px-4 py-4 text-left shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-[2px] hover:shadow-[var(--shadow-card)]',
              cardClass
            )}
            onClick={onClick}
          >
            <span className={clsx('inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]', iconClass)}>
              <Icon className="h-[1.4rem] w-[1.4rem]" />
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block font-display text-[clamp(1rem,3.5vw,1.2rem)] font-extrabold leading-[0.9] tracking-[-0.05em] text-[#223246] text-balance">
                {title}
              </strong>
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        className={clsx(
          'block w-full cursor-pointer overflow-hidden rounded-[30px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(249,250,250,0.92))] p-0 text-left shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[2px] hover:shadow-[var(--shadow-card)]',
          pill.tone === 'gramatika' && 'border-[rgba(93,198,180,0.28)]',
          pill.tone === 'ortografia' && 'border-[rgba(82,193,165,0.28)]',
          pill.tone === 'hiztegia' && 'border-[rgba(223,183,79,0.28)]',
          pill.tone === 'puntuazioa' && 'border-[rgba(164,133,220,0.28)]',
          pill.tone === 'historia' && 'border-[rgba(218,123,143,0.28)]',
          !['gramatika', 'ortografia', 'hiztegia', 'puntuazioa', 'historia'].includes(pill.tone) && 'border-[rgba(214,222,229,0.8)]'
        )}
        aria-expanded={isPillExpanded}
        onClick={() => setIsPillExpanded((current) => !current)}
      >
        <div className="grid gap-2 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span
              className={clsx(
                'text-[0.68rem] font-extrabold uppercase tracking-[0.18em]',
                (pill.tone === 'gramatika' || pill.tone === 'ortografia') && 'text-[#279486]',
                pill.tone === 'hiztegia' && 'text-[#b07d13]',
                pill.tone === 'puntuazioa' && 'text-[#775bb5]',
                pill.tone === 'historia' && 'text-[#c2576a]',
                !['gramatika', 'ortografia', 'hiztegia', 'puntuazioa', 'historia'].includes(pill.tone) && 'text-slate-500'
              )}
            >
              {pill.category || PILL_CATEGORY_LABELS[pill.tone]}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full border border-[rgba(215,223,231,0.9)] bg-[rgba(243,246,249,0.96)] px-3 py-1 text-[0.66rem] font-extrabold text-[#71849a]">Eguneko pilula</span>
              <ChevronDown className={clsx('h-4 w-4 shrink-0 text-[#8ea0b0] transition-transform duration-200', isPillExpanded && 'rotate-180')} />
            </span>
          </div>
          <h3 className="m-0 font-display text-[1.18rem] font-extrabold leading-[1.02] tracking-[-0.04em] text-[#223246]">{pill.title}</h3>
        </div>

        <div
          className={clsx(
            'grid overflow-hidden px-5 transition-all duration-300 ease-in-out',
            isPillExpanded ? 'max-h-80 gap-3 pb-5 opacity-100' : 'max-h-0 gap-0 pb-0 opacity-0'
          )}
        >
          <p className="m-0 text-[0.92rem] font-medium leading-[1.68] text-[#516577]">{pill.body}</p>
          {pill.example && (
            <div
              className={clsx(
                'flex flex-col gap-1 rounded-[18px] px-4 py-3',
                pill.tone === 'gramatika' && 'bg-[rgba(224,249,241,0.9)]',
                pill.tone === 'ortografia' && 'bg-[rgba(222,248,238,0.9)]',
                pill.tone === 'hiztegia' && 'bg-[rgba(253,245,218,0.94)]',
                pill.tone === 'puntuazioa' && 'bg-[rgba(242,235,252,0.94)]',
                pill.tone === 'historia' && 'bg-[rgba(253,235,240,0.94)]',
                !['gramatika', 'ortografia', 'hiztegia', 'puntuazioa', 'historia'].includes(pill.tone) && 'bg-[rgba(244,247,249,0.94)]'
              )}
            >
              <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-[#8a9aa7]">Adibidea</span>
              <span className="text-[0.88rem] font-semibold italic leading-relaxed text-[#485a69]">{pill.example}</span>
            </div>
          )}
        </div>
      </button>

      <section className="rounded-[32px] border border-[rgba(216,224,231,0.86)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,249,249,0.94))] p-4 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid flex-1 grid-cols-2 gap-[3px] rounded-[18px] bg-[rgba(235,240,244,0.92)] p-1.5">
            <button
              type="button"
              className={clsx(
                'rounded-[14px] px-0 py-2 text-[0.82rem] font-extrabold tracking-[0.01em] transition-[background-color,color,box-shadow] duration-150',
                rankTab === 'daily'
                  ? 'bg-white text-[#223246] shadow-[0_10px_20px_rgba(108,124,139,0.12)]'
                  : 'bg-transparent text-[#7c8c9c]'
              )}
              onClick={() => setRankTab('daily')}
            >
              Gaur
            </button>
            <button
              type="button"
              className={clsx(
                'rounded-[14px] px-0 py-2 text-[0.82rem] font-extrabold tracking-[0.01em] transition-[background-color,color,box-shadow] duration-150',
                rankTab === 'weekly'
                  ? 'bg-white text-[#223246] shadow-[0_10px_20px_rgba(108,124,139,0.12)]'
                  : 'bg-transparent text-[#7c8c9c]'
              )}
              onClick={() => setRankTab('weekly')}
            >
              Astea
            </button>
          </div>
          {isLoadingData && <span className="inline-flex h-2.5 w-12 rounded-full bg-slate-200/80 animate-pulse" />}
        </div>

        {rankTab === 'daily' && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key="daily-ranking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-col gap-2"
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
                    'grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-[18px] border px-3 py-3 transition-colors duration-150',
                    entry.playerCode === myRankEntry?.playerCode
                      ? 'border-[rgba(133,209,185,0.48)] bg-[linear-gradient(135deg,rgba(239,251,245,0.96),rgba(232,248,242,0.92))]'
                      : 'border-transparent bg-[rgba(248,250,250,0.92)] hover:bg-[rgba(243,247,248,0.98)]',
                    entry.rank === 1 && entry.playerCode !== myRankEntry?.playerCode
                      ? 'border-[rgba(223,183,79,0.34)] bg-[linear-gradient(135deg,rgba(255,250,232,0.96),rgba(248,243,213,0.92))]'
                      : ''
                  )}
                >
                  <RankBadge rank={entry.rank} />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-[#28384a]">{entry.playerCode}</span>
                  <span className="text-[0.9rem] font-extrabold tracking-[-0.03em] text-[#223246]">{entry.score} pt</span>
                  <span className="text-[0.76rem] font-semibold text-[#7d8d9d]">{formatSeconds(entry.secondsElapsed)}</span>
                </div>
              ))}
              {myDailyOutside && (
                <>
                  <div className="py-1 text-center text-[0.8rem] tracking-widest text-slate-400">...</div>
                  <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-[18px] border border-[rgba(133,209,185,0.48)] bg-[linear-gradient(135deg,rgba(239,251,245,0.96),rgba(232,248,242,0.92))] px-3 py-3">
                    <RankBadge rank={myRankEntry.rank} />
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-[#28384a]">{myRankEntry.playerCode}</span>
                    <span className="text-[0.9rem] font-extrabold tracking-[-0.03em] text-[#223246]">{myRankEntry.score} pt</span>
                    <span className="text-[0.76rem] font-semibold text-[#7d8d9d]">{formatSeconds(myRankEntry.secondsElapsed)}</span>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {rankTab === 'weekly' && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key="weekly-ranking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-col gap-2"
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
                    'grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-[18px] border px-3 py-3 transition-colors duration-150',
                    entry.playerCode === myWeekRankEntry?.playerCode
                      ? 'border-[rgba(133,209,185,0.48)] bg-[linear-gradient(135deg,rgba(239,251,245,0.96),rgba(232,248,242,0.92))]'
                      : 'border-transparent bg-[rgba(248,250,250,0.92)] hover:bg-[rgba(243,247,248,0.98)]',
                    entry.rank === 1 && entry.playerCode !== myWeekRankEntry?.playerCode
                      ? 'border-[rgba(223,183,79,0.34)] bg-[linear-gradient(135deg,rgba(255,250,232,0.96),rgba(248,243,213,0.92))]'
                      : ''
                  )}
                >
                  <RankBadge rank={entry.rank} />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-[#28384a]">{entry.playerCode}</span>
                  <span className="text-[0.9rem] font-extrabold tracking-[-0.03em] text-[#223246]">{entry.totalScore} pt</span>
                  <span className="text-[0.76rem] font-semibold text-[#7d8d9d]">{entry.daysPlayed} egun</span>
                </div>
              ))}
              {myWeeklyOutside && (
                <>
                  <div className="py-1 text-center text-[0.8rem] tracking-widest text-slate-400">...</div>
                  <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-[18px] border border-[rgba(133,209,185,0.48)] bg-[linear-gradient(135deg,rgba(239,251,245,0.96),rgba(232,248,242,0.92))] px-3 py-3">
                    <RankBadge rank={myWeekRankEntry.rank} />
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-[#28384a]">{myWeekRankEntry.playerCode}</span>
                    <span className="text-[0.9rem] font-extrabold tracking-[-0.03em] text-[#223246]">{myWeekRankEntry.totalScore} pt</span>
                    <span className="text-[0.76rem] font-semibold text-[#7d8d9d]">{myWeekRankEntry.daysPlayed} egun</span>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </section>
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
