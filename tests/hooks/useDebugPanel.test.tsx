import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebugPanel } from '../../hooks/useDebugPanel';
import { createAppSettings, createTemplate } from '../../test/factories';

const createOptions = () => ({
  debugEnabled: true,
  debugLogs: [],
  logDebug: vi.fn(),
  docType: 'images' as const,
  mode: 'edit' as const,
  isExporting: false,
  currentPage: 1,
  numPages: 2,
  scale: 1,
  activeProjectCutCount: 3,
  previewCutCount: 1,
  selectedCutId: 'cut-1',
  pdfFile: null,
  imageFiles: [new File(['img'], '001.png', { type: 'image/png' })],
  effectiveSettings: createAppSettings(),
  effectiveTemplate: createTemplate(),
  isLoadedProjectActive: true,
  canUndoHistory: true,
  canRedoHistory: false,
  activeHistoryIndex: 1,
  activeHistoryLength: 3,
  selectedLogicalPageId: 'page-1',
  pdfjsVersion: '5.4.296',
  pdfWorkerSrc: '/pdf.worker.min.mjs',
});

describe('useDebugPanel', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/?debug=1');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
  });

  it('renders the supplied debug logs into the report', () => {
    const { result } = renderHook(() =>
      useDebugPanel({
        ...createOptions(),
        debugLogs: [
          {
            at: '2026-04-18T00:00:00.000Z',
            level: 'info',
            message: 'debug-message',
            data: { value: 42 },
          },
        ],
      })
    );

    act(() => {
      result.current.openDebug();
    });

    expect(result.current.debugEnabled).toBe(true);
    expect(result.current.debugOpen).toBe(true);
    expect(result.current.debugReport).toContain('debug-message');
    expect(result.current.debugReport).toContain('"value": 42');
    expect(result.current.debugReport).toContain('selectedLogicalPageId');
  });

  it('falls back to execCommand when clipboard write fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('blocked'));
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    });

    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    const logDebug = vi.fn();
    const { result } = renderHook(() =>
      useDebugPanel({
        ...createOptions(),
        logDebug,
      })
    );
    const textarea = document.createElement('textarea');
    const focus = vi.fn();
    const select = vi.fn();
    Object.defineProperty(textarea, 'focus', { configurable: true, value: focus });
    Object.defineProperty(textarea, 'select', { configurable: true, value: select });

    act(() => {
      result.current.debugTextRef.current = textarea;
    });

    await act(async () => {
      await result.current.handleCopyDebugReport();
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(result.current.debugCopyStatus).toBe('copied');
    expect(logDebug).not.toHaveBeenCalled();
  });
});
