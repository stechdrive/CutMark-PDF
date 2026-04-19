import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMobileLayout } from '../../hooks/useMobileLayout';

type ViewportListener = (event: Event) => void;

const viewportSize = {
  width: 0,
  height: 0,
};

const viewportListeners = {
  resize: new Set<ViewportListener>(),
  scroll: new Set<ViewportListener>(),
};

const setVisualViewport = (width: number, height: number) => {
  viewportSize.width = width;
  viewportSize.height = height;

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      get width() {
        return viewportSize.width;
      },
      get height() {
        return viewportSize.height;
      },
      addEventListener: vi.fn((type: 'resize' | 'scroll', listener: ViewportListener) => {
        viewportListeners[type].add(listener);
      }),
      removeEventListener: vi.fn((type: 'resize' | 'scroll', listener: ViewportListener) => {
        viewportListeners[type].delete(listener);
      }),
    },
  });
};

const setScreenWidth = (width: number) => {
  Object.defineProperty(window, 'screen', {
    configurable: true,
    value: { width, height: 800 },
  });
};

const setCoarsePointer = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: coarse)' ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('useMobileLayout', () => {
  beforeEach(() => {
    viewportListeners.resize.clear();
    viewportListeners.scroll.clear();
    setVisualViewport(700, 900);
    setScreenWidth(700);
    setCoarsePointer(true);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  it('writes root data attributes and breakpoint width using the corrected screen width', () => {
    setVisualViewport(560, 900);
    setScreenWidth(390);

    const { result, unmount } = renderHook(() => useMobileLayout());

    expect(result.current.isMobileUi).toBe(true);
    expect(result.current.isMobileCompact).toBe(true);
    expect(result.current.isMobileTight).toBe(true);
    expect(result.current.breakpointWidth).toBe(390);
    expect(document.documentElement.dataset.mobileUi).toBe('true');
    expect(document.documentElement.dataset.mobileCompact).toBe('true');
    expect(document.documentElement.dataset.mobileTight).toBe('true');
    expect(document.documentElement.style.getPropertyValue('--mobile-breakpoint-width')).toBe('390px');

    unmount();

    expect(document.documentElement.dataset.mobileUi).toBe('false');
    expect(document.documentElement.style.getPropertyValue('--mobile-breakpoint-width')).toBe('');
  });

  it('recomputes mobile state when the visual viewport width changes', () => {
    const { result } = renderHook(() => useMobileLayout());

    expect(result.current.isMobileUi).toBe(true);

    act(() => {
      setVisualViewport(1100, 900);
      setScreenWidth(1100);
      viewportListeners.resize.forEach((listener) => listener(new Event('resize')));
    });

    expect(result.current.isMobileUi).toBe(false);
    expect(document.documentElement.dataset.mobileUi).toBe('false');
  });

  it('stays in desktop mode when the pointer is not coarse', () => {
    setCoarsePointer(false);

    const { result } = renderHook(() => useMobileLayout());

    expect(result.current.isMobileUi).toBe(false);
    expect(result.current.isMobileCompact).toBe(false);
    expect(result.current.isMobileTight).toBe(false);
  });

  it('persists a user mobile ui scale override per device', () => {
    const { result } = renderHook(() => useMobileLayout());

    act(() => {
      result.current.setUserUiScale(1.12);
    });

    expect(result.current.userUiScale).toBe(1.12);
    expect(result.current.uiScale).toBeCloseTo(1.12, 5);
    expect(window.localStorage.getItem('cutmark_mobile_ui_scale')).toBe('1.12');
    expect(document.documentElement.style.getPropertyValue('--ui-scale-user')).toBe('1.12');
  });

  it('loads a saved user mobile ui scale override from localStorage', () => {
    window.localStorage.setItem('cutmark_mobile_ui_scale', '1.08');

    const { result } = renderHook(() => useMobileLayout());

    expect(result.current.userUiScale).toBe(1.08);
    expect(result.current.uiScale).toBeCloseTo(1.08, 5);
  });

  it('clamps the user mobile ui scale override to the expanded bounds', () => {
    const { result } = renderHook(() => useMobileLayout());

    act(() => {
      result.current.setUserUiScale(0.4);
    });

    expect(result.current.userUiScale).toBe(0.7);

    act(() => {
      result.current.setUserUiScale(2.5);
    });

    expect(result.current.userUiScale).toBe(2);
  });
});
