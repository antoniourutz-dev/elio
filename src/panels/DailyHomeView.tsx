import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { BookOpen, ChevronDown, CirclePlay, Languages, LibraryBig, Medal, Sigma } from 'lucide-react';
import type { DailyResult, DailyRankingEntry, DailyWeeklyRankingEntry } from '../appTypes';
import { ConfirmModal } from '../components/ConfirmModal';
import { getFallbackDailyPill, loadDailyPill, PILL_CATEGORY_LABELS } from '../lib/pills';

interface DailyHomeViewProps {
  dayKey: string;
  playerName?: string;
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
const WEEK_SHORT = ['Al', 'Ar', 'Az', 'Og', 'Or', 'La', 'Ig'];
const DAILY_HEADER_PHRASES: Record<number, string[]> = {
  0: [
    'Atsedena ere bidearen parte da.',
    '{{izena}}, presta zaitez hurrengo asterako.',
    'Begiratu atzera... eta aurrera.',
    'Gaur lasai, bihar sendo.',
    'Ziklo bat ixten da; beste bat hasten da.',
  ],
  1: [
    '{{izena}}, hasi sendo. Gaur hasten da astea.',
    'Gaurko lana aste osorako oinarria da.',
    'Ez pentsatu gehiegi; hasi.',
    '{{izena}}, lehen pausoa da garrantzitsuena.',
    'Aste berria, aukera berriak.',
  ],
  2: [
    'Jarraikortasuna da gakoa.',
    '{{izena}}, atzoko lana sendotu gaur.',
    'Ez da magia; ohitura da.',
    'Apurka, baina aurrera.',
    'Bigarren eguna: hemen hasten da benetako lana.',
  ],
  3: [
    'Erdian zaude; ez gelditu.',
    '{{izena}}, orain da eusteko unea.',
    'Bidearen erdia eginda dago.',
    'Gaur egindakoa bihar eskertuko duzu.',
    'Indarrari eustea da garaipena.',
  ],
  4: [
    'Ia-ia... ez utzi orain.',
    '{{izena}}, azken txanpan sartzen ari zara.',
    'Eutsi; helmuga hurbil dago.',
    'Lan eginez, fruitua dator.',
    'Gaur pixka bat gehiago estutu.',
  ],
  5: [
    '{{izena}}, gaur bai... ala asteburura ihes?',
    'Azken ahalegina, eta kitto.',
    'Lana ondo eginda, asteburua lasai.',
    'Gaur pixka bat egin, eta bihar lasai.',
    'Amaitu lana eta gozatu gero.',
  ],
  6: [
    'Lasai, baina ez gelditu erabat.',
    '{{izena}}, gaur pixka bat egitea nahikoa da.',
    'Ohitura txikiak, emaitza handiak.',
    'Denbora baduzu, aprobetxatu.',
    'Gaur arin ibili, baina zerbait egin.',
  ],
};

function formatDayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00`);
  return `${BASQUE_DAYS[date.getDay()]}, ${date.getDate()} ${BASQUE_MONTHS[date.getMonth()]}`;
}

function getDailyHeaderMessage(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00`);
  const phrases = DAILY_HEADER_PHRASES[date.getDay()] ?? DAILY_HEADER_PHRASES[1];
  const seed = dayKey.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  const phrase = phrases[seed % phrases.length] ?? phrases[0] ?? '';
  return phrase.replace(/\{\{izena\}\},?\s*/g, '');
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
          className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-[16px] border border-[rgba(225,232,239,0.72)] bg-[rgba(248,250,252,0.88)] px-3 py-2.5 animate-pulse"
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
    <div className="grid justify-items-center gap-2 rounded-[22px] border border-dashed border-[rgba(215,224,233,0.88)] bg-[rgba(248,250,252,0.82)] px-4 py-6 text-center">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-[rgba(225,232,239,0.84)] bg-white shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
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
  playerName,
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
  const playedCount = weekDays.filter(({ key }) => playedKeys.has(key)).length;
  const dailyHeaderMessage = getDailyHeaderMessage(dayKey);
  const learnActions = [
    { id: 'synonyms',  title: 'Sinonimoak', icon: BookOpen,   onClick: onGoSynonyms,   accent: 'from-[#e8fbf5] to-[#eefbf8]', iconTone: 'text-[#199b8c]', iconBorder: 'border-[rgba(105,206,186,0.34)]', iconBg: 'bg-[linear-gradient(180deg,rgba(244,255,251,0.98),rgba(229,249,242,0.98))]', tag: 'Lotu hitzak' },
    { id: 'grammar',   title: 'Gramatika',  icon: Languages,  onClick: onGoGrammar,    accent: 'from-[#edf5ff] to-[#f2f8ff]', iconTone: 'text-[#4b86c8]', iconBorder: 'border-[rgba(125,168,223,0.34)]', iconBg: 'bg-[linear-gradient(180deg,rgba(247,251,255,0.98),rgba(235,243,255,0.98))]', tag: 'Eraiki arauak' },
    { id: 'vocabulary',title: 'Hiztegia',   icon: LibraryBig, onClick: onGoVocabulary, accent: 'from-[#fff7df] to-[#fffaf0]', iconTone: 'text-[#b88618]', iconBorder: 'border-[rgba(232,191,85,0.34)]', iconBg: 'bg-[linear-gradient(180deg,rgba(255,252,243,0.98),rgba(255,246,220,0.98))]', tag: 'Zabaldu hiztegia' },
    { id: 'verbs',     title: 'Aditzak',    icon: Sigma,      onClick: onGoVerbs,      accent: 'from-[#fff0ea] to-[#fff6f3]', iconTone: 'text-[#cf6a53]', iconBorder: 'border-[rgba(233,145,117,0.34)]', iconBg: 'bg-[linear-gradient(180deg,rgba(255,248,245,0.98),rgba(255,236,229,0.98))]', tag: 'Mugitu esaldiak' },
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
        className="grid gap-0"
      >
      {playerName && (
        <div className="grid gap-2.5 px-1 pt-0.5 pb-3">
          <div className="grid gap-1.5">
            <h1 className="m-0 font-display text-[clamp(2.2rem,5.6vw,3rem)] leading-[0.86] tracking-[-0.075em] text-[var(--text)]">
              {playerName}
            </h1>
            <p className="m-0 max-w-[24rem] text-[1rem] font-semibold leading-[1.3] tracking-[-0.028em] text-[var(--muted)]">
              {dailyHeaderMessage}
            </p>
          </div>
        </div>
      )}
      <section className="relative overflow-hidden rounded-[34px] border border-[rgba(132,206,194,0.26)] bg-[linear-gradient(140deg,#36b8b4_0%,#58c6b4_34%,#8cd39f_68%,#d6e879_100%)] p-[0.85rem] shadow-[0_20px_44px_rgba(80,167,154,0.18),0_6px_18px_rgba(80,167,154,0.08)] sm:p-[0.95rem]">
        <div className="absolute inset-x-0 top-0 h-px bg-white/40" />
        <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.2),transparent_68%)]" aria-hidden="true" />
        <div className="absolute left-[-2.5rem] top-[4.7rem] h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_72%)]" aria-hidden="true" />
        <div className="absolute -bottom-8 right-[18%] h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.1),transparent_72%)]" aria-hidden="true" />

        <div className="relative z-10 grid gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-0.5">
                <h2 className="m-0 font-display text-[clamp(1.45rem,4.4vw,1.95rem)] leading-[0.9] tracking-[-0.065em] text-white">Eguneko jokoa</h2>
                <p className="m-0 text-[0.8rem] font-bold capitalize text-white/80">{formatDayKey(dayKey)}</p>
              </div>
            </div>

          <div className="rounded-[22px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.09))] px-3 py-2.5 backdrop-blur-[12px]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[0.64rem] font-extrabold uppercase tracking-[0.14em] text-white/78">Asteko bidea</span>
              <span className="rounded-full border border-white/18 bg-white/12 px-2 py-[0.28rem] text-[0.66rem] font-extrabold text-white/88">
                {playedCount}/7
              </span>
            </div>

            <div className="relative">
              {/* Línea base */}
              <div className="pointer-events-none absolute left-[calc(100%/14)] right-[calc(100%/14)] top-[0.9rem] h-[2px] rounded-full bg-white/20" />
              {/* Línea de progreso dinámica — anchos precalculados para evitar inline styles */}
              {playedCount > 0 && (
                <div className={clsx(
                  'pointer-events-none absolute left-[calc(100%/14)] top-[0.9rem] h-[2px] rounded-full bg-white/80 transition-all duration-500',
                  playedCount === 1 && 'w-0',
                  playedCount === 2 && 'w-[14.29%]',
                  playedCount === 3 && 'w-[28.57%]',
                  playedCount === 4 && 'w-[42.86%]',
                  playedCount === 5 && 'w-[57.14%]',
                  playedCount === 6 && 'w-[71.43%]',
                  playedCount >= 7 && 'w-[85.71%]',
                )} />
              )}
              <motion.div
                className="relative grid grid-cols-7"
                initial="initial"
                animate="animate"
                variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
              >
                {weekDays.map(({ key, label }) => {
                  const played = playedKeys.has(key);
                  const isToday = key === dayKey;

                  return (
                    <motion.div
                      key={key}
                      className="flex flex-col items-center gap-1.25 will-change-transform"
                      variants={{
                        initial: { opacity: 0, y: 12, scale: 0.82 },
                        animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 12, stiffness: 200 } },
                      }}
                    >
                      <div
                        className={clsx(
                          'flex items-center justify-center rounded-full transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out',
                          played && !isToday && 'h-7 w-7 border border-white/18 bg-[linear-gradient(135deg,#74e1cb,#9fe190)] text-white shadow-[0_10px_18px_rgba(61,170,151,0.22)]',
                          !played && !isToday && 'h-7 w-7 border border-white/36 bg-white/12',
                          !played && isToday && 'h-8 w-8 border-[1.75px] border-white bg-white/20 text-white shadow-[0_0_0_4px_rgba(255,255,255,0.14)]',
                          played && isToday && 'h-8 w-8 border-[1.75px] border-white/24 bg-[linear-gradient(135deg,#74e1cb,#9fe190)] text-white shadow-[0_0_0_4px_rgba(255,255,255,0.14),0_12px_22px_rgba(61,170,151,0.24)]'
                        )}
                      >
                        {!played && isToday && <span className="h-2 w-2 rounded-full bg-white" />}
                        {played && (
                          <svg viewBox="0 0 10 10" className={clsx(isToday ? 'h-[13px] w-[13px]' : 'h-[11px] w-[11px]')}>
                            <polyline points="2,5.5 4,8 8,2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className={clsx(
                        'text-[0.55rem] font-extrabold uppercase tracking-[0.08em]',
                        isToday ? 'text-white' : played ? 'text-white/85' : 'text-white/55'
                      )}>
                        {label}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>

          <div className="grid rounded-[22px] border border-white/14 bg-[rgba(19,95,92,0.16)] px-3 py-3 backdrop-blur-[8px]">
            <div className="grid">
              {isLoadingData ? (
                <button type="button" className="inline-flex min-h-[3.1rem] w-full items-center justify-center gap-2 rounded-full border border-white/24 bg-[rgba(255,255,255,0.9)] px-5 text-[0.96rem] font-extrabold text-[var(--text)] opacity-55" disabled>
                  <CirclePlay className="h-[18px] w-[18px]" />
                  <span>Kargatzen...</span>
                </button>
              ) : dailyResult ? (
                <button type="button" className="inline-flex min-h-[3.1rem] w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-[rgba(255,255,255,0.2)] px-5 text-[0.96rem] font-extrabold text-white/90" disabled>
                  <span>Bihar berriz</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={clsx(
                    'inline-flex min-h-[3.1rem] w-full items-center justify-center gap-2 rounded-full border border-[rgba(9,104,97,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,252,250,0.98))] px-5 text-[0.96rem] font-extrabold text-[#115751] shadow-[0_16px_30px_rgba(24,87,84,0.16)]',
                    canStartGame && countdownValue === null
                      ? 'animate-[play-button-entrance_0.5s_cubic-bezier(0.34,1.56,0.64,1)_0.3s_both] transition-[transform,box-shadow] duration-150 hover:-translate-y-[1px] hover:shadow-[0_22px_42px_rgba(24,87,84,0.22)] active:scale-[0.985]'
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
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {learnActions.map(({ id, title, icon: Icon, onClick, accent, iconTone, iconBorder, iconBg, tag }) => (
          <button
            key={id}
            type="button"
            className={clsx(
              'group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-[24px] border px-3.5 py-3 text-left shadow-[0_12px_30px_rgba(118,137,154,0.08)] transition-[transform,box-shadow,border-color,background-color] duration-150 hover:-translate-y-[2px] hover:shadow-[0_16px_34px_rgba(118,137,154,0.12)]',
              'border-[rgba(215,224,233,0.88)] bg-[var(--surface-strong)]'
            )}
            onClick={onClick}
          >
            <div
              className={clsx(
                'pointer-events-none absolute inset-0 opacity-90',
                `bg-gradient-to-br ${accent}`
              )}
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/75" aria-hidden="true" />
            <span
              className={clsx(
                'relative inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[16px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] transition-transform duration-150 group-hover:scale-[1.03]',
                iconTone,
                iconBorder,
                iconBg
              )}
            >
              <Icon className="h-[1.22rem] w-[1.22rem]" />
            </span>
            <span className="relative grid min-w-0 gap-0.5">
              <strong className="block font-display text-[clamp(0.98rem,3.4vw,1.14rem)] font-extrabold leading-[0.92] tracking-[-0.05em] text-[var(--text)] text-balance">
                {title}
              </strong>
              <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">
                {tag}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3">
      <div
        className={clsx(
          'relative overflow-hidden rounded-[30px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(251,253,255,0.98))] shadow-[0_18px_40px_rgba(117,136,154,0.1)]',
          pill.tone === 'gramatika' && 'border-[rgba(117,205,192,0.42)]',
          pill.tone === 'ortografia' && 'border-[rgba(117,205,192,0.42)]',
          pill.tone === 'hiztegia' && 'border-[rgba(223,183,79,0.36)]',
          pill.tone === 'puntuazioa' && 'border-[rgba(164,133,220,0.36)]',
          pill.tone === 'historia' && 'border-[rgba(218,123,143,0.36)]',
          !['gramatika', 'ortografia', 'hiztegia', 'puntuazioa', 'historia'].includes(pill.tone) && 'border-[var(--line)]'
        )}
      >
        <div
          className={clsx(
            'absolute bottom-0 left-0 top-0 w-[4px]',
            (pill.tone === 'gramatika' || pill.tone === 'ortografia') && 'bg-[linear-gradient(180deg,#25aea0,#79d7be)]',
            pill.tone === 'hiztegia' && 'bg-[linear-gradient(180deg,#dca92c,#efd171)]',
            pill.tone === 'puntuazioa' && 'bg-[linear-gradient(180deg,#9b79d9,#c4afea)]',
            pill.tone === 'historia' && 'bg-[linear-gradient(180deg,#d86d84,#efb0bc)]',
            !['gramatika', 'ortografia', 'hiztegia', 'puntuazioa', 'historia'].includes(pill.tone) && 'bg-[linear-gradient(180deg,#b8c3cc,#d9e1e6)]'
          )}
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 top-0 h-px bg-white/80" aria-hidden="true" />
        {/* Header — siempre visible */}
        <button
          type="button"
          className="w-full cursor-pointer p-0 text-left"
          aria-expanded={isPillExpanded ? 'true' : 'false'}
          onClick={() => setIsPillExpanded((current) => !current)}
        >
          <div className="grid gap-3 px-5 pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'text-[0.68rem] font-extrabold uppercase tracking-[0.16em]',
                    (pill.tone === 'gramatika' || pill.tone === 'ortografia') && 'text-[var(--primary-deep)]',
                    pill.tone === 'hiztegia' && 'text-[#b07d13]',
                    pill.tone === 'puntuazioa' && 'text-[#775bb5]',
                    pill.tone === 'historia' && 'text-[#c2576a]',
                    !['gramatika', 'ortografia', 'hiztegia', 'puntuazioa', 'historia'].includes(pill.tone) && 'text-[var(--muted)]'
                  )}
                >
                  {pill.category || PILL_CATEGORY_LABELS[pill.tone]}
                </span>
                <span className="text-[0.72rem] font-semibold text-[var(--muted)]">Eguneko pilula</span>
              </div>
              <ChevronDown className={clsx('h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200', isPillExpanded && 'rotate-180')} />
            </div>
            <h3 className="m-0 max-w-[18rem] font-display text-[1.3rem] font-extrabold leading-[0.96] tracking-[-0.05em] text-[var(--text)]">{pill.title}</h3>
          </div>
        </button>

        {/* Cuerpo expandible */}
        <div
          className={clsx(
            'grid overflow-hidden px-5 transition-all duration-300 ease-in-out',
            isPillExpanded ? 'max-h-96 gap-3 pb-5 opacity-100' : 'max-h-0 gap-0 pb-0 opacity-0'
          )}
        >
          <p className="m-0 text-[0.94rem] font-medium leading-[1.72] text-[var(--text-2)]">{pill.body}</p>
          {pill.example && (
            <div
              className={clsx(
                'flex flex-col gap-1 rounded-[20px] border px-4 py-3',
                pill.tone === 'gramatika' && 'border-[rgba(117,205,192,0.26)] bg-[rgba(240,252,247,0.94)]',
                pill.tone === 'ortografia' && 'border-[rgba(117,205,192,0.26)] bg-[rgba(240,252,247,0.94)]',
                pill.tone === 'hiztegia' && 'border-[rgba(223,183,79,0.22)] bg-[rgba(255,248,229,0.94)]',
                pill.tone === 'puntuazioa' && 'border-[rgba(164,133,220,0.22)] bg-[rgba(244,238,252,0.94)]',
                pill.tone === 'historia' && 'border-[rgba(218,123,143,0.22)] bg-[rgba(253,238,242,0.94)]',
                !['gramatika', 'ortografia', 'hiztegia', 'puntuazioa', 'historia'].includes(pill.tone) && 'border-[var(--line)] bg-[var(--surface-muted)]'
              )}
            >
              <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">Adibidea</span>
              <span className="text-[0.9rem] font-semibold italic leading-relaxed text-[var(--text-2)]">{pill.example}</span>
            </div>
          )}
        </div>

        {/* Footer informativo */}
        <div className="flex items-center justify-between gap-2 border-t border-[rgba(214,224,233,0.72)] mx-5 px-0 py-3">
          <span className="text-[0.74rem] font-bold text-[var(--muted)]">~2 min irakurtzeko</span>
          <span className="text-[0.74rem] font-semibold text-[var(--text-2)]">{isPillExpanded ? 'Itxi azalpena' : 'Zabaldu azalpena'}</span>
        </div>
      </div>
      </div>

      <section className="mt-6 rounded-[30px] border border-[rgba(215,224,233,0.88)] bg-[rgba(255,255,255,0.92)] p-3.5 shadow-[0_12px_28px_rgba(118,137,154,0.08)]">
        <div className="mb-3 grid gap-3">
          <div className="flex items-center justify-center">
            <span className="text-center text-[0.64rem] font-extrabold uppercase tracking-[0.14em] text-[var(--primary-deep)]">Sailkapena</span>
          </div>
          <div className="grid grid-cols-2 gap-[3px] rounded-[16px] bg-[var(--surface-muted)] p-1">
            <button
              type="button"
              className={clsx(
                'rounded-[12px] px-0 py-1.5 text-[0.78rem] font-extrabold tracking-[0.01em] transition-[background-color,color,box-shadow] duration-150',
                rankTab === 'daily'
                  ? 'bg-white text-[var(--text)] shadow-[0_8px_16px_rgba(108,124,139,0.1)]'
                  : 'bg-transparent text-[var(--muted)]'
              )}
              onClick={() => setRankTab('daily')}
            >
              Gaur
            </button>
            <button
              type="button"
              className={clsx(
                'rounded-[12px] px-0 py-1.5 text-[0.78rem] font-extrabold tracking-[0.01em] transition-[background-color,color,box-shadow] duration-150',
                rankTab === 'weekly'
                  ? 'bg-white text-[var(--text)] shadow-[0_8px_16px_rgba(108,124,139,0.1)]'
                  : 'bg-transparent text-[var(--muted)]'
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
                    'grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-[16px] border px-3 py-2.5 transition-colors duration-150',
                    entry.playerCode === myRankEntry?.playerCode
                      ? 'border-[rgba(133,209,185,0.48)] bg-[linear-gradient(135deg,rgba(239,251,245,0.96),rgba(232,248,242,0.92))]'
                      : 'border-[rgba(225,232,239,0.72)] bg-[rgba(248,250,252,0.88)] hover:bg-[rgba(244,248,251,0.96)]',
                    entry.rank === 1 && entry.playerCode !== myRankEntry?.playerCode
                      ? 'border-[rgba(223,183,79,0.34)] bg-[linear-gradient(135deg,rgba(255,250,232,0.96),rgba(248,243,213,0.92))]'
                      : ''
                  )}
                >
                  <RankBadge rank={entry.rank} />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-[var(--text)]">{entry.playerCode}</span>
                  <span className="text-[0.9rem] font-extrabold tracking-[-0.03em] text-[var(--text)]">{entry.score} pt</span>
                  <span className="text-[0.76rem] font-semibold text-[var(--muted)]">{formatSeconds(entry.secondsElapsed)}</span>
                </div>
              ))}
              {myDailyOutside && (
                <>
                  <div className="py-1 text-center text-[0.8rem] tracking-widest text-slate-400">...</div>
                  <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-[16px] border border-[rgba(133,209,185,0.48)] bg-[linear-gradient(135deg,rgba(239,251,245,0.96),rgba(232,248,242,0.92))] px-3 py-2.5">
                    <RankBadge rank={myRankEntry.rank} />
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-[var(--text)]">{myRankEntry.playerCode}</span>
                    <span className="text-[0.9rem] font-extrabold tracking-[-0.03em] text-[var(--text)]">{myRankEntry.score} pt</span>
                    <span className="text-[0.76rem] font-semibold text-[var(--muted)]">{formatSeconds(myRankEntry.secondsElapsed)}</span>
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
                    'grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-[16px] border px-3 py-2.5 transition-colors duration-150',
                    entry.playerCode === myWeekRankEntry?.playerCode
                      ? 'border-[rgba(133,209,185,0.48)] bg-[linear-gradient(135deg,rgba(239,251,245,0.96),rgba(232,248,242,0.92))]'
                      : 'border-[rgba(225,232,239,0.72)] bg-[rgba(248,250,252,0.88)] hover:bg-[rgba(244,248,251,0.96)]',
                    entry.rank === 1 && entry.playerCode !== myWeekRankEntry?.playerCode
                      ? 'border-[rgba(223,183,79,0.34)] bg-[linear-gradient(135deg,rgba(255,250,232,0.96),rgba(248,243,213,0.92))]'
                      : ''
                  )}
                >
                  <RankBadge rank={entry.rank} />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-[var(--text)]">{entry.playerCode}</span>
                  <span className="text-[0.9rem] font-extrabold tracking-[-0.03em] text-[var(--text)]">{entry.totalScore} pt</span>
                  <span className="text-[0.76rem] font-semibold text-[var(--muted)]">{entry.daysPlayed} egun</span>
                </div>
              ))}
              {myWeeklyOutside && (
                <>
                  <div className="py-1 text-center text-[0.8rem] tracking-widest text-slate-400">...</div>
                  <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-[16px] border border-[rgba(133,209,185,0.48)] bg-[linear-gradient(135deg,rgba(239,251,245,0.96),rgba(232,248,242,0.92))] px-3 py-2.5">
                    <RankBadge rank={myWeekRankEntry.rank} />
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-bold text-[var(--text)]">{myWeekRankEntry.playerCode}</span>
                    <span className="text-[0.9rem] font-extrabold tracking-[-0.03em] text-[var(--text)]">{myWeekRankEntry.totalScore} pt</span>
                    <span className="text-[0.76rem] font-semibold text-[var(--muted)]">{myWeekRankEntry.daysPlayed} egun</span>
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
