type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, scope: string, message: string, details?: unknown) {
  const prefix = `[Elio:${scope}] ${message}`;

  if (details !== undefined) {
    console[level](prefix, details);
    return;
  }

  console[level](prefix);
}

export function logWarn(scope: string, message: string, details?: unknown) {
  if (!import.meta.env.DEV) return;
  write('warn', scope, message, details);
}

export function logInfo(scope: string, message: string, details?: unknown) {
  if (!import.meta.env.DEV) return;
  write('info', scope, message, details);
}

export function logError(scope: string, message: string, details?: unknown) {
  write('error', scope, message, details);
}
