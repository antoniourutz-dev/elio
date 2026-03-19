import { memo, useMemo } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Lock, Mountain, RefreshCw } from 'lucide-react';
import {
  GAME_LEVELS,
  getResolvedLevelRecord,
  isLevelUnlocked,
  getLevelQuestionCount,
  getLevelMetersForProgress,
} from '../euskeraLearning';
import type { GameLevel, GameProgress, SynonymEntry } from '../euskeraLearning';
import { formatMeterProgress } from '../formatters';

interface LevelsViewProps {
  progress: GameProgress;
  entries: SynonymEntry[];
  isLoading: boolean;
  isError: boolean;
  currentTargetLevel: number;
  onStartLevel: (level: GameLevel) => void;
  onRetry: () => void;
}


export const LevelsView = memo(function LevelsView({ progress, entries, isLoading, isError, currentTargetLevel, onStartLevel, onRetry }: LevelsViewProps) {
  const levelData = useMemo(
    () =>
      GAME_LEVELS.map((level) => {
        const record = getResolvedLevelRecord(progress, entries, level);
        const unlocked = isLevelUnlocked(progress, level.index, entries);
        const completed = Boolean(record?.isCompleted);
        const isCurrentTarget = unlocked && level.index === currentTargetLevel;
        const isDeferredLocked = !unlocked && level.index > currentTargetLevel + 1;
        const isNextLocked = !unlocked && level.index === currentTargetLevel + 1; // kept for card styling
        const levelTotalQuestions = getLevelQuestionCount(entries, level.index);
        const levelProgressCount = record?.bestCorrectCount ?? 0;
        const levelPercentage = record?.bestScore ?? 0;
        const climbedMeters = getLevelMetersForProgress(level, levelProgressCount, levelTotalQuestions);
        return { level, record, unlocked, completed, isCurrentTarget, isDeferredLocked, isNextLocked, levelTotalQuestions, levelProgressCount, levelPercentage, climbedMeters };
      }),
    [progress, entries, currentTargetLevel]
  );

  const completedCount = levelData.filter((d) => d.completed).length;


  if (isError) {
    return (
      <section className="levels-panel levels-panel-compact">
        <div className="bank-error-card">
          <p className="bank-error-message">Ezin izan dira hitzak kargatu.</p>
          <button type="button" className="admin-secondary-button" onClick={onRetry}>
            <RefreshCw className="admin-button-icon" />
            <span>Berriro saiatu</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="levels-panel levels-panel-compact">
      {!isLoading && completedCount > 0 && (
        <div className="levels-mastery-header">
          <CheckCircle2 className="levels-mastery-icon" />
          <span>{completedCount}/{GAME_LEVELS.length} maila gainditu</span>
              <div className="levels-mastery-track">
                <div
                  className="levels-mastery-fill"
                  style={{ '--fill': `${Math.round((completedCount / GAME_LEVELS.length) * 100)}%` } as import('react').CSSProperties}
                />
              </div>
        </div>
      )}

      <div className="levels-grid">
        {isLoading
          ? GAME_LEVELS.map((level) => <div key={level.id} className="level-card-skeleton" aria-hidden="true" />)
          : levelData.map(({ level, unlocked, completed, isCurrentTarget, isDeferredLocked, isNextLocked, levelTotalQuestions, levelPercentage, climbedMeters }) => (
              <button
                key={level.id}
                type="button"
                className={clsx('level-card', {
                  'level-card-locked': !unlocked,
                  'level-card-locked-deep': isDeferredLocked,
                  'level-card-next-locked': isNextLocked,
                  'level-card-completed': completed,
                  'level-card-target': isCurrentTarget,
                })}
                disabled={!unlocked}
                onClick={() => onStartLevel(level)}
              >
                <div className="level-card-top">
                  <span
                    className={clsx('level-state', {
                      'level-state-locked': !unlocked,
                      'level-state-completed': completed,
                      'level-state-open': unlocked && !completed,
                    })}
                  >
                    {!unlocked && <Lock className="level-state-icon" />}
                    {completed && <CheckCircle2 className="level-state-icon" />}
                    {unlocked && !completed && <Mountain className="level-state-icon" />}
                  </span>
                </div>

                <div className="level-card-body">
                  <h3>{level.name}</h3>
                  <p>
                    {unlocked &&
                      (levelTotalQuestions > 0
                        ? formatMeterProgress(climbedMeters, level.elevationMeters)
                        : formatMeterProgress(0, level.elevationMeters))}
                  </p>
                </div>


                {unlocked && (
                  <div className="level-card-footer">
                    <div className="level-card-progress" aria-label={`${levelPercentage}%`}>
                      <div className="level-mini-track">
                        <div
                          className={clsx('level-mini-fill', { 'level-mini-fill-visible': levelPercentage > 0 })}
                          style={{ width: `${levelPercentage}%` }}
                        />
                      </div>
                    </div>
                    <span className={clsx('level-card-score', {
                      'level-card-score-great': completed && levelPercentage >= 80,
                      'level-card-score-mid': completed && levelPercentage >= 60 && levelPercentage < 80,
                      'level-card-score-low': completed && levelPercentage < 60,
                    })}>%{levelPercentage}</span>
                  </div>
                )}
              </button>
            ))}
      </div>
    </section>
  );
});
