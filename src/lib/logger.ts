// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const MODE = import.meta.env.MODE;
const ENV_LEVEL = (import.meta.env.VITE_LOG_LEVEL as string) || '';

const DEFAULT_LEVEL: LogLevel = ENV_LEVEL
  ? (ENV_LEVEL as LogLevel)
  : (MODE === 'production' ? 'warn' : 'debug');

const order: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };

function shouldLog(level: LogLevel) {
  return order[level] >= order[DEFAULT_LEVEL];
}

export const logger = {
  debug: (...args: unknown[]) => { if (shouldLog('debug')) console.debug(...args); },
  info: (...args: unknown[]) => { if (shouldLog('info')) console.info(...args); },
  warn: (...args: unknown[]) => { if (shouldLog('warn')) console.warn(...args); },
  error: (...args: unknown[]) => { if (shouldLog('error')) console.error(...args); },
};

export default logger;
