import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface BottomTabButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

function BottomTabButton({
  label,
  icon,
  onClick,
  active = false,
  disabled = false,
}: BottomTabButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={clsx(
        'relative inline-flex min-h-[40px] flex-1 items-center justify-center overflow-hidden border-none px-1.5 transition-[color,opacity,transform] duration-150 ease-out',
        active ? 'text-[#237b74]' : 'text-[#8b9aaa]',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {active ? (
        <span className="absolute top-[4px] left-1/2 h-[2px] w-[14px] -translate-x-1/2 rounded-full bg-[#41b4aa]" />
      ) : null}

      <span className="relative inline-flex min-w-0 w-full flex-col items-center justify-center gap-[1px]">
        <span className="inline-flex items-center justify-center">
          <span className="h-[20px] w-[20px] [&_svg]:h-full [&_svg]:w-full">{icon}</span>
        </span>
        <span className={clsx('block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[0.64rem] leading-none tracking-[-0.01em]', active ? 'font-bold' : 'font-semibold')}>
          {label}
        </span>
      </span>
    </motion.button>
  );
}

interface BottomActionButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: 'secondary' | 'primary';
}

function BottomActionButton({
  label,
  icon,
  onClick,
  variant = 'secondary',
}: BottomActionButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full border px-4 text-[0.92rem] font-bold transition-[transform,box-shadow,border-color,color,background] duration-150 ease-out',
        variant === 'primary'
          ? 'border-[rgba(90,190,177,0.28)] bg-[linear-gradient(135deg,#45b9b4_0%,#73cbb2_52%,#c8dc75_100%)] text-white shadow-[0_12px_24px_rgba(93,186,166,0.22)]'
          : 'border-[rgba(214,222,229,0.92)] bg-[rgba(255,255,255,0.94)] text-[#314355] shadow-[0_8px_20px_rgba(99,117,135,0.08)]'
      )}
    >
      <span className="h-[18px] w-[18px] [&_svg]:h-full [&_svg]:w-full">{icon}</span>
      <span>{label}</span>
    </motion.button>
  );
}

interface BottomTabBarProps {
  children: ReactNode;
}

export function BottomTabBar({ children }: BottomTabBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] pointer-events-auto">
      <div
        className="border-t border-[rgba(214,222,229,0.86)] bg-[rgba(248,249,245,0.97)] backdrop-blur-[6px] shadow-[0_-1px_8px_rgba(99,117,135,0.04)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <nav
          className="mx-auto flex h-[52px] w-full max-w-[var(--page-width)] items-center gap-0 px-2"
          aria-label="Ekintza nagusiak"
        >
          {children}
        </nav>
      </div>
    </div>
  );
}

interface BottomActionBarProps {
  children: ReactNode;
}

export function BottomActionBar({ children }: BottomActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-4 pointer-events-none">
      <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div className="mx-auto w-full max-w-[var(--content-narrow)] rounded-[26px] border border-[rgba(214,222,229,0.92)] bg-[rgba(248,249,245,0.96)] p-3 shadow-[0_18px_44px_rgba(99,117,135,0.16),0_4px_12px_rgba(99,117,135,0.08)] backdrop-blur-[10px] pointer-events-auto">
          <div className="flex items-center gap-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export { BottomActionButton, BottomTabButton };
