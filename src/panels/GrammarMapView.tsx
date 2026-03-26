import { memo, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Check, ChevronRight, Home, Lock } from 'lucide-react';
import { usePublishedLessons } from '../hooks/usePublishedLessons';
import type { LessonSummary } from '../lib/lessons';

type StopStatus = 'completed' | 'active' | 'locked';

interface GrammarStop {
  id: string;
  town: string;
  distance: string;
  district: string;
  placeType: 'city' | 'town';
}

interface GrammarMapViewProps {
  completedStops: number;
  onOpenLesson: (slug?: string | null) => void;
}

const GRAMMAR_STOPS: GrammarStop[] = [
  { id: 'gasteiz', town: 'Gasteiz', distance: 'Hasiera', district: 'Arabako Lautada', placeType: 'city' },
  { id: 'argomaniz', town: 'Argomaniz', distance: '12 km', district: 'Arabako Lautada', placeType: 'town' },
  { id: 'dulantzi', town: 'Alegria-Dulantzi', distance: '5 km', district: 'Arabako Lautada', placeType: 'town' },
  { id: 'agurain', town: 'Agurain', distance: '14 km', district: 'Arabako Lautada', placeType: 'town' },
  { id: 'zalduondo', town: 'Zalduondo', distance: '10 km', district: 'Arabako Lautada', placeType: 'town' },
  { id: 'araia', town: 'Araia', distance: '5 km', district: 'Asparrena', placeType: 'town' },
  { id: 'maeztu', town: 'Maeztu', distance: '24 km', district: 'Arabako Mendialdea', placeType: 'town' },
  { id: 'antonana', town: 'Antonana', distance: '12 km', district: 'Arabako Mendialdea', placeType: 'town' },
  { id: 'kanpezu', town: 'Kanpezu', distance: '8 km', district: 'Arabako Mendialdea', placeType: 'town' },
  { id: 'bernedo', town: 'Bernedo', distance: '15 km', district: 'Arabako Mendialdea', placeType: 'town' },
];

const activeRowHeight = 'h-[14.3rem]';
const compactRowHeight = 'h-[6.1rem]';
const railXMobile = '1.95rem';

function getStopLessonSummary(stop: GrammarStop, lesson: LessonSummary | null): string {
  if (lesson?.section) return lesson.section;
  if (lesson?.title) return lesson.title;
  return stop.district;
}

function getStopLessonMeta(stop: GrammarStop, lesson: LessonSummary | null): string {
  if (lesson?.title) return lesson.title;
  if (lesson?.topic) return lesson.topic;
  if (lesson?.level) return lesson.level;
  return stop.district;
}

function getStopStatus(index: number, completedStops: number, totalStops: number): StopStatus {
  const normalizedCompleted = Math.max(0, Math.min(completedStops, totalStops));

  if (index < normalizedCompleted) {
    return 'completed';
  }

  if (normalizedCompleted >= totalStops) {
    return 'completed';
  }

  return index === normalizedCompleted ? 'active' : 'locked';
}

export const GrammarMapView = memo(function GrammarMapView({
  completedStops,
  onOpenLesson,
}: GrammarMapViewProps) {
  const { lessons, isLoading, isReady, message, refresh } = usePublishedLessons(10, true);
  const totalStops = GRAMMAR_STOPS.length;
  const activeStopIndex = Math.min(completedStops, Math.max(0, totalStops - 1));
  const [selectedStopIndex, setSelectedStopIndex] = useState(activeStopIndex);
  const allCompleted = completedStops >= totalStops;
  const featuredStopIndex = Math.max(0, Math.min(selectedStopIndex, activeStopIndex));
  const progressPercentage = useMemo(
    () => Math.round((completedStops / totalStops) * 100),
    [completedStops, totalStops]
  );
  const activeProgressWidth = useMemo(
    () => Math.max(10, ((completedStops + 1) / totalStops) * 100),
    [completedStops, totalStops]
  );

  useEffect(() => {
    setSelectedStopIndex((current) => Math.min(current, activeStopIndex));
  }, [activeStopIndex]);

  const stopsWithLessons = useMemo(
    () =>
      GRAMMAR_STOPS.map((stop, index) => ({
        ...stop,
        lesson: lessons[index] ?? null,
        status: getStopStatus(index, completedStops, totalStops),
      })),
    [lessons, completedStops, totalStops]
  );

  return (
    <section className="relative min-h-full overflow-hidden px-2 pb-6 pt-3">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f7fbfc_0%,#f5f8f8_46%,#f6f7f3_100%)]" aria-hidden="true" />
      <div
        className="absolute left-0 right-0 top-0 h-[18rem] opacity-80"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(169,221,231,0.22), transparent 32%), radial-gradient(circle at top right, rgba(224,232,171,0.18), transparent 28%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 h-[16rem] w-[16rem] opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(212,226,158,0.16), transparent 66%)' }}
        aria-hidden="true"
      />

      <div className="relative min-h-[72vh]">
        <div
          className="absolute w-px bg-[linear-gradient(180deg,rgba(27,122,116,0.42),rgba(180,205,214,0.95))]"
          style={{
            left: railXMobile,
            top: '4.85rem',
            bottom: '-7rem',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute w-[3px] rounded-full bg-[linear-gradient(180deg,rgba(20,126,118,0.88),rgba(72,193,177,0.18))]"
          style={{
            left: railXMobile,
            top: '4.85rem',
            height: allCompleted ? '100%' : '5.5rem',
            maxHeight: allCompleted ? 'none' : '5.5rem',
            transform: 'translateX(-1px)',
          }}
          aria-hidden="true"
        />
        {!allCompleted ? (
          <div
            className="absolute w-[3px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(218,255,247,0.9),rgba(255,255,255,0))] motion-safe:animate-[rail-glow_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              left: railXMobile,
              top: '4.85rem',
              height: '2.4rem',
              transform: 'translateX(-1px)',
            }}
            aria-hidden="true"
          />
        ) : null}

        <div className="relative grid">
          {stopsWithLessons.map((stop, index) => {
            const isActive = stop.status === 'active';
            const isCompleted = stop.status === 'completed';
            const isFeatured = index === featuredStopIndex;
            const ActivePlaceIcon = stop.placeType === 'city' ? Building2 : Home;
            const showPrimaryCard = isFeatured;
            const featuredProgressPercentage = isCompleted ? 100 : progressPercentage;
            const featuredProgressWidth = isCompleted ? 100 : activeProgressWidth;
            const primaryButtonLabel = isCompleted ? 'Berriro ikusi' : 'Hasi ikasten';
            const isSelectable = isActive || isCompleted;

            return (
              <div key={stop.id} className={`relative ${showPrimaryCard ? activeRowHeight : compactRowHeight}`}>
                <div className="absolute left-8 top-1/2 z-20" style={{ transform: 'translate(-50%, -50%)' }}>
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => setSelectedStopIndex(index)}
                      className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border-[3px] border-[#6edbd3] bg-white text-[#177f76] shadow-[0_0_0_4px_rgba(110,219,211,0.12),0_14px_30px_rgba(46,146,136,0.14)] motion-safe:animate-[map-node-pulse_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
                      aria-label={`${stop.town} hautatu`}
                    >
                      <ActivePlaceIcon className="h-[1.7rem] w-[1.7rem]" />
                    </button>
                  ) : isCompleted ? (
                    <button
                      type="button"
                      onClick={() => setSelectedStopIndex(index)}
                      className="flex h-[2.3rem] w-[2.3rem] items-center justify-center rounded-full border-[3px] border-white bg-[linear-gradient(180deg,#51c9bb,#8fdf93)] text-white shadow-[0_10px_20px_rgba(69,177,157,0.18)] transition-transform duration-150 hover:scale-[1.04]"
                      aria-label={`${stop.town} ikasgaia hautatu`}
                    >
                      <Check className="h-[1rem] w-[1rem] stroke-[3]" />
                    </button>
                  ) : (
                    <div className="flex h-[1.95rem] w-[1.95rem] items-center justify-center rounded-full border-[3px] border-white bg-[#d9e1e6] text-[var(--muted)] shadow-[0_8px_18px_rgba(120,140,158,0.08)]">
                      <Lock className="h-[0.9rem] w-[0.9rem]" />
                    </div>
                  )}
                </div>

                <div className="h-full pl-[4.85rem]">
                  {showPrimaryCard ? (
                    <article className="relative w-[min(18.95rem,100%)] overflow-hidden rounded-[1.9rem] border border-[rgba(227,233,238,0.98)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(252,253,253,0.97))] px-5 py-4.5 shadow-[0_18px_36px_rgba(107,132,154,0.11)]">
                      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#62d7ce,#b8e284)]" aria-hidden="true" />
                      <div
                        className="absolute -right-10 bottom-0 h-28 w-28 rounded-full opacity-50 blur-3xl"
                        style={{ background: 'radial-gradient(circle, rgba(183,226,140,0.24), transparent 65%)' }}
                        aria-hidden="true"
                      />
                      <div className="grid gap-3">
                        <div className="grid gap-1">
                          <span className="text-[0.56rem] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">{stop.distance}</span>
                          <h3 className="m-0 font-display text-[1.9rem] leading-none tracking-[-0.065em] text-[var(--text)]">{stop.town}</h3>
                          <p className="m-0 max-w-[14rem] text-[0.82rem] font-semibold leading-[1.3] text-[var(--muted)]">
                            {getStopLessonSummary(stop, stop.lesson)}
                          </p>
                          <p className="m-0 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-[#17897d]">
                            {getStopLessonMeta(stop, stop.lesson)}
                          </p>
                        </div>

                        <div className="grid gap-1.5">
                          <div className="flex items-center justify-between text-[0.68rem] font-extrabold uppercase tracking-[0.09em] text-[var(--muted)]">
                            <span>Aurrerapena</span>
                            <span className="text-[#17897d]">{featuredProgressPercentage}%</span>
                          </div>
                          <div className="relative h-[0.42rem] overflow-hidden rounded-full bg-[#e3eaee]">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#0e7a72,#5ed2c5)]"
                              style={{ width: `${featuredProgressWidth}%` }}
                            />
                            {!isCompleted ? (
                              <div className="absolute top-0 h-full w-[24%] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(235,255,251,0.92),rgba(255,255,255,0))] motion-safe:animate-[progress-shimmer_2.5s_linear_infinite] motion-reduce:animate-none" />
                            ) : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenLesson(stop.lesson?.slug ?? null)}
                          disabled={!stop.lesson}
                          className="inline-flex min-h-[2.85rem] w-fit items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#0b6f69,#0c847b)] px-6 text-[0.9rem] font-black text-white shadow-[0_12px_24px_rgba(12,132,123,0.22)] transition-transform duration-150 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {primaryButtonLabel}
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ) : (
                    <div className={`relative h-full ${isCompleted ? 'opacity-100' : 'opacity-80'}`}>
                      <div className="relative h-full max-w-[14.2rem]">
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => setSelectedStopIndex(index)}
                            disabled={!stop.lesson || !isSelectable}
                            className="absolute left-0 top-1/2 grid min-w-0 -translate-y-1/2 gap-0.5 rounded-[1rem] px-1.5 py-1 text-left transition-colors duration-150 hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <h3 className="m-0 font-display text-[1.34rem] leading-none tracking-[-0.055em] text-[#71889a]">
                              {stop.town}
                            </h3>
                            <p className="m-0 max-w-[12rem] text-[0.69rem] font-semibold leading-[1.26] text-[#8ea1b0]">
                              {getStopLessonSummary(stop, stop.lesson)}
                            </p>
                          </button>
                        ) : (
                          <div className="absolute left-0 top-1/2 grid -translate-y-1/2 gap-0.5">
                            <h3 className="m-0 font-display text-[1.34rem] leading-none tracking-[-0.055em] text-[#9ba9b7]">
                              {stop.town}
                            </h3>
                            <p className="m-0 max-w-[12rem] text-[0.69rem] font-semibold leading-[1.26] text-[#b0bcc7]">
                              {getStopLessonSummary(stop, stop.lesson)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {showPrimaryCard && isActive ? (
                  <div
                    className="absolute left-8 top-[calc(50%+1.95rem)] z-10 h-[4.5rem] w-[3px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#0b8478,rgba(11,132,120,0.08))]"
                    aria-hidden="true"
                  />
                ) : null}

                {!showPrimaryCard ? (
                  <div className="absolute left-8 z-20 -translate-x-1/2" style={{ top: '-0.65rem' }}>
                    <span className="inline-flex w-fit rounded-full border border-[rgba(221,229,235,0.95)] bg-[rgba(255,255,255,0.92)] px-2 py-0.5 text-[0.54rem] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)] shadow-[0_8px_16px_rgba(126,145,160,0.06)]">
                      {stop.distance}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {!isLoading && !isReady ? (
          <div className="mt-4 ml-[4.85rem] rounded-[22px] border border-[rgba(236,187,92,0.26)] bg-[linear-gradient(180deg,rgba(255,250,240,0.98),rgba(255,247,232,0.96))] px-4 py-4 shadow-[0_12px_24px_rgba(181,144,71,0.08)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[rgba(236,187,92,0.26)] bg-white/84 text-[#b47b10]">
                <AlertCircle className="h-[1rem] w-[1rem]" />
              </span>
              <div className="grid gap-2">
                <p className="m-0 text-[0.92rem] font-semibold leading-relaxed text-[var(--text)]">{message}</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="inline-flex min-h-[2.4rem] w-fit items-center justify-center rounded-full border border-[rgba(220,228,235,0.9)] bg-white px-4 text-[0.82rem] font-extrabold text-[var(--text)]"
                >
                  Berriro saiatu
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
});
