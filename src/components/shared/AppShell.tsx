import type { ReactNode } from 'react';
import clsx from 'clsx';

interface AppShellProps {
  shellRef: { current: HTMLDivElement | null };
  isLocked: boolean;
  bottomBarMode?: 'tabs' | 'actions' | null;
  children: ReactNode;
}

export function AppShell({ shellRef, isLocked, bottomBarMode = null, children }: AppShellProps) {
  return (
    <div
      ref={shellRef}
      className={clsx(
        'app-shell relative h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y [WebkitOverflowScrolling:touch]',
        isLocked
          ? 'grid overflow-hidden p-[12px_14px_16px]'
          : 'p-[8px_16px_0] md:p-[10px_18px_0]'
      )}
    >
      <div className="absolute pointer-events-none blur-[28px] opacity-40 rounded-full top-[18px] left-[-40px] w-[220px] h-[220px] bg-[var(--primary-soft)]" />
      <div className="absolute pointer-events-none blur-[24px] opacity-30 rounded-full right-[-40px] bottom-[8%] w-[200px] h-[200px] bg-[var(--primary-soft)]" />
      <div
        className={clsx(
          'main-content relative',
          isLocked
            ? ''
            : bottomBarMode === 'tabs'
              ? 'pb-[calc(72px+env(safe-area-inset-bottom))]'
              : bottomBarMode === 'actions'
                ? 'pb-[calc(92px+env(safe-area-inset-bottom))]'
              : 'pb-[20px] md:pb-[22px]'
        )}
      >
        {children}
      </div>
    </div>
  );
}
