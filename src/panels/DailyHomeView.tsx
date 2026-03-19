import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ArrowRight, BookOpen, ChevronDown, CirclePlay, Medal } from 'lucide-react';
import type { DailyResult, DailyRankingEntry, DailyWeeklyRankingEntry } from '../appTypes';
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
  if (rank === 1) return <Medal className="daily-rank-icon daily-rank-gold" />;
  if (rank === 2) return <Medal className="daily-rank-icon daily-rank-silver" />;
  if (rank === 3) return <Medal className="daily-rank-icon daily-rank-bronze" />;
  return <span className="daily-rank-number">#{rank}</span>;
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

  const top5Daily = ranking.slice(0, 5);
  const myDailyOutside = myRankEntry && myRankEntry.rank > 5;
  const top5Weekly = weeklyRanking.slice(0, 5);
  const myWeeklyOutside = myWeekRankEntry && myWeekRankEntry.rank > 5;
  const weekDays = getWeekDays(dayKey);
  const playedKeys = new Set(weekHistory.map((result) => result.dayKey));
  const featuredDailyLeader = ranking[0] ?? null;
  const featuredWeeklyLeader = weeklyRanking[0] ?? null;

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="daily-home-view"
    >
      <div className="daily-hero-card">
        <div className="daily-hero-orb daily-hero-orb-a" aria-hidden="true" />
        <div className="daily-hero-orb daily-hero-orb-b" aria-hidden="true" />

        <div className="daily-hero-head">
          <div className="daily-hero-copy">
            <h2 className="daily-hero-title">Eguneko jokoa</h2>
            <p className="daily-hero-sub">{formatDayKey(dayKey)}</p>
          </div>
        </div>

        <div className="daily-week-strip">
          {weekDays.map(({ key, label }) => {
            const played = playedKeys.has(key);
            const isToday = key === dayKey;

            return (
              <div key={key} className="daily-week-dot-col">
                <div
                  className={clsx('daily-week-dot', {
                    'daily-week-dot-played': played,
                    'daily-week-dot-today': isToday,
                    'daily-week-dot-today-played': isToday && played,
                  })}
                >
                  {played && (
                    <svg viewBox="0 0 10 10" className="daily-week-check">
                      <polyline
                        points="2,5.5 4,8 8,2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className={clsx('daily-week-label', { 'daily-week-label-today': isToday })}>{label}</span>
              </div>
            );
          })}
        </div>

        <div className="daily-cta">
          {isLoadingData ? (
            <button type="button" className="primary-button daily-play-button" disabled>
              <CirclePlay className="dock-svg" />
              <span>Kargatzen...</span>
            </button>
          ) : dailyResult ? (
            <button type="button" className="primary-button daily-play-button daily-play-done" disabled>
              <span>Bihar berriz</span>
            </button>
          ) : (
            <button
              type="button"
              className="primary-button daily-play-button"
              onClick={onStartGame}
              disabled={!canStartGame}
            >
              <CirclePlay className="dock-svg" />
              <span>Hasi jokoa</span>
            </button>
          )}
        </div>
      </div>

      <div className="daily-ranking-card">
        <div className="daily-ranking-header">
          <div className="daily-ranking-tabs">
            <button
              type="button"
              className={clsx('daily-ranking-tab', { 'daily-ranking-tab-active': rankTab === 'daily' })}
              onClick={() => setRankTab('daily')}
            >
              Gaur
            </button>
            <button
              type="button"
              className={clsx('daily-ranking-tab', { 'daily-ranking-tab-active': rankTab === 'weekly' })}
              onClick={() => setRankTab('weekly')}
            >
              Astea
            </button>
          </div>
          {isLoadingData && <span className="daily-ranking-loading">·</span>}
        </div>

        {rankTab === 'daily' && (
          <>
            {!isLoadingData && ranking.length === 0 && (
              <p className="daily-ranking-empty">Oraindik ez dago emaitzarik gaur.</p>
            )}
            {!isLoadingData && featuredDailyLeader && (
              <div className="daily-ranking-featured">
                <div className="daily-ranking-featured-rank">
                  <RankBadge rank={featuredDailyLeader.rank} />
                </div>
                <div className="daily-ranking-featured-copy">
                  <strong>{featuredDailyLeader.playerCode}</strong>
                  <span>Gaurko denborarik onena: {formatSeconds(featuredDailyLeader.secondsElapsed)}</span>
                </div>
                <div className="daily-ranking-featured-score">{featuredDailyLeader.score} pt</div>
              </div>
            )}
            <div className="daily-ranking-list">
              {top5Daily.slice(featuredDailyLeader ? 1 : 0).map((entry) => (
                <div
                  key={entry.playerCode}
                  className={clsx('daily-ranking-row', {
                    'daily-ranking-row-mine': entry.playerCode === myRankEntry?.playerCode,
                    'daily-ranking-row-top': entry.rank === 1,
                  })}
                >
                  <RankBadge rank={entry.rank} />
                  <span className="daily-ranking-code">{entry.playerCode}</span>
                  <span className="daily-ranking-score">{entry.score} pt</span>
                  <span className="daily-ranking-time">{formatSeconds(entry.secondsElapsed)}</span>
                </div>
              ))}
              {myDailyOutside && (
                <>
                  <div className="daily-ranking-ellipsis">···</div>
                  <div className="daily-ranking-row daily-ranking-row-mine">
                    <RankBadge rank={myRankEntry.rank} />
                    <span className="daily-ranking-code">{myRankEntry.playerCode}</span>
                    <span className="daily-ranking-score">{myRankEntry.score} pt</span>
                    <span className="daily-ranking-time">{formatSeconds(myRankEntry.secondsElapsed)}</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {rankTab === 'weekly' && (
          <>
            {!isLoadingData && weeklyRanking.length === 0 && (
              <p className="daily-ranking-empty">Oraindik ez dago emaitzarik aste honetan.</p>
            )}
            {!isLoadingData && featuredWeeklyLeader && (
              <div className="daily-ranking-featured daily-ranking-featured-weekly">
                <div className="daily-ranking-featured-rank">
                  <RankBadge rank={featuredWeeklyLeader.rank} />
                </div>
                <div className="daily-ranking-featured-copy">
                  <strong>{featuredWeeklyLeader.playerCode}</strong>
                  <span>{featuredWeeklyLeader.daysPlayed} eguneko errendimendua</span>
                </div>
                <div className="daily-ranking-featured-score">{featuredWeeklyLeader.totalScore} pt</div>
              </div>
            )}
            <div className="daily-ranking-list">
              {top5Weekly.slice(featuredWeeklyLeader ? 1 : 0).map((entry) => (
                <div
                  key={entry.playerCode}
                  className={clsx('daily-ranking-row daily-ranking-row-weekly', {
                    'daily-ranking-row-mine': entry.playerCode === myWeekRankEntry?.playerCode,
                    'daily-ranking-row-top': entry.rank === 1,
                  })}
                >
                  <RankBadge rank={entry.rank} />
                  <span className="daily-ranking-code">{entry.playerCode}</span>
                  <span className="daily-ranking-score">{entry.totalScore} pt</span>
                  <span className="daily-ranking-time">{entry.daysPlayed} egun</span>
                </div>
              ))}
              {myWeeklyOutside && (
                <>
                  <div className="daily-ranking-ellipsis">···</div>
                  <div className="daily-ranking-row daily-ranking-row-weekly daily-ranking-row-mine">
                    <RankBadge rank={myWeekRankEntry.rank} />
                    <span className="daily-ranking-code">{myWeekRankEntry.playerCode}</span>
                    <span className="daily-ranking-score">{myWeekRankEntry.totalScore} pt</span>
                    <span className="daily-ranking-time">{myWeekRankEntry.daysPlayed} egun</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className={clsx(`daily-pill-card daily-pill-${pill.tone}`, {
          'daily-pill-card-expanded': isPillExpanded,
          'daily-pill-card-collapsed': !isPillExpanded,
        })}
        aria-expanded={isPillExpanded}
        onClick={() => setIsPillExpanded((current) => !current)}
      >
        <div className="daily-pill-header-zone">
          <div className="daily-pill-head">
            <span className="daily-pill-category">{pill.category || PILL_CATEGORY_LABELS[pill.tone]}</span>
            <span className="daily-pill-header-actions">
              <span className="daily-pill-badge">Eguneko pildora</span>
              <ChevronDown
                className={clsx('daily-pill-toggle-icon', { 'daily-pill-toggle-icon-open': isPillExpanded })}
              />
            </span>
          </div>
          <h3 className="daily-pill-title">{pill.title}</h3>
        </div>
        <div className="daily-pill-body-zone">
          <p className="daily-pill-body">{pill.body}</p>
          {pill.example && (
            <div className="daily-pill-example">
              <span className="daily-pill-example-label">Adibidea</span>
              <span className="daily-pill-example-text">{pill.example}</span>
            </div>
          )}
        </div>
      </button>

      <button type="button" className="synonyms-nav-button" onClick={onGoSynonyms}>
        <span className="synonyms-nav-icon-shell">
          <BookOpen className="synonyms-nav-icon" />
        </span>
        <div className="synonyms-nav-copy">
          <span className="synonyms-nav-kicker">Ikasketa modua</span>
          <strong>Sinonimoak ikasi</strong>
        </div>
        <ArrowRight className="synonyms-nav-arrow" />
      </button>
    </motion.div>
  );
});
