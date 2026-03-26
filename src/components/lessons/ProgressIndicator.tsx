interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressIndicator({ current, total, label = 'Aurrerapena' }: ProgressIndicatorProps) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.max(0, Math.min(current, safeTotal));
  const progressWidth = `${(safeCurrent / safeTotal) * 100}%`;

  return (
    <div className="grid gap-3 rounded-[1.5rem] border border-[rgba(218,226,232,0.78)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,249,249,0.92))] px-4 py-3 shadow-[0_10px_24px_rgba(107,132,154,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
        <span className="inline-flex min-w-[3.6rem] items-center justify-center rounded-full bg-[rgba(12,132,123,0.08)] px-2.5 py-1 text-[0.8rem] font-black tracking-[-0.03em] text-[#117d73]">
          {safeCurrent}/{safeTotal}
        </span>
      </div>
      <div className="relative h-[0.7rem] overflow-hidden rounded-full bg-[#e3eaee]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#0f7b72,#63d5c7)] transition-[width] duration-300 ease-out"
          style={{ width: progressWidth }}
        />
      <div
          className="absolute inset-y-0 left-0 w-[28%] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(230,255,249,0.95),rgba(255,255,255,0))] motion-safe:animate-[progress-shimmer_2.2s_linear_infinite] motion-reduce:animate-none"
        />
      </div>
    </div>
  );
}
