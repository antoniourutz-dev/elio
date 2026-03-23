import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { TopBarMetric } from '../app/appChrome';

const streakClasses: Record<string, string> = {
  'streak-0': 'border-[rgba(208,218,225,0.84)] bg-[rgba(255,255,255,0.84)] text-[#73859a]',
  'streak-1': 'border-[rgba(230,214,122,0.45)] bg-[linear-gradient(135deg,rgba(255,250,228,0.96),rgba(250,241,196,0.94))] text-[#93731c] streak-chip-1',
  'streak-2': 'border-[rgba(223,190,88,0.5)] bg-[linear-gradient(135deg,rgba(255,246,213,0.98),rgba(247,232,176,0.94))] text-[#876819] streak-chip-2',
  'streak-3': 'border-[rgba(210,175,66,0.5)] bg-[linear-gradient(135deg,rgba(255,242,192,0.98),rgba(240,221,149,0.96))] text-[#725616] streak-chip-3',
  'streak-4': 'border-[rgba(194,156,44,0.54)] bg-[linear-gradient(135deg,rgba(253,236,168,0.98),rgba(232,201,104,0.96))] text-[#5d4610] streak-chip-4',
};

const streakIconClasses: Record<string, string> = {
  'streak-3': 'streak-icon-flicker',
  'streak-4': 'streak-icon-flicker-intense',
};

const TopBarButton = ({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) => (
  <button
    className="inline-flex items-center justify-center gap-2 min-h-[38px] px-3 rounded-full border border-[rgba(205,216,224,0.88)] bg-[rgba(255,255,255,0.78)] backdrop-blur-[14px] text-[#4e6378] text-[0.78rem] font-extrabold leading-none whitespace-nowrap shadow-[0_10px_26px_rgba(105,125,142,0.08)] transition-[transform,background-color,border-color,box-shadow,color] duration-150 hover:-translate-y-[1px] hover:border-[rgba(84,179,175,0.46)] hover:text-[#27485e]"
    type="button"
    onClick={onClick}
  >
    <span className="w-[16px] h-[16px] [&_svg]:w-full [&_svg]:h-full">{icon}</span>
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
    'inline-flex items-center justify-center gap-2 min-h-[38px] px-3 rounded-full border backdrop-blur-[14px] text-[0.82rem] font-extrabold leading-none whitespace-nowrap shadow-[0_10px_24px_rgba(105,125,142,0.08)]';
  const defaultVariant =
    'border-[rgba(207,216,224,0.84)] bg-[rgba(255,255,255,0.78)] text-[#54697d]';
  const successVariant =
    'border-[rgba(141,214,193,0.5)] bg-[linear-gradient(135deg,rgba(232,250,242,0.96),rgba(216,244,232,0.92))] text-[#267b67]';
  const streakVariant = streakTone && streakClasses[streakTone] ? streakClasses[streakTone] : defaultVariant;
  const appliedClass = variant === 'success' ? successVariant : variant === 'streak' ? streakVariant : defaultVariant;
  const iconAnimClass = variant === 'streak' && streakTone ? (streakIconClasses[streakTone] ?? '') : '';

  return (
    <div className={clsx(baseClasses, appliedClass)}>
      {icon ? <span className={clsx('w-[17px] h-[17px] [&_svg]:w-full [&_svg]:h-full', iconAnimClass)}>{icon}</span> : null}
      <span className="min-w-0 overflow-hidden text-ellipsis">{label}</span>
    </div>
  );
};

interface AppTopBarProps {
  title: string;
  subtitle: string | null;
  showBackButton: boolean;
  onBack: () => void;
  metric: TopBarMetric | null;
  secondaryMetric?: TopBarMetric | null;
  backIcon: ReactNode;
  avatarSrc?: string | null;
  avatarAlt?: string;
}

export function AppTopBar({
  title,
  subtitle,
  showBackButton,
  onBack,
  metric,
  secondaryMetric,
  backIcon,
  avatarSrc,
  avatarAlt = 'Jokalariaren avatarra',
}: AppTopBarProps) {
  const MetricIcon = metric?.icon;
  const SecondaryMetricIcon = secondaryMetric?.icon;

  return (
    <div className="relative w-full z-[100] pointer-events-auto shrink-0 pt-[max(env(safe-area-inset-top),6px)] bg-[rgba(245,246,241,0.78)] backdrop-blur-[12px] backdrop-saturate-[135%] border-0 shadow-none">
      <div className="w-[min(var(--page-width),100%)] grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 min-h-[58px] px-[16px] py-2 mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {avatarSrc ? (
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[rgba(211,220,227,0.74)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,246,244,0.92))] shadow-[0_10px_22px_rgba(105,125,142,0.1)]">
              <img src={avatarSrc} alt={avatarAlt} className="h-9 w-9 object-contain" />
            </span>
          ) : null}
          {showBackButton ? <TopBarButton onClick={onBack} icon={backIcon} label="Itzuli" /> : null}
        </div>

        <div className="grid justify-items-center gap-[2px] text-center min-w-0">
          {subtitle ? <span className="text-[#7a8b9b] text-[0.65rem] font-extrabold tracking-[0.16em] uppercase">{subtitle}</span> : null}
        </div>

        <div className="flex items-center justify-end gap-2 min-w-0">
          {metric ? (
            <TopBarChip
              variant={metric.variant}
              streakTone={metric.streakTone}
              icon={MetricIcon ? <MetricIcon /> : undefined}
              label={metric.label}
            />
          ) : null}
          {secondaryMetric ? (
            <TopBarChip
              variant={secondaryMetric.variant}
              streakTone={secondaryMetric.streakTone}
              icon={SecondaryMetricIcon ? <SecondaryMetricIcon /> : undefined}
              label={secondaryMetric.label}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
