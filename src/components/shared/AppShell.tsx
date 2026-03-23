import type { ReactNode } from 'react';
import clsx from 'clsx';

interface AppShellProps {
  shellRef: { current: HTMLDivElement | null };
  isLocked: boolean;
  reserveBottomDock?: boolean;
  children: ReactNode;
}

export function AppShell({ shellRef, isLocked, reserveBottomDock = false, children }: AppShellProps) {
  return (
    <div
      ref={shellRef}
      className={clsx(
        'relative h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y [WebkitOverflowScrolling:touch]',
        isLocked
          ? 'grid overflow-hidden p-[12px_14px_16px]'
          : reserveBottomDock
            ? 'p-[16px_16px_calc(20px+64px+env(safe-area-inset-bottom))] md:p-[18px_18px_calc(22px+64px+env(safe-area-inset-bottom))]'
            : 'p-[16px_16px_20px] md:p-[18px_18px_22px]'
      )}
    >
      <div className="absolute pointer-events-none blur-[20px] opacity-45 rounded-full mix-blend-multiply top-[18px] left-[-40px] w-[220px] h-[220px] bg-[rgba(107,184,217,0.09)]" />
      <div className="absolute pointer-events-none blur-[18px] opacity-65 rounded-full mix-blend-multiply right-[-40px] bottom-[8%] w-[200px] h-[200px] bg-[rgba(218,235,128,0.12)]" />
      {children}
    </div>
  );
}
