import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react';
import { isDevRuntime } from './runtime';
import { logInfo, logWarn } from './logger';

const DEFAULT_RENDER_WARN_MS = 14;
const DEFAULT_QUERY_INFO_MS = 250;
const DEFAULT_QUERY_WARN_MS = 700;

interface PerformanceBoundaryProps {
  id: string;
  children: ReactNode;
  thresholdMs?: number;
}

export function PerformanceBoundary({
  id,
  children,
  thresholdMs = DEFAULT_RENDER_WARN_MS,
}: PerformanceBoundaryProps) {
  if (!isDevRuntime()) {
    return <>{children}</>;
  }

  const handleRender: ProfilerOnRenderCallback = (
    profilerId,
    phase,
    actualDuration,
    baseDuration,
  ) => {
    if (actualDuration < thresholdMs) {
      return;
    }

    const details = {
      phase,
      actualDurationMs: Number(actualDuration.toFixed(2)),
      baseDurationMs: Number(baseDuration.toFixed(2)),
    };

    if (actualDuration >= thresholdMs * 2) {
      logWarn('perf', `Slow render in ${profilerId}`, details);
      return;
    }

    logInfo('perf', `Measured render in ${profilerId}`, details);
  };

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
}

export async function measureAsyncOperation<T>(
  scope: string,
  name: string,
  work: () => Promise<T>,
  options?: {
    infoAtMs?: number;
    warnAtMs?: number;
    details?: Record<string, unknown>;
  }
): Promise<T> {
  const start = performance.now();

  try {
    const result = await work();
    if (isDevRuntime()) {
      const elapsedMs = performance.now() - start;
      const infoAtMs = options?.infoAtMs ?? DEFAULT_QUERY_INFO_MS;
      const warnAtMs = options?.warnAtMs ?? DEFAULT_QUERY_WARN_MS;

      if (elapsedMs >= warnAtMs) {
        logWarn(scope, `Slow operation: ${name}`, {
          elapsedMs: Number(elapsedMs.toFixed(2)),
          ...(options?.details ?? {}),
        });
      } else if (elapsedMs >= infoAtMs) {
        logInfo(scope, `Measured operation: ${name}`, {
          elapsedMs: Number(elapsedMs.toFixed(2)),
          ...(options?.details ?? {}),
        });
      }
    }

    return result;
  } catch (error) {
    if (isDevRuntime()) {
      const elapsedMs = performance.now() - start;
      logWarn(scope, `Failed operation: ${name}`, {
        elapsedMs: Number(elapsedMs.toFixed(2)),
        ...(options?.details ?? {}),
        error,
      });
    }

    throw error;
  }
}
