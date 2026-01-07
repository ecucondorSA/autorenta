import winston from 'winston';
import { config } from './config.js';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, service }) => {
  const svc = service ? `[${service}]` : '';
  return `${timestamp} ${level} ${svc} ${message}`;
});

export const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  defaultMeta: { service: 'p2p' },
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // File output
    new winston.transports.File({
      filename: config.logFile,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
  ],
});

// Create service-specific loggers
export function createServiceLogger(serviceName: string) {
  return logger.child({ service: serviceName });
}

export default logger;
