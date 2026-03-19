import { memo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, CircleUserRound, Clock, LogOut, Sparkles, XCircle } from 'lucide-react';
import type { PlayerIdentity } from '../euskeraLearning';
import type { BankState, DailyResult, DailyStoredAnswer } from '../appTypes';

interface ProfileViewProps {
  activePlayer: PlayerIdentity;
  bankState: BankState;
  weekHistory: DailyResult[];
  isLoadingData: boolean;
  onLogout: () => void;
}

const DAY_LABELS: Record<string, string> = {
  '0': 'Ig', '1': 'Al', '2': 'Az', '3': 'Az', '4': 'Og', '5': 'Or', '6': 'La',
};

function dayLabel(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00`);
  const dow = String(date.getDay());
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${DAY_LABELS[dow] ?? '?'} ${dd}/${mm}`;
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function AnswerReview({ answers }: { answers: DailyStoredAnswer[] }) {
  if (answers.length === 0) {
    return <p className="profile-review-empty">Ez dago xehetasunik erregistro zahar honetatik.</p>;
  }
  return (
    <div className="profile-review-list">
      {answers.map((ans, i) => (
        <div key={`${ans.word}-${i}`} className="profile-review-item">
          <span className={`profile-review-dot ${ans.isCorrect ? 'profile-review-dot-ok' : 'profile-review-dot-err'}`} />
          <span className="profile-review-word">{ans.word}</span>
          {ans.isCorrect ? (
            <span className="profile-review-answer profile-review-answer-ok">{ans.selected}</span>
          ) : (
            <span className="profile-review-answer profile-review-answer-err">
              {ans.selected} <span className="profile-review-correct">→ {ans.correct}</span>
            </span>
          )}
          <span className="profile-review-type">{ans.type === 'spelling' ? 'Ort.' : 'Sin.'}</span>
        </div>
      ))}
    </div>
  );
}

export const ProfileView = memo(function ProfileView({
  activePlayer,
  bankState,
  weekHistory,
  isLoadingData,
  onLogout,
}: ProfileViewProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const bankStatusLabel = bankState.isLoading
    ? 'Kargatzen...'
    : bankState.isReady
      ? `${bankState.entries.length} hitz prest`
      : 'Demoko hitzak';

  const toggleDay = (dayKey: string) =>
    setExpandedDay((prev) => (prev === dayKey ? null : dayKey));

  return (
    <section className="profile-panel">
      <div className="profile-inline">
        <span className="profile-inline-icon">
          <CircleUserRound className="profile-inline-svg" />
        </span>
        <div className="profile-inline-copy">
          <strong>{activePlayer.code}</strong>
          <span>Jokalari erregistratua</span>
        </div>
      </div>

      <div className="profile-panel-row">
        <div className="status-chip">
          <Sparkles className="status-chip-icon" />
          <span>{bankStatusLabel}</span>
        </div>
        <span className="player-code-chip">{activePlayer.code}</span>
      </div>

      {/* Weekly game history */}
      <div className="profile-week-card">
        <p className="section-label">Eguneko jokoa</p>
        <h3 className="profile-week-title">Aste honetako partida</h3>

        {isLoadingData && (
          <div className="profile-week-loading" aria-label="Kargatzen..." />
        )}

        {!isLoadingData && weekHistory.length === 0 && (
          <p className="profile-week-empty">Oraindik ez duzu aste honetan jokorik jokatu.</p>
        )}

        {!isLoadingData && weekHistory.length > 0 && (
          <div className="profile-week-list">
            {weekHistory.map((result) => {
              const isExpanded = expandedDay === result.dayKey;
              const perfect = result.correctCount === result.totalQuestions;
              return (
                <div key={result.dayKey} className="profile-week-entry">
                  <button
                    type="button"
                    className="profile-week-row"
                    onClick={() => toggleDay(result.dayKey)}
                    aria-expanded={isExpanded ? 'true' : 'false'}
                  >
                    <span className="profile-week-day">{dayLabel(result.dayKey)}</span>
                    <span className="profile-week-score">{result.score} pt</span>
                    <span className="profile-week-correct">
                      {perfect
                        ? <CheckCircle2 className="profile-week-icon profile-week-icon-ok" />
                        : <XCircle className="profile-week-icon profile-week-icon-err" />}
                      {result.correctCount}/{result.totalQuestions}
                    </span>
                    <span className="profile-week-time">
                      <Clock className="profile-week-icon" />
                      {formatSeconds(result.secondsElapsed)}
                    </span>
                    {isExpanded
                      ? <ChevronUp className="profile-week-chevron" />
                      : <ChevronDown className="profile-week-chevron" />}
                  </button>

                  {isExpanded && <AnswerReview answers={result.answers} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className="logout-button logout-button-wide" type="button" onClick={onLogout}>
        <LogOut className="logout-button-icon" />
        <span>Saioa itxi</span>
      </button>
    </section>
  );
});
