import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { TopBarMetric } from '../app/appChrome';

const streakClasses: Record<string, string> = {
  'streak-0': 'bg-[rgba(250,252,252,0.98)] text-[#7f8ba6] border-[rgba(209,223,229,0.92)]',
  'streak-1': 'bg-gradient-to-b from-[#fefbe8] to-[#faf3c8] text-[#9f8530] border-[rgba(230,215,111,0.42)] streak-chip-1',
  'streak-2': 'bg-gradient-to-b from-[#fdf6d0] to-[#f7ebb0] text-[#8a7020] border-[rgba(218,190,72,0.46)] streak-chip-2',
  'streak-3': 'bg-gradient-to-br from-[#fdf2b8] to-[#f4e090] text-[#77601a] border-[rgba(205,175,55,0.5)] streak-chip-3',
  'streak-4': 'bg-gradient-to-br from-[#fceea0] to-[#efd068] text-[#624e12] border-[rgba(192,158,38,0.55)] streak-chip-4',
};

const streakIconClasses: Record<string, string> = {
  'streak-3': 'streak-icon-flicker',
  'streak-4': 'streak-icon-flicker-intense',
};

const TopBarButton = ({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) => (
  <button
    className="inline-flex items-center justify-center gap-[6px] min-h-[32px] px-2.5 rounded-full border border-[rgba(214,226,234,0.84)] bg-white/78 backdrop-blur-[10px] text-[#5a7089] text-[0.8rem] font-extrabold leading-none whitespace-nowrap shadow-[0_2px_8px_rgba(100,140,160,0.05)] cursor-pointer transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-[#6bb8d9]/45 hover:-translate-y-[1px] hover:border-[#6bb8d9]/80 hover:text-[#3f617b] hover:shadow-[0_4px_12px_rgba(107,184,217,0.1)]"
    type="button"
    onClick={onClick}
  >
    <div className="w-[16px] h-[16px] [&_svg]:w-full [&_svg]:h-full">{icon}</div>
    <span className="min-w-0 overflow-hidden text-ellipsis">{label}</span>
  </button>
);

const TopBarChip = ({
  icon,
  label,
  variant = 'default',
  streakTone,
}: {
  icon?: ReactNode;
  label: ReactNode;
  variant?: 'default' | 'success' | 'streak';
  streakTone?: string;
}) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-[6px] min-h-[32px] px-2.5 rounded-full border backdrop-blur-[10px] text-[0.8rem] font-extrabold leading-none whitespace-nowrap transition-colors duration-150 ease-out';
  const defaultVariant =
    'bg-white/78 border-[rgba(214,226,234,0.84)] text-[#5a7089] shadow-[0_2px_8px_rgba(100,140,160,0.05)]';
  const successVariant =
    'bg-gradient-to-br from-[rgba(220,248,238,0.94)] to-[rgba(210,246,234,0.9)] text-[#2e8a6e] border-[rgba(140,220,190,0.46)] shadow-[0_2px_8px_rgba(100,140,160,0.06)]';
  const streakVariant = streakTone && streakClasses[streakTone] ? streakClasses[streakTone] : defaultVariant;
  const appliedClass = variant === 'success' ? successVariant : variant === 'streak' ? streakVariant : defaultVariant;

  const iconAnimClass = variant === 'streak' && streakTone ? (streakIconClasses[streakTone] ?? '') : '';

  return (
    <div className={clsx(baseClasses, appliedClass)}>
      {icon ? <div className={clsx('w-[16px] h-[16px] [&_svg]:w-full [&_svg]:h-full', iconAnimClass)}>{icon}</div> : null}
      <span className="min-w-0 overflow-hidden text-ellipsis">{label}</span>
    </div>
  );
};

interface AppTopBarProps {
  title: string;
  subtitle: string | null;
  completedLevels: number;
  totalLevels: number;
  showBackButton: boolean;
  onBack: () => void;
  metric: TopBarMetric | null;
  secondaryMetric?: TopBarMetric | null;
  backIcon: ReactNode;
  progressIcon: ReactNode;
  avatarSrc?: string | null;
  avatarAlt?: string;
}

export function AppTopBar({
  title,
  subtitle,
  completedLevels,
  totalLevels,
  showBackButton,
  onBack,
  metric,
  secondaryMetric,
  backIcon,
  progressIcon,
  avatarSrc,
  avatarAlt = 'Jokalariaren avatarra',
}: AppTopBarProps) {
  const MetricIcon = metric?.icon;
  const SecondaryMetricIcon = secondaryMetric?.icon;

  return (
    <div className="relative w-full z-[100] pointer-events-auto shrink-0 pt-[max(env(safe-area-inset-top),4px)] bg-[rgba(248,253,255,0.76)] backdrop-blur-[18px] backdrop-saturate-[165%] border-b border-[rgba(209,223,229,0.42)] shadow-[0_1px_12px_rgba(100,140,160,0.05)]">
      <div className="w-[min(var(--page-width),100%)] grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 min-h-[48px] px-[16px] py-1 mx-auto">
        <div className="flex items-center gap-2 min-w-0 self-center">
          {avatarSrc ? (
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(77,182,165,0.24)] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.96),rgba(229,246,242,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_12px_rgba(61,160,144,0.16)]">
              <img src={avatarSrc} alt={avatarAlt} className="h-7 w-7 object-contain" />
            </span>
          ) : null}
          {showBackButton ? (
            <TopBarButton onClick={onBack} icon={backIcon} label="Itzuli" />
          ) : (
            <TopBarChip icon={progressIcon} label={`${completedLevels}/${totalLevels}`} />
          )}
        </div>

        <div className="grid justify-items-center gap-0.5 text-center min-w-0 self-center">
          <strong className="font-display text-[clamp(1rem,2vw,1.28rem)] leading-none tracking-[-0.05em] text-[#203143]">{title}</strong>
          {subtitle && <span className="text-[#6e8294] text-[0.67rem] font-extrabold tracking-[0.11em] uppercase opacity-80">{subtitle}</span>}
        </div>

        <div className="flex items-center justify-end gap-2 min-w-0 self-center">
          {metric && (
            <TopBarChip
              variant={metric.variant}
              streakTone={metric.streakTone}
              icon={MetricIcon ? <MetricIcon /> : undefined}
              label={metric.label}
            />
          )}
          {secondaryMetric && (
            <TopBarChip
              variant={secondaryMetric.variant}
              streakTone={secondaryMetric.streakTone}
              icon={SecondaryMetricIcon ? <SecondaryMetricIcon /> : undefined}
              label={secondaryMetric.label}
            />
          )}
        </div>
      </div>
    </div>
  );
}
