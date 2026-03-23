import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface DockButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'primary';
  wide?: boolean;
  active?: boolean;
}

function DockButton({
  label,
  icon,
  onClick,
  disabled = false,
  tone = 'neutral',
  wide = false,
  active = false,
}: DockButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={clsx(
        'relative inline-flex items-center justify-center min-h-[40px] px-1 border-none cursor-pointer overflow-hidden transition-[color,opacity,transform] duration-150 ease-out',
        wide ? 'flex-[1.35]' : 'flex-[1_1_0]',
        tone === 'primary'
          ? 'text-white'
          : active
            ? 'text-[#1f746f]'
            : 'text-[#90a1b1]',
        disabled ? 'opacity-60 cursor-not-allowed transform-none' : ''
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {tone === 'primary' ? (
        <span className="absolute inset-y-[5px] inset-x-[6px] rounded-[18px] bg-[linear-gradient(135deg,#45b9b4_0%,#73cbb2_52%,#c8dc75_100%)] shadow-[0_6px_14px_rgba(93,186,166,0.18)]" />
      ) : active ? (
        <span className="absolute inset-y-[5px] inset-x-[6px] rounded-[18px] bg-[rgba(237,246,243,0.96)] border border-[rgba(181,221,211,0.68)] shadow-[0_6px_14px_rgba(105,125,142,0.06)]" />
      ) : null}

      <span className="relative inline-flex flex-col items-center justify-center gap-[1px] min-w-0 w-full">
        <span className={clsx('inline-flex items-center justify-center transition-transform duration-150', active && tone === 'neutral' && '-translate-y-[1px]')}>
          <span className="w-[22px] h-[22px] [&_svg]:w-full [&_svg]:h-full">{icon}</span>
        </span>
        <span
          className={clsx(
            'block text-[0.5rem] tracking-[0.01em] leading-none text-ellipsis whitespace-nowrap overflow-hidden max-w-full',
            active || tone === 'primary' ? 'font-extrabold' : 'font-semibold'
          )}
        >
          {label}
        </span>
      </span>
    </motion.button>
  );
}

interface AppBottomDockProps {
  children: ReactNode;
}

export function AppBottomDock({ children }: AppBottomDockProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] pointer-events-auto">
      <div
        className="border-t border-[rgba(214,222,229,0.75)] bg-[rgba(250,251,247,0.98)] shadow-[0_-2px_10px_rgba(99,117,135,0.03)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <nav
          className="mx-auto flex h-[54px] w-full items-center gap-[2px] px-2"
          aria-label="Ekintza nagusiak"
        >
          {children}
        </nav>
      </div>
    </div>
  );
}

export { DockButton };
