import type { ReactNode } from 'react';
import clsx from 'clsx';

interface AppShellProps {
  shellRef: { current: HTMLDivElement | null };
  isLocked: boolean;
  children: ReactNode;
}

export function AppShell({ shellRef, isLocked, children }: AppShellProps) {
  return (
    <div
      ref={shellRef}
      className={clsx(
        'relative min-h-0 overflow-x-hidden overflow-y-auto [WebkitOverflowScrolling:touch]',
        isLocked ? 'grid overflow-hidden p-[12px_14px_16px]' : 'p-[16px_16px_20px] md:p-[18px_18px_22px]'
      )}
    >
      <div className="absolute pointer-events-none blur-[18px] opacity-75 rounded-full mix-blend-multiply top-[-70px] left-[-50px] w-[240px] h-[240px] bg-[rgba(107,184,217,0.12)]" />
      <div className="absolute pointer-events-none blur-[18px] opacity-75 rounded-full mix-blend-multiply right-[-40px] bottom-[8%] w-[200px] h-[200px] bg-[rgba(218,235,128,0.14)]" />
      {children}
    </div>
  );
}
