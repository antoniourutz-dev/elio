import { memo, useMemo } from 'react';
import clsx from 'clsx';
import { CheckCircle2, ChevronRight, Lock, Mountain, RefreshCw } from 'lucide-react';
import {
  GAME_LEVELS,
  getResolvedLevelRecord,
  getLevelMetersForProgress,
  getLevelQuestionCount,
  isLevelUnlocked,
} from '../euskeraLearning';
import type { GameLevel, GameProgress, SynonymEntry } from '../euskeraLearning';
import { formatMeters } from '../formatters';

interface LevelsViewProps {
  progress: GameProgress;
  entries: SynonymEntry[];
  isLoading: boolean;
  isError: boolean;
  currentTargetLevel: number;
  onStartLevel: (level: GameLevel) => void;
  onRetry: () => void;
}

export const LevelsView = memo(function LevelsView({
  progress,
  entries,
  isLoading,
  isError,
  currentTargetLevel,
  onStartLevel,
  onRetry,
}: LevelsViewProps) {
  const levelData = useMemo(
    () =>
      GAME_LEVELS.map((level) => {
        const record = getResolvedLevelRecord(progress, entries, level);
        const unlocked = isLevelUnlocked(progress, level.index, entries);
        const completed = Boolean(record?.isCompleted);
        const isCurrentTarget = unlocked && level.index === currentTargetLevel;
        const levelTotalQuestions = getLevelQuestionCount(entries, level.index);
        const levelProgressCount = record?.bestCorrectCount ?? 0;
        const levelPercentage = record?.bestScore ?? 0;
        const climbedMeters = getLevelMetersForProgress(level, levelProgressCount, levelTotalQuestions);
        const remainingMeters = Math.max(level.elevationMeters - climbedMeters, 0);
        const isSummited = levelPercentage >= 100 || remainingMeters === 0;

        return {
          level,
          unlocked,
          completed,
          isCurrentTarget,
          levelTotalQuestions,
          levelProgressCount,
          levelPercentage,
          climbedMeters,
          remainingMeters,
          isSummited,
        };
      }),
    [progress, entries, currentTargetLevel]
  );

  const completedLevels = levelData.filter((item) => item.completed);
  const currentLevel =
    levelData.find((item) => item.isCurrentTarget) ??
    levelData.find((item) => item.unlocked && !item.completed) ??
    levelData[0];
  const upcomingLevels = levelData.filter((item) => !item.completed && item.level.id !== currentLevel.level.id);

  if (isError) {
    return (
      <section className="grid gap-[18px] p-[18px] rounded-[32px] bg-gradient-to-b from-[rgba(255,255,255,0.98)] to-[rgba(248,252,255,0.97)]">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white border border-[#dde4ee] text-center">
          <p className="text-[#688194] text-[0.9rem]">Ezin izan dira hitzak kargatu.</p>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2.5 rounded-2xl font-extrabold cursor-pointer border border-[#c4d2df] bg-[rgba(242,246,250,0.8)] text-[#506677] py-2.5 px-4 text-[0.92rem] hover:bg-[#e6ebf1] hover:text-[#283845]"
            onClick={onRetry}
          >
            <RefreshCw className="w-[1.05rem] h-[1.05rem]" />
            <span>Berriro saiatu</span>
          </button>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="grid gap-5 p-[20px] rounded-[32px] bg-gradient-to-b from-[rgba(255,255,255,0.98)] to-[rgba(248,252,255,0.97)]">
        <div className="grid gap-2">
          <div className="h-8 w-44 rounded-xl bg-[rgba(220,229,239,0.7)] animate-[skeleton-shimmer_1.4s_ease-in-out_infinite]" />
          <div className="h-5 w-60 rounded-xl bg-[rgba(220,229,239,0.55)] animate-[skeleton-shimmer_1.4s_ease-in-out_infinite]" />
        </div>
        <div className="h-[72px] rounded-[24px] bg-[rgba(230,238,222,0.8)] animate-[skeleton-shimmer_1.4s_ease-in-out_infinite]" />
        <div className="h-[156px] rounded-[30px] bg-[rgba(240,245,248,0.85)] animate-[skeleton-shimmer_1.4s_ease-in-out_infinite]" />
        <div className="grid gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-[56px] rounded-[22px] bg-[rgba(240,245,248,0.78)] animate-[skeleton-shimmer_1.4s_ease-in-out_infinite]" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 p-[20px] rounded-[32px] bg-gradient-to-b from-[rgba(255,255,255,0.98)] to-[rgba(248,252,255,0.97)]">
      <div className="grid gap-1">
        <h2
          className="text-[clamp(2.05rem,5vw,3.15rem)] leading-[0.84] tracking-[-0.085em] text-[#223748]"
          style={{ fontFamily: 'var(--font-editorial)' }}
        >
          Esploratu
          <br />
          Gailurrak
        </h2>
        <p className="max-w-[18rem] text-[0.98rem] leading-[1.55] font-medium text-[#6f8191]">
          Zure maisutasun-bidea hemen hasten da.
        </p>
      </div>

      {currentLevel && (
        <button
          type="button"
          className="group relative grid gap-4 w-full rounded-[30px] border border-[rgba(118,199,178,0.38)] bg-[linear-gradient(180deg,rgba(246,255,251,0.99),rgba(232,247,240,0.97))] px-5 py-5 text-left shadow-[0_22px_52px_rgba(78,160,141,0.16)] overflow-hidden transition-[transform,box-shadow,border-color,filter] duration-200 hover:-translate-y-[2px] hover:border-[rgba(77,182,165,0.58)] hover:shadow-[0_26px_58px_rgba(78,160,141,0.2)] hover:saturate-[1.04]"
          onClick={() => onStartLevel(currentLevel.level)}
          disabled={!currentLevel.unlocked}
        >
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(87,193,166,0.08),transparent_42%,rgba(201,226,123,0.14))]" />
          <div className="absolute pointer-events-none right-[-20px] top-[-18px] w-[160px] h-[160px] rounded-full bg-[radial-gradient(circle,rgba(95,200,189,0.22),transparent_64%)]" />
          <div className="absolute pointer-events-none left-[-36px] bottom-[-44px] w-[180px] h-[180px] rounded-full bg-[radial-gradient(circle,rgba(201,226,123,0.16),transparent_68%)]" />

          <div className="flex items-start gap-4">
            <span
              className={clsx(
                'inline-flex items-center justify-center shrink-0 w-[62px] h-[62px] rounded-full shadow-[0_12px_24px_rgba(66,140,130,0.16)]',
                currentLevel.completed ? 'bg-[linear-gradient(135deg,#7fd4ac,#b7df81)] text-white' : 'bg-[linear-gradient(135deg,#4db6a5,#89cf95)] text-white'
              )}
            >
              {currentLevel.completed ? <CheckCircle2 className="w-7 h-7" /> : <Mountain className="w-7 h-7" />}
            </span>

            <div className="grid gap-1.5 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <strong className="font-display text-[1.6rem] leading-none tracking-[-0.05em] text-[#223748]">
                  {currentLevel.level.name}
                </strong>
                <span className="inline-flex items-center rounded-full border border-[rgba(77,182,165,0.18)] bg-[linear-gradient(180deg,rgba(118,220,199,0.28),rgba(100,206,183,0.2))] px-3 py-[0.26rem] text-[0.72rem] font-black uppercase tracking-[0.1em] text-[#1d8b7f] shadow-[0_6px_14px_rgba(77,182,165,0.12)]">
                  {currentLevel.completed ? 'Gainditzeko prest' : 'Martxan'}
                </span>
              </div>
              <p className="text-[1rem] font-medium leading-[1.45] text-[#6d7f91]">
                {formatMeters(currentLevel.climbedMeters)} / {formatMeters(currentLevel.level.elevationMeters)}
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="h-3 rounded-full bg-[#dce3ea] overflow-hidden">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#14857e,#4db6a5,#b7df81)] transition-[width] duration-500"
                style={{ width: `${Math.max(currentLevel.levelPercentage, 4)}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-[0.95rem] font-extrabold tracking-[-0.02em] text-[#14857e]">
                {formatMeters(currentLevel.climbedMeters)} / {formatMeters(currentLevel.level.elevationMeters)}
              </span>
              <span className="inline-flex items-center gap-1 text-[0.96rem] font-extrabold text-[#2d7f8f]">
                Jarraitu
                <ChevronRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-[2px]" />
              </span>
            </div>
          </div>
        </button>
      )}

      {completedLevels.length > 0 && (
        <div className="grid gap-3">
          {completedLevels.map(({ level, climbedMeters, remainingMeters, isSummited }) => (
            <button
              key={level.id}
              type="button"
              className={clsx(
                'flex items-center gap-4 w-full rounded-[26px] px-4 py-3 text-left transition-transform duration-150 hover:-translate-y-[1px]',
                isSummited
                  ? 'bg-[linear-gradient(90deg,rgba(221,244,190,0.9),rgba(234,243,224,0.92))] shadow-[0_10px_24px_rgba(186,210,157,0.12)]'
                  : 'bg-[linear-gradient(90deg,rgba(225,244,214,0.95),rgba(235,245,236,0.96))] shadow-[0_10px_24px_rgba(158,196,176,0.1)]'
              )}
              onClick={() => onStartLevel(level)}
            >
              <span
                className={clsx(
                  'inline-flex items-center justify-center w-[50px] h-[50px] rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]',
                  isSummited ? 'bg-[rgba(197,233,129,0.78)] text-[#446a2a]' : 'bg-[rgba(177,226,192,0.78)] text-[#3d7661]'
                )}
              >
                <CheckCircle2 className="w-6 h-6" />
              </span>
              <span className="grid gap-0.5 min-w-0">
                <strong className={clsx('font-display text-[1.22rem] leading-none tracking-[-0.04em]', isSummited ? 'text-[#334637]' : 'text-[#355149]')}>
                  {level.name}
                </strong>
                <span className={clsx('text-[0.88rem] font-bold tracking-[0.04em]', isSummited ? 'text-[#7d9073]' : 'text-[#6f9186]')}>
                  {isSummited
                    ? `${formatMeters(level.elevationMeters)} • osatuta`
                    : `${formatMeters(climbedMeters)} / ${formatMeters(level.elevationMeters)} • gaindituta`}
                </span>
                {!isSummited && (
                  <span className="text-[0.8rem] font-bold text-[#6f9186]">
                    {formatMeters(remainingMeters)} falta dira gailurrera
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3">
        <p className="text-[0.82rem] font-extrabold tracking-[0.22em] uppercase text-[#a5afbb]">Hurrengo erronkak</p>

        <div className="grid gap-1.5">
          {upcomingLevels.map(({ level, unlocked }) => (
            <button
              key={level.id}
              type="button"
              className={clsx(
                'flex items-center gap-4 w-full rounded-[22px] px-3 py-3 text-left transition-colors duration-150',
                unlocked ? 'bg-[rgba(255,255,255,0.84)] border border-[rgba(216,226,241,0.76)] hover:bg-white' : 'bg-transparent'
              )}
              onClick={() => unlocked && onStartLevel(level)}
              disabled={!unlocked}
            >
              <span
                className={clsx(
                  'inline-flex items-center justify-center shrink-0 w-[40px] h-[40px] rounded-full',
                  unlocked ? 'bg-[rgba(95,200,189,0.12)] text-[#2f8f86]' : 'bg-[rgba(236,241,247,0.9)] text-[#b2bcc8]'
                )}
              >
                {unlocked ? <Mountain className="w-5 h-5" /> : <Lock className="w-4.5 h-4.5" />}
              </span>

              <span className="grid gap-0.5 min-w-0 flex-1">
                <strong className={clsx('font-display text-[1.15rem] leading-none tracking-[-0.04em]', unlocked ? 'text-[#334250]' : 'text-[#a8b3c0]')}>
                  {level.name}
                </strong>
              </span>

              <span className={clsx('shrink-0 text-[0.82rem] font-extrabold tracking-[0.04em]', unlocked ? 'text-[#84a6b1]' : 'text-[#bcc7d4]')}>
                {formatMeters(level.elevationMeters)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
});
