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
        'app-shell relative h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y [WebkitOverflowScrolling:touch]',
        isLocked
          ? 'grid overflow-hidden p-[12px_14px_16px]'
          : 'p-[16px_16px_0] md:p-[18px_18px_0]'
      )}
    >
      <div className="absolute pointer-events-none blur-[20px] opacity-45 rounded-full mix-blend-multiply top-[18px] left-[-40px] w-[220px] h-[220px] bg-[rgba(107,184,217,0.09)]" />
      <div className="absolute pointer-events-none blur-[18px] opacity-65 rounded-full mix-blend-multiply right-[-40px] bottom-[8%] w-[200px] h-[200px] bg-[rgba(218,235,128,0.12)]" />
      <div
        className={clsx(
          'main-content relative',
          isLocked
            ? ''
            : reserveBottomDock
              ? 'pb-[calc(54px+env(safe-area-inset-bottom))]'
              : 'pb-[20px] md:pb-[22px]'
        )}
      >
        {children}
      </div>
    </div>
  );
}
