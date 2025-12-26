/**
 * Production-safe logging utility
 * Logs errors and warnings always, other levels only in development
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error('[ERROR]', new Date().toISOString(), ...args);
  },
  warn: (...args: unknown[]) => {
    // Always log warnings in production for debugging
    console.warn('[WARN]', new Date().toISOString(), ...args);
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

