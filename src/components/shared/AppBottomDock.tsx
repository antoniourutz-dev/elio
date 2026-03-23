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
        'relative inline-flex items-center justify-center min-h-[40px] px-1.5 border-none cursor-pointer overflow-hidden transition-[color,opacity,transform] duration-150 ease-out',
        wide ? 'flex-[1.35]' : 'flex-[1_1_0]',
        tone === 'primary'
          ? 'text-white'
          : active
            ? 'text-[#237b74]'
            : 'text-[#8b9aaa]',
        disabled ? 'opacity-60 cursor-not-allowed transform-none' : ''
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {active && tone === 'neutral' ? (
        <span className="absolute top-[5px] left-1/2 h-[2.5px] w-[14px] -translate-x-1/2 rounded-full bg-[#41b4aa]" />
      ) : null}

      {tone === 'primary' ? (
        <span className="absolute inset-y-[4px] inset-x-[4px] rounded-[16px] bg-[linear-gradient(135deg,#45b9b4_0%,#73cbb2_52%,#c8dc75_100%)] shadow-[0_8px_18px_rgba(93,186,166,0.2)]" />
      ) : null}

      <span className="relative inline-flex flex-col items-center justify-center gap-[1px] min-w-0 w-full">
        <span className={clsx('inline-flex items-center justify-center transition-transform duration-150', active && tone === 'neutral' && '-translate-y-[1px]')}>
          <span className="w-[20px] h-[20px] [&_svg]:w-full [&_svg]:h-full">{icon}</span>
        </span>
        <span
          className={clsx(
            'block text-[0.64rem] tracking-[-0.01em] leading-none text-ellipsis whitespace-nowrap overflow-hidden max-w-full',
            active || tone === 'primary' ? 'font-bold' : 'font-semibold'
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
    <div className="fixed inset-x-0 bottom-0 z-[100] px-3 pointer-events-none">
      <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
        <div className="mx-auto w-full max-w-[var(--page-width)] pointer-events-auto rounded-[22px] border border-[rgba(214,222,229,0.92)] bg-[rgba(250,251,247,0.94)] backdrop-blur-[10px] shadow-[0_10px_28px_rgba(99,117,135,0.12),0_2px_8px_rgba(99,117,135,0.06)]">
          <nav
            className="mx-auto flex h-[52px] w-full items-center gap-0 px-1.5"
            aria-label="Ekintza nagusiak"
          >
            {children}
          </nav>
        </div>
      </div>
    </div>
  );
}

export { DockButton };
