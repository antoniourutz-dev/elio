import { memo } from 'react';
import clsx from 'clsx';
import { Flame, Trophy, Zap } from 'lucide-react';
import {
  GAME_LEVELS,
  getResolvedLevelRecord,
  getUnlockedLevels,
  isLevelUnlocked,
  getLevelQuestionCount,
  getLevelMetersForProgress,
  getLevelUnlockTargetCount,
  getConsecutivePlayDays,
  getTodayGamesPlayed,
  LEVELS_TOTAL,
} from '../euskeraLearning';
import type { GameProgress, SynonymEntry } from '../euskeraLearning';
import { formatMeterProgress, formatMeters } from '../formatters';

interface StatsViewProps {
  progress: GameProgress;
  entries: SynonymEntry[];
  currentTargetLevel: number;
  homeNotice: string | null;
  isDemoMode: boolean;
  uiMessage: string | null;
}

const RING_R = 40;
const RING_C = 2 * Math.PI * RING_R;

export const StatsView = memo(function StatsView({ progress, entries, currentTargetLevel, homeNotice, isDemoMode, uiMessage }: StatsViewProps) {
  const unlockedLevels = getUnlockedLevels(progress, entries);
  const resolvedLevelRecords = GAME_LEVELS.map((level) => ({
    level,
    record: getResolvedLevelRecord(progress, entries, level),
  }));
  const completedLevels = resolvedLevelRecords.filter((item) => item.record?.isCompleted).length;

  const unlockedLevelStats = unlockedLevels.map((level) => ({
    level,
    record: getResolvedLevelRecord(progress, entries, level),
    totalQuestions: getLevelQuestionCount(entries, level.index),
    isTarget: level.index === currentTargetLevel,
  }));

  const gamesPlayedToday = getTodayGamesPlayed(progress);
  const consecutivePlayDays = getConsecutivePlayDays(progress);

  // Mastery ring
  const masteryPct = LEVELS_TOTAL > 0 ? (completedLevels / LEVELS_TOTAL) * 100 : 0;
  const ringDash = (masteryPct / 100) * RING_C;

  // All levels for bar chart
  const allLevelBars = GAME_LEVELS.map((level) => {
    const record = getResolvedLevelRecord(progress, entries, level);
    const unlocked = isLevelUnlocked(progress, level.index, entries);
    return {
      level,
      unlocked,
      pct: record?.bestScore ?? 0,
      completed: Boolean(record?.isCompleted),
    };
  });

  const masteryLabel =
    completedLevels === 0
      ? 'Hasi bidaia!'
      : completedLevels === LEVELS_TOTAL
        ? 'Alde batera!'
        : `${LEVELS_TOTAL - completedLevels} mendi geratzen`;

  return (
    <>
      {homeNotice && (
        <div className={clsx(
          'p-[16px_18px] rounded-[26px] bg-[rgba(255,255,255,0.88)] text-[#76889a] text-[0.96rem] font-bold leading-[1.5]',
          isDemoMode && !uiMessage && 'bg-[rgba(255,248,234,0.96)] border border-[rgba(255,201,131,0.72)] text-[#8d6b20]'
        )}>
          {homeNotice}
        </div>
      )}

      <section className="grid gap-4.5 p-6 rounded-[32px] border border-[#e1e5ee] bg-gradient-to-b from-[rgba(255,255,255,0.98)] to-[rgba(248,252,255,0.97)] shadow-[0_4px_16px_rgba(110,130,150,0.06)]">

        {/* ── Mastery hero ── */}
        <div className="relative flex items-center gap-4 overflow-hidden p-[1.15rem_1.15rem_1.05rem] rounded-[1.6rem] border border-[rgba(180,219,210,0.52)] bg-[radial-gradient(circle_at_16%_18%,rgba(255,255,255,0.2),transparent_28%),linear-gradient(135deg,rgba(229,247,250,0.98),rgba(232,250,243,0.98)_55%,rgba(247,251,228,0.98))] shadow-[0_20px_46px_rgba(120,146,168,0.11),0_6px_16px_rgba(120,146,168,0.05)] lg:bg-white lg:border-[#dce5ef]">
          <div className="relative shrink-0 w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6bb8d9" />
                  <stop offset="60%" stopColor="#48c8ba" />
                  <stop offset="100%" stopColor="#c6dd6a" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(107,184,217,0.14)" strokeWidth="12" />
              <circle
                cx="50"
                cy="50"
                r={RING_R}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                className="transition-[stroke-dasharray] duration-800 ease-[cubic-bezier(0.34,1.2,0.64,1)]"
                strokeDasharray={`${ringDash} ${RING_C}`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="inline-flex items-end justify-center gap-px translate-y-[1px]">
              <span className="font-display text-[1.9rem] font-black tracking-[-0.06em] leading-none text-[#223748]">{completedLevels}</span>
                <span className="text-[0.88rem] font-extrabold text-[#76889a] leading-none mb-[0.22rem]">/{LEVELS_TOTAL}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="font-display text-[1.4rem] md:text-[1.9rem] leading-[1.02] tracking-[-0.05em] text-[#223748] m-[0.1rem_0_0.3rem]">Zure aurrerapena</h2>
            <p className="text-[0.84rem] font-bold text-[#76889a] m-0">{masteryLabel}</p>
            <p className="text-[0.8rem] font-bold text-[#8ea0af] mt-2">
              Uneko mendia: <span className="text-[#223748]">{GAME_LEVELS[Math.max(0, currentTargetLevel - 1)]?.name ?? GAME_LEVELS[0]?.name}</span>
            </p>
          </div>
        </div>

        {/* ── Bar chart — all 10 levels ── */}
        <div className="flex items-end gap-1.5 h-[78px] px-1 lg:rounded-[1.5rem] lg:bg-white lg:border lg:border-[#dce5ef] lg:shadow-[0_18px_40px_rgba(120,146,168,0.11),0_6px_16px_rgba(120,146,168,0.05)] lg:p-4 lg:h-[120px]" aria-hidden="true">
          {allLevelBars.map(({ level, unlocked, pct, completed }) => (
            <div key={level.id} className="flex flex-col items-center gap-1.5 flex-1 h-full">
              <div className="flex items-end flex-1 w-full rounded-md bg-[rgba(215,228,238,0.55)] overflow-hidden">
                <div
                  className={clsx(
                    'w-full rounded-md transition-[height] duration-600 ease-[cubic-bezier(0.34,1.2,0.64,1)]',
                    !unlocked && 'bg-[rgba(200,215,228,0.5)]',
                    unlocked && !completed && 'bg-gradient-to-b from-[#7ab8dc] to-[#5fc8bd]',
                    completed && 'bg-gradient-to-b from-[#8bd8b7] to-[#4ec9a8]'
                  )}
                  style={{ height: `${unlocked ? Math.max(pct, 5) : 10}%` }}
                />
              </div>
              <span className={clsx(
                'text-[0.55rem] font-extrabold tracking-[0.04em] uppercase',
                completed ? 'text-[#3a9e78] opacity-100' : 'text-[#76889a] opacity-70'
              )}>
                {level.name.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>

        {/* ── Unlocked level detail cards ── */}
        <div className="grid gap-4 p-5 rounded-[28px] bg-[rgba(245,249,255,0.94)] border border-[rgba(207,220,236,0.85)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] lg:bg-white lg:border-[#dce5ef] lg:shadow-[0_18px_40px_rgba(120,146,168,0.11),0_6px_16px_rgba(120,146,168,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-extrabold tracking-[0.14em] uppercase text-[#35b1d4] mb-2">Mendien aurrerapena</p>
              <h3 className="font-display text-[1.35rem] md:text-[1.9rem] leading-[1.02] tracking-[-0.04em] text-[#223748] m-0">Zabalik dauden mendiak</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {unlockedLevelStats.map(({ level, record, totalQuestions, isTarget }) => {
              const bestPercentage = record?.bestScore ?? 0;
              const attempts = record?.attempts ?? 0;
              const climbedMeters = getLevelMetersForProgress(level, record?.bestCorrectCount ?? 0, totalQuestions);
              const unlockMeters = getLevelMetersForProgress(level, getLevelUnlockTargetCount(totalQuestions), totalQuestions);
              const statusLabel = record?.isCompleted ? 'Gaindituta' : isTarget ? 'Uneko mendia' : 'Prest';

              return (
                <article
                  key={`stats-${level.id}`}
                  className={clsx(
                    'grid gap-3.5 p-5 rounded-[24px] border bg-[rgba(255,255,255,0.98)] transition-transform duration-150',
                    isTarget 
                      ? 'border-[rgba(230,215,111,0.38)] shadow-[0_18px_42px_rgba(206,218,125,0.14)]'
                      : record?.isCompleted
                        ? 'border-[rgba(95,200,189,0.3)] shadow-[0_6px_20px_rgba(107,148,165,0.09),0_2px_6px_rgba(107,148,165,0.05)]'
                        : 'border-[rgba(216,226,241,0.88)] shadow-[0_6px_20px_rgba(107,148,165,0.09),0_2px_6px_rgba(107,148,165,0.05)]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="block font-display text-[1.3rem] leading-[1.04] tracking-[-0.04em] text-[#223748] m-0">{level.name}</strong>
                    <span className={clsx(
                      'inline-flex items-center justify-center min-h-[32px] px-3 rounded-full text-[0.78rem] font-extrabold whitespace-nowrap',
                      record?.isCompleted ? 'bg-[rgba(233,249,243,0.96)] text-[#2ba074]' : 
                      isTarget ? 'bg-[#fdf4e7] text-[#c4923e]' : 'bg-[rgba(227,234,255,0.9)] text-[#35b1d4]'
                    )}>{statusLabel}</span>
                  </div>

                  <div className="h-3 rounded-full bg-[#e6edf0] overflow-hidden">
                    <div 
                      className={clsx(
                        'h-full rounded-full',
                        record?.isCompleted ? 'bg-gradient-to-r from-[#8bd8b7] to-[#5fc8bd]' : 'bg-gradient-to-r from-[#7eb9dc] to-[#5fc8bd]'
                      )}
                      style={{ width: `${bestPercentage}%` }} 
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2.5 flex-wrap text-[#76889a] text-[0.86rem] font-bold">
                    <span>{formatMeterProgress(climbedMeters, level.elevationMeters)}</span>
                    <span>{attempts} partida</span>
                    <span>{formatMeters(unlockMeters)} helburua</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <article className="relative grid gap-2 p-[20px_18px_18px] rounded-[26px] border border-[rgba(216,226,241,0.88)] bg-white shadow-[0_8px_28px_rgba(107,148,165,0.1),0_2px_8px_rgba(107,148,165,0.05)] overflow-hidden before:absolute before:top-0 before:inset-x-0 before:h-[3px] before:bg-gradient-to-r before:from-[#6bb8d9] before:via-[#5fc8bd] before:to-[#d4e86f]">
            <div className="flex items-center gap-[0.45rem]">
              <Zap className="w-4 h-4 shrink-0 text-[#35b1d4]" />
              <span className="text-[#35b1d4] text-[0.72rem] font-extrabold tracking-[0.1em] uppercase">Partidak</span>
            </div>
            <strong className={clsx(
              'font-display text-[1.8rem] md:text-[2.4rem] leading-none tracking-[-0.06em]',
              gamesPlayedToday > 0 ? 'text-[#35b1d4]' : 'text-[#223748]'
            )}>{gamesPlayedToday}</strong>
            <p className="text-[#76889a] text-[0.92rem] font-bold leading-[1.4] m-0">Gaur jokatuta</p>
          </article>

          <article className="relative grid gap-2 p-[20px_18px_18px] rounded-[26px] border border-[rgba(216,226,241,0.88)] bg-white shadow-[0_8px_28px_rgba(107,148,165,0.1),0_2px_8px_rgba(107,148,165,0.05)] overflow-hidden before:absolute before:top-0 before:inset-x-0 before:h-[3px] before:bg-gradient-to-r before:from-[#6bb8d9] before:via-[#5fc8bd] before:to-[#d4e86f]">
            <div className="flex items-center gap-[0.45rem]">
              <Flame className={clsx('w-4 h-4 shrink-0', consecutivePlayDays > 0 ? 'text-[#f0860a]' : 'text-[rgba(160,175,195,0.55)]')} />
              <span className="text-[#35b1d4] text-[0.72rem] font-extrabold tracking-[0.1em] uppercase">Egun jarraian</span>
            </div>
            <strong className={clsx(
              'font-display text-[1.8rem] md:text-[2.4rem] leading-none tracking-[-0.06em]',
              consecutivePlayDays > 2 ? 'text-[#e07a06]' :
              consecutivePlayDays > 0 ? 'text-[#35b1d4]' : 'text-[#223748]'
            )}>{consecutivePlayDays}</strong>
            <p className="text-[#76889a] text-[0.92rem] font-bold leading-[1.4] m-0">Azken segida</p>
          </article>

          <article className="relative grid gap-2 p-[20px_18px_18px] rounded-[26px] border border-[rgba(216,226,241,0.88)] bg-white shadow-[0_8px_28px_rgba(107,148,165,0.1),0_2px_8px_rgba(107,148,165,0.05)] overflow-hidden before:absolute before:top-0 before:inset-x-0 before:h-[3px] before:bg-gradient-to-r before:from-[#6bb8d9] before:via-[#5fc8bd] before:to-[#d4e86f] md:col-span-2">
            <div className="flex items-center gap-[0.45rem]">
              <Trophy className={clsx('w-4 h-4 shrink-0', completedLevels > 0 ? 'text-[#c8930a]' : 'text-[rgba(160,175,195,0.55)]')} />
              <span className="text-[#35b1d4] text-[0.72rem] font-extrabold tracking-[0.1em] uppercase">Osatutako mendiak</span>
            </div>
            <strong className={clsx(
              'font-display text-[1.8rem] md:text-[2.4rem] leading-none tracking-[-0.06em]',
              completedLevels > 0 ? 'text-[#b8880a]' : 'text-[#223748]'
            )}>{completedLevels}</strong>
            <p className="text-[#76889a] text-[0.92rem] font-bold leading-[1.4] m-0">{LEVELS_TOTAL} menditik</p>
          </article>
        </div>

      </section>
    </>
  );
});
