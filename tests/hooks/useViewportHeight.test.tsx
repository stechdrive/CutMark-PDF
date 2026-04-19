import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useViewportHeight } from '../../hooks/useViewportHeight';

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

describe('useViewportHeight', () => {
  beforeEach(() => {
    viewportListeners.resize.clear();
    viewportListeners.scroll.clear();
    setVisualViewport(430, 780);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  it('stores the visual viewport height in the root CSS variable', () => {
    renderHook(() => useViewportHeight());

    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('780px');
  });

  it('updates the height variable when the viewport height changes', () => {
    renderHook(() => useViewportHeight());

    act(() => {
      setVisualViewport(430, 640);
      viewportListeners.resize.forEach((listener) => listener(new Event('resize')));
    });

    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('640px');
  });
});
