import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDebugLogger } from '../../hooks/useDebugLogger';

describe('useDebugLogger', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/?debug=1');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('collects debug logs when debug mode is enabled', () => {
    const { result } = renderHook(() => useDebugLogger());

    act(() => {
      result.current.logDebug('info', 'message', () => ({ value: 42 }));
    });

    expect(result.current.debugEnabled).toBe(true);
    expect(result.current.debugLogs).toHaveLength(1);
    expect(result.current.debugLogs[0]).toMatchObject({
      level: 'info',
      message: 'message',
      data: { value: 42 },
    });
  });

  it('ignores debug logs when debug mode is disabled', () => {
    window.history.pushState({}, '', '/');
    const { result } = renderHook(() => useDebugLogger());

    act(() => {
      result.current.logDebug('warn', 'hidden');
    });

    expect(result.current.debugEnabled).toBe(false);
    expect(result.current.debugLogs).toHaveLength(0);
  });
});
