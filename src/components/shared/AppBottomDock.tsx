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
    whileTap={disabled ? undefined : { scale: 0.965 }}
    className={clsx(
      'inline-flex items-center justify-center min-h-[34px] pt-0 px-[2px] pb-0 border-none cursor-pointer overflow-hidden transition-[color,opacity,transform] duration-150 ease-out',
      wide ? 'flex-[1.4]' : 'flex-[1_1_0]',
      tone === 'primary'
        ? 'text-white bg-gradient-to-br from-[#52bec2] via-[#7ed3ac] via-[58%] to-[#cfe07e] shadow-[0_8px_18px_rgba(100,200,174,0.24)]'
        : 'bg-transparent',
      tone === 'neutral' && active
        ? 'text-[#1f9e8e] relative before:absolute before:top-0 before:inset-x-[28%] before:h-px before:rounded-b-sm before:bg-[#1f9e8e]'
        : tone === 'neutral'
          ? 'text-[#8da1b5]'
          : '',
      disabled ? 'opacity-60 cursor-not-allowed transform-none shadow-none' : tone === 'neutral' ? 'hover:text-[#6a8aaa]' : ''
    )}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
  >
    <span className="inline-flex flex-col items-center justify-center gap-[1px] min-w-0 w-full">
      <span className={clsx('inline-flex items-center justify-center transition-transform duration-150', tone === 'neutral' && active && '-translate-y-[1px]')}>
        <div className="w-[17px] h-[17px] [&_svg]:w-full [&_svg]:h-full">{icon}</div>
      </span>
      <span
        className={clsx(
          'block text-[0.5rem] tracking-[0.005em] leading-none text-ellipsis whitespace-nowrap overflow-hidden max-w-full transition-colors duration-150',
          active ? 'font-extrabold' : 'font-medium'
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
    <div className="relative w-full z-[100] pointer-events-auto shrink-0 bg-[rgba(255,255,255,0.94)] backdrop-blur-[14px] border-t border-[rgba(210,220,230,0.58)] shadow-[0_-3px_12px_rgba(100,140,160,0.03)] [padding-bottom:max(calc(env(safe-area-inset-bottom)-12px),0px)]">
      <nav className="flex items-stretch gap-0 pt-px pb-[2px] w-full mx-auto" aria-label="Ekintza nagusiak">
        {children}
      </nav>
    </div>
  );
}

export { DockButton };
