import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Flag } from 'lucide-react';
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

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      headingRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const climbedMeters = getLevelMetersForProgress(summary.level, summary.masteredCount, summary.levelTotalQuestions);
  const nextTargetMeters = getLevelMetersForProgress(summary.level, summary.unlockTargetCount, summary.levelTotalQuestions);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="grid gap-[18px] max-w-[600px] mx-auto p-[24px] rounded-[36px]"
    >
      <div className="grid gap-[6px]">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.96] tracking-[-0.05em] text-[var(--text)] m-0 outline-none"
        >
          {summary.level.name}
        </h2>
      </div>

      <div className="grid gap-[12px] p-[20px] rounded-[30px] bg-gradient-to-br from-[rgba(230,252,242,0.98)] to-[rgba(248,255,252,0.95)] border-[1.5px] border-[#81d8b6] shadow-[0_16px_40px_rgba(95,200,160,0.14)]">
        <div className="flex items-end justify-between gap-[14px]">
          <span className="font-display text-[clamp(2.8rem,10vw,4.2rem)] font-extrabold leading-none tracking-[-0.05em] text-[var(--text)]">
            {summary.correctCount}/{summary.totalQuestions}
          </span>
          <span className="shrink-0 text-[var(--text)] font-display text-[clamp(1.35rem,4vw,2.1rem)] font-extrabold leading-[1.1] tracking-[-0.04em]">
            {formatPercentage(summary.percentage)}
          </span>
        </div>
        <p className="text-[var(--muted)] m-0">Saio honetako emaitza</p>
        <SegmentBar total={summary.totalQuestions} filledCount={summary.correctCount} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2 p-[16px] rounded-[24px] border border-[rgba(216,226,241,0.88)] bg-[rgba(249,251,255,0.96)] shadow-[0_6px_18px_rgba(107,148,165,0.06)]">
          <span className="inline-flex items-center gap-2 text-[0.74rem] font-extrabold tracking-[0.14em] uppercase text-[#35b1d4]">
            <CheckCircle2 className="w-4 h-4" />
            Mendiaren aurrerapena
          </span>
          <strong className="text-[1rem] font-extrabold text-[var(--text)]">
            {formatMeterProgress(climbedMeters, summary.level.elevationMeters)}
          </strong>
        </div>

        <div className="grid gap-2 p-[16px] rounded-[24px] border border-[rgba(216,226,241,0.88)] bg-[rgba(249,251,255,0.96)] shadow-[0_6px_18px_rgba(107,148,165,0.06)]">
          <span className="inline-flex items-center gap-2 text-[0.74rem] font-extrabold tracking-[0.14em] uppercase text-[#35b1d4]">
            <Flag className="w-4 h-4" />
            Hurrengo helburua
          </span>
          <strong className="text-[1rem] font-extrabold text-[var(--text)]">{formatMeters(nextTargetMeters)}</strong>
        </div>
      </div>

      <div className="grid gap-[14px] p-[20px] rounded-[26px] bg-[rgba(250,251,253,0.96)] border border-[rgba(216,226,241,0.88)] text-left">
        <div className="text-[#35b1d4] tracking-[0.18em] font-bold text-[0.78rem] uppercase m-0">Berrikusi</div>

        <div className="flex flex-col gap-[10px]">
          {summaryErrors.length === 0 && (
            <div className="grid gap-[6px] p-[14px_16px] rounded-[20px] bg-[rgba(233,249,243,0.96)] border border-[#81d8b6] shadow-[0_2px_8px_rgba(107,148,165,0.06)]">
              <strong className="text-[1rem] font-extrabold tracking-[-0.02em] text-[var(--text)]">Bikain</strong>
              <span className="text-[0.92rem] leading-[1.5] text-[var(--muted)]">Maila honetan ez duzu akatsik egin.</span>
            </div>
          )}

          {summaryErrors.map((answer) => (
            <div
              key={answer.questionId}
              className="grid gap-[8px] p-[14px_16px] rounded-[20px] bg-[rgba(255,255,255,0.98)] border border-[rgba(216,226,241,0.8)] shadow-[0_2px_8px_rgba(107,148,165,0.06)]"
            >
              <strong className="text-[1rem] font-extrabold tracking-[-0.02em] text-[var(--text)]">{answer.word}</strong>
              <span className="inline-flex items-center gap-2 text-[0.92rem] leading-[1.5] text-[var(--muted)]">
                <span>Hautatua: {answer.selectedAnswer}</span>
                <ArrowUpRight className="w-4 h-4 text-[#35b1d4]" />
                <span>Zuzena: {answer.correctAnswer}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
});
