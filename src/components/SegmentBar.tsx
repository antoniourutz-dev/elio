import clsx from 'clsx';
import type { SessionAnswer } from '../appTypes';

export const SegmentBar = ({
  total,
  answers,
  currentIndex,
  filledCount,
}: {
  total: number;
  answers?: SessionAnswer[];
  currentIndex?: number;
  filledCount?: number;
}) => (
  <div className="segment-track" aria-hidden="true">
    {Array.from({ length: total }, (_, index) => {
      const answer = answers?.[index];
      const className = clsx('segment', {
        'segment-success': answer?.isCorrect || (typeof filledCount === 'number' && index < filledCount),
        'segment-error': answer && !answer.isCorrect,
        'segment-current': !answer && typeof currentIndex === 'number' && index === currentIndex,
      });
      return <span key={`segment-${index + 1}`} className={className} />;
    })}
  </div>
);
