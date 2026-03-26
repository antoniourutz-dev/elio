import { memo, useMemo } from 'react';
import clsx from 'clsx';
import { Flame, Trophy, Zap } from 'lucide-react';
import { GAME_LEVELS, LEVELS_TOTAL } from '../lib/constants';
import { getResolvedLevelRecord, getUnlockedLevels, isLevelUnlocked } from '../lib/progress';
import { getLevelQuestionCount, getLevelMetersForProgress, getLevelUnlockTargetCount, getConsecutivePlayDays, getTodayGamesPlayed } from '../lib/stats';
import type { GameProgress, SynonymEntry } from '../lib/types';
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
const PROFILE_W = 560;
const PROFILE_H = 188;
const PROFILE_BASE_Y = 146;
const PROFILE_START_X = 34;
const PROFILE_STEP_X = 54;

export const StatsView = memo(function StatsView({ progress, entries, currentTargetLevel, homeNotice, isDemoMode, uiMessage }: StatsViewProps) {
  const {
    completedLevels,
    unlockedLevelStats,
    gamesPlayedToday,
    consecutivePlayDays,
    ringDash,
    profileLevels,
    currentMountain,
  } = useMemo(() => {
    const resolvedRecords = GAME_LEVELS.map((level) => ({
      level,
      record: getResolvedLevelRecord(progress, entries, level),
    }));
    const recordByLevel = new Map(resolvedRecords.map((item) => [item.level.index, item.record]));
    const unlockedLevels = getUnlockedLevels(progress, entries);
    const completed = resolvedRecords.filter((item) => item.record?.isCompleted).length;
    const masteryPct = LEVELS_TOTAL > 0 ? (completed / LEVELS_TOTAL) * 100 : 0;
    const minElevation = Math.min(...GAME_LEVELS.map((level) => level.elevationMeters));
    const maxElevation = Math.max(...GAME_LEVELS.map((level) => level.elevationMeters));

    return {
      resolvedLevelRecords: resolvedRecords,
      completedLevels: completed,
      unlockedLevelStats: unlockedLevels.map((level) => ({
        level,
        record: recordByLevel.get(level.index) ?? null,
        totalQuestions: getLevelQuestionCount(entries, level.index),
        isTarget: level.index === currentTargetLevel,
      })),
      gamesPlayedToday: getTodayGamesPlayed(progress),
      consecutivePlayDays: getConsecutivePlayDays(progress),
      ringDash: (masteryPct / 100) * RING_C,
      profileLevels: GAME_LEVELS.map((level, index) => {
        const record = recordByLevel.get(level.index) ?? null;
        const unlocked = isLevelUnlocked(progress, level.index, entries);
        const elevationProgress = (level.elevationMeters - minElevation) / Math.max(maxElevation - minElevation, 1);

        return {
          level,
          unlocked,
          completed: Boolean(record?.isCompleted),
          isTarget: level.index === currentTargetLevel,
          x: PROFILE_START_X + index * PROFILE_STEP_X,
          peakY: 112 - elevationProgress * 46,
        };
      }),
      currentMountain: GAME_LEVELS[Math.max(0, currentTargetLevel - 1)] ?? GAME_LEVELS[0],
    };
  }, [progress, entries, currentTargetLevel]);

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
          'rounded-[24px] border border-[rgba(216,224,231,0.86)] bg-[rgba(255,255,255,0.9)] p-[15px_18px] text-[0.94rem] font-bold leading-[1.55] text-[var(--muted)] shadow-[0_10px_24px_rgba(118,137,154,0.06)]',
          isDemoMode && !uiMessage && 'bg-[rgba(255,248,234,0.96)] border border-[rgba(255,201,131,0.72)] text-[#8d6b20]'
        )}>
          {homeNotice}
        </div>
      )}

      <section className="grid gap-5 rounded-[34px] border border-[rgba(216,224,231,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,249,0.95))] p-6 shadow-[var(--shadow-card)]">

        {/* ── Mastery hero ── */}
        <div className="relative flex items-center gap-4 overflow-hidden rounded-[30px] border border-[rgba(180,219,210,0.52)] bg-[radial-gradient(circle_at_16%_18%,rgba(255,255,255,0.24),transparent_28%),linear-gradient(135deg,rgba(229,247,250,0.98),rgba(232,250,243,0.98)_55%,rgba(247,251,228,0.98))] p-[1rem_1.1rem_1rem] shadow-[0_18px_38px_rgba(120,146,168,0.1),0_6px_16px_rgba(120,146,168,0.04)]">
          <div className="relative shrink-0 h-[5.3rem] w-[5.3rem]">
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
              <span className="font-display text-[1.9rem] font-black tracking-[-0.06em] leading-none text-[var(--text)]">{completedLevels}</span>
                <span className="text-[0.88rem] font-extrabold text-[var(--muted)] leading-none mb-[0.22rem]">/{LEVELS_TOTAL}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[0.66rem] font-extrabold uppercase tracking-[0.16em] text-[var(--primary-deep)]">Estatistikak</span>
            <h2 className="m-[0.05rem_0_0.2rem] font-display text-[1.32rem] md:text-[1.72rem] leading-[1.02] tracking-[-0.05em] text-[var(--text)]">Zure aurrerapena</h2>
            <p className="m-0 text-[0.82rem] font-bold text-[var(--muted)]">{masteryLabel}</p>
            <p className="mt-1.5 text-[0.78rem] font-bold text-[var(--muted)]">
              Uneko mendia: <span className="text-[var(--text)]">{GAME_LEVELS[Math.max(0, currentTargetLevel - 1)]?.name ?? GAME_LEVELS[0]?.name}</span>
            </p>
          </div>
        </div>

        {/* ── Bar chart — all 10 levels ── */}
        <div className="grid gap-4 rounded-[28px] border border-[rgba(214,224,235,0.92)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,252,0.98))] p-[1.1rem] shadow-[0_16px_34px_rgba(120,146,168,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[#35b1d4]">Mendien profila</p>
              <h3 className="m-0 font-display text-[1.45rem] leading-[1.02] tracking-[-0.045em] text-[var(--text)]">Igoeraren mapa</h3>
              <p className="mt-1 text-[0.88rem] font-bold leading-[1.4] text-[var(--muted)]">
                {completedLevels} mendi eginda, hurrengoa <span className="text-[var(--text)]">{currentMountain.name}</span>.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-[rgba(200,218,233,0.94)] bg-[rgba(247,250,253,0.98)] px-3 py-1.5 text-[0.74rem] font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">
              {completedLevels}/{LEVELS_TOTAL}
            </span>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[rgba(219,227,237,0.96)] bg-[radial-gradient(circle_at_top_left,rgba(227,249,248,0.82),transparent_32%),linear-gradient(180deg,rgba(248,251,253,0.98),rgba(241,246,250,0.98))] px-4 py-5">
            <svg viewBox={`0 0 ${PROFILE_W} ${PROFILE_H}`} className="block w-full" aria-hidden="true">
              <defs>
                <linearGradient id="mountainLockedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dfe8ef" />
                  <stop offset="100%" stopColor="#cfdbe5" />
                </linearGradient>
                <linearGradient id="mountainOpenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8fd7e9" />
                  <stop offset="100%" stopColor="#5ec9bd" />
                </linearGradient>
                <linearGradient id="mountainDoneGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d9e672" />
                  <stop offset="100%" stopColor="#6fd3b6" />
                </linearGradient>
                <linearGradient id="mountainTargetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f0cb63" />
                  <stop offset="100%" stopColor="#d59b15" />
                </linearGradient>
                <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(228,237,244,0)" />
                  <stop offset="100%" stopColor="rgba(210,223,233,0.62)" />
                </linearGradient>
              </defs>

              <rect x="0" y={PROFILE_BASE_Y} width={PROFILE_W} height={PROFILE_H - PROFILE_BASE_Y} fill="url(#groundGrad)" />
              <line x1="0" y1={PROFILE_BASE_Y} x2={PROFILE_W} y2={PROFILE_BASE_Y} stroke="rgba(180,198,210,0.55)" strokeWidth="1.5" />

              {profileLevels.map(({ level, unlocked, completed, isTarget, x, peakY }) => {
                const fillId = isTarget
                  ? 'url(#mountainTargetGrad)'
                  : completed
                    ? 'url(#mountainDoneGrad)'
                    : unlocked
                      ? 'url(#mountainOpenGrad)'
                      : 'url(#mountainLockedGrad)';

                const stroke = isTarget
                  ? 'rgba(176,129,20,0.95)'
                  : completed
                    ? 'rgba(78,176,142,0.78)'
                    : unlocked
                      ? 'rgba(67,165,185,0.72)'
                      : 'rgba(177,191,204,0.72)';

                const leftBase = x - 26;
                const rightBase = x + 26;
                const shoulderLeft = x - 14;
                const shoulderRight = x + 12;
                const shoulderY = peakY + 22;

                return (
                  <g key={level.id}>
                    <line
                      x1={x}
                      y1={peakY - 14}
                      x2={x}
                      y2={PROFILE_BASE_Y}
                      stroke={isTarget ? 'rgba(212,159,28,0.38)' : 'rgba(160,176,190,0.26)'}
                      strokeDasharray={isTarget ? '0' : '3 4'}
                      strokeWidth={isTarget ? 1.6 : 1.1}
                    />
                    <polygon
                      points={`${leftBase},${PROFILE_BASE_Y} ${shoulderLeft},${shoulderY} ${x},${peakY} ${shoulderRight},${shoulderY} ${rightBase},${PROFILE_BASE_Y}`}
                      fill={fillId}
                      stroke={stroke}
                      strokeWidth={isTarget ? 2.2 : 1.3}
                      className="transition-[transform,opacity] duration-500"
                    />
                    {isTarget ? (
                      <circle cx={x} cy={peakY} r="5" fill="#fff9e8" stroke="rgba(176,129,20,0.95)" strokeWidth="2" />
                    ) : null}
                  </g>
                );
              })}
            </svg>

            <div className="mt-3 grid grid-cols-10 gap-1">
              {profileLevels.map(({ level, unlocked, completed, isTarget }) => (
                <div key={`profile-label-${level.id}`} className="grid justify-items-center gap-1">
                  <span
                    className={clsx(
                      'h-1.5 w-1.5 rounded-full',
                      isTarget && 'bg-[#d3a12a]',
                      !isTarget && completed && 'bg-[#5fc8a9]',
                      !isTarget && !completed && unlocked && 'bg-[#5fc8bd]',
                      !isTarget && !completed && !unlocked && 'bg-[#d2dce6]'
                    )}
                  />
                  <span
                    className={clsx(
                      'text-center text-[0.58rem] font-extrabold uppercase tracking-[0.08em]',
                      isTarget ? 'text-[#9e7515]' : completed ? 'text-[#2f8f74]' : unlocked ? 'text-[#4b9bb0]' : 'text-[#9caab6]'
                    )}
                  >
                    {level.name.slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Unlocked level detail cards ── */}
        <div className="grid gap-4 rounded-[28px] border border-[rgba(207,220,236,0.85)] bg-[rgba(245,249,255,0.94)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_28px_rgba(118,137,154,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-extrabold tracking-[0.14em] uppercase text-[#35b1d4] mb-2">Mendien aurrerapena</p>
              <h3 className="font-display text-[1.28rem] md:text-[1.72rem] leading-[1.02] tracking-[-0.04em] text-[var(--text)] m-0">Zabalik dauden mendiak</h3>
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
                    'grid gap-3.5 rounded-[24px] border bg-[rgba(255,255,255,0.98)] p-5 transition-transform duration-150 hover:-translate-y-[1px]',
                    isTarget 
                      ? 'border-[rgba(230,215,111,0.38)] shadow-[0_18px_42px_rgba(206,218,125,0.14)]'
                      : record?.isCompleted
                        ? 'border-[rgba(95,200,189,0.3)] shadow-[0_10px_24px_rgba(107,148,165,0.08),0_2px_6px_rgba(107,148,165,0.04)]'
                        : 'border-[rgba(216,226,241,0.88)] shadow-[0_10px_24px_rgba(107,148,165,0.08),0_2px_6px_rgba(107,148,165,0.04)]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="block font-display text-[1.3rem] leading-[1.04] tracking-[-0.04em] text-[var(--text)] m-0">{level.name}</strong>
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

                  <div className="flex items-center justify-between gap-2.5 flex-wrap text-[var(--muted)] text-[0.86rem] font-bold">
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
          <article className="relative grid gap-2 overflow-hidden rounded-[24px] border border-[rgba(216,226,241,0.88)] bg-white p-[18px_16px_16px] shadow-[0_10px_24px_rgba(107,148,165,0.08),0_2px_8px_rgba(107,148,165,0.04)] before:absolute before:top-0 before:inset-x-0 before:h-[3px] before:bg-gradient-to-r before:from-[#6bb8d9] before:via-[#5fc8bd] before:to-[#d4e86f]">
            <div className="flex items-center gap-[0.45rem]">
              <Zap className="w-4 h-4 shrink-0 text-[#35b1d4]" />
              <span className="text-[#35b1d4] text-[0.72rem] font-extrabold tracking-[0.1em] uppercase">Partidak</span>
            </div>
            <strong className={clsx(
              'font-display text-[1.8rem] md:text-[2.4rem] leading-none tracking-[-0.06em]',
              gamesPlayedToday > 0 ? 'text-[#35b1d4]' : 'text-[var(--text)]'
            )}>{gamesPlayedToday}</strong>
            <p className="text-[var(--muted)] text-[0.92rem] font-bold leading-[1.4] m-0">Gaur jokatuta</p>
          </article>

          <article className="relative grid gap-2 overflow-hidden rounded-[24px] border border-[rgba(216,226,241,0.88)] bg-white p-[18px_16px_16px] shadow-[0_10px_24px_rgba(107,148,165,0.08),0_2px_8px_rgba(107,148,165,0.04)] before:absolute before:top-0 before:inset-x-0 before:h-[3px] before:bg-gradient-to-r before:from-[#6bb8d9] before:via-[#5fc8bd] before:to-[#d4e86f]">
            <div className="flex items-center gap-[0.45rem]">
              <Flame className={clsx('w-4 h-4 shrink-0', consecutivePlayDays > 0 ? 'text-[#f0860a]' : 'text-[rgba(160,175,195,0.55)]')} />
              <span className="text-[#35b1d4] text-[0.72rem] font-extrabold tracking-[0.1em] uppercase">Egun jarraian</span>
            </div>
            <strong className={clsx(
              'font-display text-[1.8rem] md:text-[2.4rem] leading-none tracking-[-0.06em]',
              consecutivePlayDays > 2 ? 'text-[#e07a06]' :
              consecutivePlayDays > 0 ? 'text-[#35b1d4]' : 'text-[var(--text)]'
            )}>{consecutivePlayDays}</strong>
            <p className="text-[var(--muted)] text-[0.92rem] font-bold leading-[1.4] m-0">Azken segida</p>
          </article>

          <article className="relative grid gap-2 overflow-hidden rounded-[24px] border border-[rgba(216,226,241,0.88)] bg-white p-[18px_16px_16px] shadow-[0_10px_24px_rgba(107,148,165,0.08),0_2px_8px_rgba(107,148,165,0.04)] before:absolute before:top-0 before:inset-x-0 before:h-[3px] before:bg-gradient-to-r before:from-[#6bb8d9] before:via-[#5fc8bd] before:to-[#d4e86f] md:col-span-2">
            <div className="flex items-center gap-[0.45rem]">
              <Trophy className={clsx('w-4 h-4 shrink-0', completedLevels > 0 ? 'text-[#c8930a]' : 'text-[rgba(160,175,195,0.55)]')} />
              <span className="text-[#35b1d4] text-[0.72rem] font-extrabold tracking-[0.1em] uppercase">Osatutako mendiak</span>
            </div>
            <strong className={clsx(
              'font-display text-[1.8rem] md:text-[2.4rem] leading-none tracking-[-0.06em]',
              completedLevels > 0 ? 'text-[#b8880a]' : 'text-[var(--text)]'
            )}>{completedLevels}</strong>
            <p className="text-[var(--muted)] text-[0.92rem] font-bold leading-[1.4] m-0">{LEVELS_TOTAL} menditik</p>
          </article>
        </div>

      </section>
    </>
  );
});
