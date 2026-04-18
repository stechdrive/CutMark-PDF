import { useCallback, useEffect, useMemo, useState } from 'react';
import { normalizeError } from '../utils/debugData';

export type DebugLog = {
  at: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
};

type DebugLogData = unknown | (() => unknown);

const MAX_DEBUG_LOGS = 200;

export const useDebugLogger = () => {
  const debugEnabled = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  }, []);

  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);

  const logDebug = useCallback((level: DebugLog['level'], message: string, data?: DebugLogData) => {
    if (!debugEnabled) return;
    const payload = typeof data === 'function' ? data() : data;
    setDebugLogs((prev) => {
      const next = [
        ...prev,
        {
          at: new Date().toISOString(),
          level,
          message,
          data: payload,
        },
      ];

      if (next.length > MAX_DEBUG_LOGS) {
        return next.slice(next.length - MAX_DEBUG_LOGS);
      }
      return next;
    });
  }, [debugEnabled]);

  useEffect(() => {
    if (!debugEnabled) return;

    const handleError = (event: ErrorEvent) => {
      logDebug('error', 'window.error', () => ({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: normalizeError(event.error),
      }));
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      logDebug('error', 'unhandledrejection', () => ({
        reason: normalizeError(event.reason),
      }));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [debugEnabled, logDebug]);

  return {
    debugEnabled,
    debugLogs,
    logDebug,
  };
};
