import { SystemLog } from '../models/SystemLog';

interface LoggerOptions {
  user?: string;
  role?: string;
}

type LogLevel = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';

const writeLog = async (level: LogLevel, message: string, options?: LoggerOptions) => {
  const user = options?.user || 'system';
  const role = options?.role || '';
  // Write to DB (don't block on error)
  SystemLog.create({
    timestamp: new Date(),
    level,
    user,
    role,
    message,
  }).catch(() => {});
  // Also log to console
  const time = new Date().toISOString();
  console.log(`[${time}] [${level}] [${user}] ${message}`);
};

export const logger = {
  info: (message: string, options?: LoggerOptions) => writeLog('INFO', message, options),
  error: (message: string, options?: LoggerOptions) => writeLog('ERROR', message, options),
  warn: (message: string, options?: LoggerOptions) => writeLog('WARN', message, options),
  debug: (message: string, options?: LoggerOptions) => writeLog('DEBUG', message, options),
}; 