import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Building2, ChevronRight, Lock } from 'lucide-react';

type StopStatus = 'active' | 'locked';

interface GrammarStop {
  id: string;
  town: string;
  distance: string;
  summary: string;
  status: StopStatus;
}

const GRAMMAR_STOPS: GrammarStop[] = [
  {
    id: 'gasteiz',
    town: 'Gasteiz',
    distance: 'Hasiera',
    summary: 'Hiriburua, kultura eta parkeak',
    status: 'active',
  },
  {
    id: 'legutio',
    town: 'Legutio',
    distance: '8 km',
    summary: 'Natura, ura eta isiltasuna',
    status: 'locked',
  },
  {
    id: 'amurrio',
    town: 'Amurrio',
    distance: '12 km',
    summary: 'Harana, tradizioa eta paisaia',
    status: 'locked',
  },
  {
    id: 'laudio',
    town: 'Laudio',
    distance: '14 km',
    summary: 'Industria, lotura eta garapena',
    status: 'locked',
  },
  {
    id: 'artziniega',
    town: 'Artziniega',
    distance: '9 km',
    summary: 'Historia, ondarea eta kaleak',
    status: 'locked',
  },
];

const activeRowHeight = 'h-[12.5rem]';
const lockedRowHeight = 'h-[5.9rem]';
const railXMobile = '1.95rem';

export const GrammarMapView = memo(function GrammarMapView() {
  const prefersReducedMotion = useReducedMotion();

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
        style={{
          background: 'radial-gradient(circle, rgba(212,226,158,0.16), transparent 66%)',
        }}
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
            height: '5.5rem',
            transform: 'translateX(-1px)',
          }}
          aria-hidden="true"
        />
        {!prefersReducedMotion ? (
          <motion.div
            className="absolute w-[3px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(218,255,247,0.9),rgba(255,255,255,0))]"
            style={{
              left: railXMobile,
              top: '4.85rem',
              height: '2.4rem',
              transform: 'translateX(-1px)',
            }}
            animate={{ y: ['0rem', '3.3rem', '0rem'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />
        ) : null}

        <div className="relative grid">
          {GRAMMAR_STOPS.map((stop, index) => {
            const isActive = stop.status === 'active';

            return (
              <div key={stop.id} className={`relative ${isActive ? activeRowHeight : lockedRowHeight}`}>
                <div
                  className={isActive ? 'absolute left-8 top-1/2 z-20' : 'absolute left-8 top-1/2 z-20'}
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  {isActive ? (
                    <motion.div
                      className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border-[3px] border-[#6edbd3] bg-white text-[#177f76] shadow-[0_0_0_4px_rgba(110,219,211,0.12),0_14px_30px_rgba(46,146,136,0.14)]"
                      animate={prefersReducedMotion ? undefined : { scale: [1, 1.03, 1] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Building2 className="h-[1.7rem] w-[1.7rem]" />
                    </motion.div>
                  ) : (
                    <div className="flex h-[1.95rem] w-[1.95rem] items-center justify-center rounded-full border-[3px] border-white bg-[#d9e1e6] text-[var(--muted)] shadow-[0_8px_18px_rgba(120,140,158,0.08)]">
                      <Lock className="h-[0.9rem] w-[0.9rem]" />
                    </div>
                  )}
                </div>

                <div className="h-full pl-[4.85rem]">
                  {isActive ? (
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
                          <p className="m-0 max-w-[14rem] text-[0.82rem] font-semibold leading-[1.3] text-[var(--muted)]">{stop.summary}</p>
                        </div>

                        <div className="grid gap-1.5">
                          <div className="flex items-center justify-between text-[0.68rem] font-extrabold uppercase tracking-[0.09em] text-[var(--muted)]">
                            <span>Aurrerapena</span>
                            <span className="text-[#17897d]">65%</span>
                          </div>
                          <div className="relative h-[0.42rem] overflow-hidden rounded-full bg-[#e3eaee]">
                            <div className="h-full w-[65%] rounded-full bg-[linear-gradient(90deg,#0e7a72,#5ed2c5)]" />
                            {!prefersReducedMotion ? (
                              <motion.div
                                className="absolute top-0 h-full w-[24%] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(235,255,251,0.92),rgba(255,255,255,0))]"
                                animate={{ x: ['-35%', '290%'] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                              />
                            ) : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="inline-flex min-h-[2.85rem] w-fit items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#0b6f69,#0c847b)] px-6 text-[0.9rem] font-black text-white shadow-[0_12px_24px_rgba(12,132,123,0.22)] transition-transform duration-150 hover:-translate-y-[1px]"
                        >
                          Hasi ikasten
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ) : (
                    <div className="relative h-full opacity-80">
                      <div className="relative h-full max-w-[13.5rem]">
                        <div className="absolute left-0 top-1/2 grid -translate-y-1/2 gap-0.5">
                          <h3 className="m-0 font-display text-[1.34rem] leading-none tracking-[-0.055em] text-[#9ba9b7]">
                            {stop.town}
                          </h3>
                          <p className="m-0 max-w-[11rem] text-[0.69rem] font-semibold leading-[1.26] text-[#b0bcc7]">
                            {stop.summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isActive && index === 0 ? (
                  <div
                    className="absolute left-8 top-[calc(50%+1.95rem)] z-10 h-[3.5rem] w-[3px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#0b8478,rgba(11,132,120,0.08))]"
                    aria-hidden="true"
                  />
                ) : null}

                {!isActive ? (
                  <div
                    className="absolute left-8 z-20 -translate-x-1/2"
                    style={{ top: '-0.65rem' }}
                  >
                    <span className="inline-flex w-fit rounded-full border border-[rgba(221,229,235,0.95)] bg-[rgba(255,255,255,0.92)] px-2 py-0.5 text-[0.54rem] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)] shadow-[0_8px_16px_rgba(126,145,160,0.06)]">
                      {stop.distance}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
