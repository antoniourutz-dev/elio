import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getLevelMetersForProgress } from '../euskeraLearning';
import { SegmentBar } from '../components/SegmentBar';
import { formatMeterProgress, formatMeters, formatPercentage } from '../formatters';
import type { LevelSummary, SessionAnswer } from '../appTypes';

interface SummaryViewProps {
  summary: LevelSummary;
  summaryErrors: SessionAnswer[];
}

export const SummaryView = memo(function SummaryView({ summary, summaryErrors }: SummaryViewProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // Move focus to summary heading so screen readers announce the result
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="screen-card"
    >
      <div className="screen-heading">
        <h2 ref={headingRef} tabIndex={-1}>{summary.level.name}</h2>
      </div>

      <div className="result-card">
        <div className="result-score-row">
          <span className="result-score">
            {summary.correctCount}/{summary.totalQuestions}
          </span>
          <span className="result-percentage">{formatPercentage(summary.percentage)}</span>
        </div>
        <p className="result-copy">Saio honetako emaitza</p>
        <SegmentBar total={summary.totalQuestions} filledCount={summary.correctCount} />
      </div>

      <div className="summary-panel">
        <div className="summary-row">
          <span>Maila</span>
          <strong>{summary.level.name}</strong>
        </div>
        <div className="summary-row">
          <span>Saio honetako emaitza</span>
          <strong>
            {summary.correctCount}/{summary.totalQuestions} · {formatPercentage(summary.percentage)}
          </strong>
        </div>
        <div className="summary-row">
          <span>Mailako aurrerapena</span>
          <strong>
            {formatMeterProgress(
              getLevelMetersForProgress(summary.level, summary.masteredCount, summary.levelTotalQuestions),
              summary.level.elevationMeters
            )}
          </strong>
        </div>
        <div className="summary-row">
          <span>Hurrengo mailarako</span>
          <strong>
            {formatMeters(getLevelMetersForProgress(summary.level, summary.unlockTargetCount, summary.levelTotalQuestions))}
          </strong>
        </div>
      </div>

      <div className="review-card">
        <div className="section-kicker">Berrikusi</div>

        <div className="review-list">
          {summaryErrors.length === 0 && (
            <div className="review-item review-item-success">
              <strong>Bikain</strong>
              <span>Maila honetan ez duzu akatsik egin.</span>
            </div>
          )}

          {summaryErrors.map((answer) => (
            <div key={answer.questionId} className="review-item">
              <strong>{answer.word}</strong>
              <span>
                Hautatua: {answer.selectedAnswer} | Zuzena: {answer.correctAnswer}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
});
