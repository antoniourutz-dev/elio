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
        <div className={clsx('home-note', { 'home-note-warning': isDemoMode && !uiMessage })}>{homeNotice}</div>
      )}

      <section className="stats-panel">

        {/* ── Mastery hero ── */}
        <div className="stats-mastery-hero">
          <div className="stats-mastery-ring-wrap">
            <svg viewBox="0 0 100 100" className="stats-mastery-ring-svg" aria-hidden="true">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#6bb8d9" />
                  <stop offset="60%"  stopColor="#48c8ba" />
                  <stop offset="100%" stopColor="#c6dd6a" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r={RING_R} className="stats-ring-bg" />
              <circle
                cx="50"
                cy="50"
                r={RING_R}
                className="stats-ring-fill"
                strokeDasharray={`${ringDash} ${RING_C}`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="stats-mastery-ring-inner">
              <span className="stats-mastery-number">{completedLevels}</span>
              <span className="stats-mastery-denom">/{LEVELS_TOTAL}</span>
            </div>
          </div>

          <div className="stats-mastery-copy">
            <p className="section-kicker">Mailen maestria</p>
            <h2 className="stats-mastery-title">Zure aurrerapena</h2>
            <p className="stats-mastery-sub">{masteryLabel}</p>
          </div>
        </div>

        {/* ── Bar chart — all 10 levels ── */}
        <div className="stats-bars-chart" aria-hidden="true">
          {allLevelBars.map(({ level, unlocked, pct, completed }) => (
            <div key={level.id} className="stats-bar-col">
              <div className="stats-bar-track">
                <div
                  className={clsx('stats-bar-fill', {
                    'stats-bar-fill-locked': !unlocked,
                    'stats-bar-fill-done': completed,
                  })}
                  style={{ '--bar-h': `${unlocked ? Math.max(pct, 5) : 10}%` } as import('react').CSSProperties}
                />
              </div>
              <span className={clsx('stats-bar-label', { 'stats-bar-label-done': completed })}>{level.name.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* ── Unlocked level detail cards ── */}
        <div className="stats-levels-panel">
          <div className="stats-levels-head">
            <div>
              <p className="section-label">Mailen aurrerapena</p>
              <h3>Zabalik dauden mailak</h3>
            </div>
          </div>

          <div className="stats-levels-list">
            {unlockedLevelStats.map(({ level, record, totalQuestions, isTarget }) => {
              const bestPercentage = record?.bestScore ?? 0;
              const attempts = record?.attempts ?? 0;
              const climbedMeters = getLevelMetersForProgress(level, record?.bestCorrectCount ?? 0, totalQuestions);
              const unlockMeters = getLevelMetersForProgress(level, getLevelUnlockTargetCount(totalQuestions), totalQuestions);
              const statusLabel = record?.isCompleted ? 'Gaindituta' : isTarget ? 'Uneko maila' : 'Prest';

              return (
                <article
                  key={`stats-${level.id}`}
                  className={clsx('stats-level-card', {
                    'stats-level-card-target': isTarget,
                    'stats-level-card-completed': record?.isCompleted,
                  })}
                >
                  <div className="stats-level-card-top">
                    <strong>{level.name}</strong>
                    <span className="stats-level-badge">{statusLabel}</span>
                  </div>

                  <div className="stats-level-track">
                    <div className="stats-level-fill" style={{ width: `${bestPercentage}%` }} />
                  </div>

                  <div className="stats-level-meta-grid">
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
        <div className="stats-grid">
          <article className="stat-card">
            <div className="stat-card-icon-row">
              <Zap className="stat-card-icon stat-icon-zap" />
              <span className="stat-card-label">Partidak</span>
            </div>
            <strong className={clsx({ 'stat-val-active': gamesPlayedToday > 0 })}>{gamesPlayedToday}</strong>
            <p>Gaur jokatuta</p>
          </article>

          <article className="stat-card">
            <div className="stat-card-icon-row">
              <Flame className={clsx('stat-card-icon', consecutivePlayDays > 0 ? 'stat-icon-flame' : 'stat-icon-muted')} />
              <span className="stat-card-label">Egun jarraian</span>
            </div>
            <strong className={clsx({
              'stat-val-flame': consecutivePlayDays > 2,
              'stat-val-active': consecutivePlayDays > 0 && consecutivePlayDays <= 2,
            })}>{consecutivePlayDays}</strong>
            <p>Azken segida</p>
          </article>

          <article className="stat-card">
            <div className="stat-card-icon-row">
              <Trophy className={clsx('stat-card-icon', completedLevels > 0 ? 'stat-icon-trophy' : 'stat-icon-muted')} />
              <span className="stat-card-label">Osatutako mailak</span>
            </div>
            <strong className={clsx({ 'stat-val-trophy': completedLevels > 0 })}>{completedLevels}</strong>
            <p>{LEVELS_TOTAL} menditik</p>
          </article>
        </div>

      </section>
    </>
  );
});
