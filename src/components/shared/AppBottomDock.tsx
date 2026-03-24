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
        'relative inline-flex flex-1 flex-col items-center justify-center gap-[4px] min-h-[54px] border-none px-1 py-1.5 transition-colors duration-150 ease-out',
        active ? 'text-[var(--primary-deep)]' : 'text-[var(--muted)]',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <span
        className={clsx(
          'relative inline-flex h-[34px] w-[34px] items-center justify-center rounded-[12px] transition-[background-color,box-shadow,transform] duration-150',
          active
            ? 'bg-[linear-gradient(180deg,rgba(232,250,242,0.98),rgba(216,244,232,0.94))] shadow-[0_10px_20px_rgba(69,185,180,0.14),inset_0_1px_0_rgba(255,255,255,0.72)]'
            : 'bg-transparent'
        )}
      >
        {active ? (
          <span className="absolute inset-x-[6px] -top-[4px] h-[2.5px] rounded-full bg-[linear-gradient(90deg,#45b9b4,#c8dc75)]" aria-hidden="true" />
        ) : null}
        <span className="h-[20px] w-[20px] [&_svg]:h-full [&_svg]:w-full">{icon}</span>
      </span>
      <span className={clsx(
        'max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[0.62rem] font-bold leading-none tracking-[-0.01em] transition-colors duration-150',
        active ? 'text-[var(--primary-deep)]' : 'text-[var(--muted)]'
      )}>
        {label}
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
          : 'border-[rgba(214,222,229,0.92)] bg-[rgba(255,255,255,0.94)] text-[var(--text)] shadow-[0_8px_20px_rgba(99,117,135,0.08)]'
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
    <div className="fixed inset-x-0 bottom-0 z-[100] px-3 pointer-events-auto">
      <div
        className="mx-auto w-full max-w-[calc(var(--page-width)+8px)] rounded-t-[24px] border border-[rgba(214,222,229,0.86)] border-b-0 bg-[rgba(248,249,245,0.92)] backdrop-blur-[12px] shadow-[0_-12px_32px_rgba(99,117,135,0.1)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <nav
          className="mx-auto flex h-[66px] w-full max-w-[var(--page-width)] items-center gap-0 px-2.5"
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
        <div className="mx-auto w-full max-w-[var(--content-narrow)] rounded-[24px] border border-[rgba(214,222,229,0.9)] bg-[rgba(248,249,245,0.94)] p-3 shadow-[0_16px_38px_rgba(99,117,135,0.14),0_4px_12px_rgba(99,117,135,0.06)] backdrop-blur-[12px] pointer-events-auto">
          <div className="flex items-center gap-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export { BottomActionButton, BottomTabButton };
