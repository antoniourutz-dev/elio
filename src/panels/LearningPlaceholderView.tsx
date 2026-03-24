import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';

interface LearningPlaceholderViewProps {
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
}

export const LearningPlaceholderView = memo(function LearningPlaceholderView({
  eyebrow,
  title,
  body,
  icon: Icon,
}: LearningPlaceholderViewProps) {
  return (
    <section className="grid gap-5 rounded-[32px] border border-[rgba(216,226,241,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.96))] p-6 shadow-[0_18px_48px_rgba(110,130,150,0.08)]">
      <div className="grid gap-2">
        <p className="m-0 text-[0.78rem] font-extrabold uppercase tracking-[0.1em] text-[#6bb8d9]">{eyebrow}</p>
        <h2 className="m-0 font-display text-[clamp(1.9rem,4vw,2.7rem)] leading-[0.94] tracking-[-0.05em] text-[var(--text)]">
          Atal hau prestatzen ari gara
        </h2>
        <p className="m-0 max-w-[34rem] text-[0.96rem] font-medium leading-relaxed text-[var(--muted)]">{body}</p>
      </div>

      <div className="grid gap-4 rounded-[28px] border border-[rgba(145,195,214,0.26)] bg-[linear-gradient(135deg,rgba(121,183,223,0.14),rgba(226,240,184,0.26))] p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(255,255,255,0.74)] shadow-[0_10px_24px_rgba(117,171,210,0.14)]">
            <Icon className="h-5 w-5 text-[#5684a4]" />
          </span>
          <span className="inline-flex min-h-[34px] items-center rounded-full bg-[rgba(255,255,255,0.74)] px-3 text-[0.78rem] font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">
            Laster hemen
          </span>
        </div>

        <div className="rounded-[22px] border border-dashed border-[rgba(112,146,170,0.26)] bg-[rgba(255,255,255,0.7)] p-4">
          <div className="flex items-start gap-3">
            <Construction className="mt-0.5 h-5 w-5 shrink-0 text-[var(--muted)]" />
            <p className="m-0 text-[0.94rem] font-semibold leading-relaxed text-[var(--text-2)]">
              Oraingoz prozesuan dago. Hurrengo bertsioetan hemen agertuko dira lehen edukiak.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});
