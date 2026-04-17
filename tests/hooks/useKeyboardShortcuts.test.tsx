import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const createHandlers = () => ({
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onPageNext: vi.fn(),
  onPagePrev: vi.fn(),
  onRowSnap: vi.fn(),
});

describe('useKeyboardShortcuts', () => {
  it('handles row snap and page navigation keys', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));

    fireEvent.keyDown(window, { key: '3' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(handlers.onRowSnap).toHaveBeenCalledWith(2);
    expect(handlers.onPageNext).toHaveBeenCalledTimes(2);
    expect(handlers.onPagePrev).toHaveBeenCalledTimes(1);
  });

  it('maps undo and redo shortcuts', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });

    expect(handlers.onUndo).toHaveBeenCalledTimes(1);
    expect(handlers.onRedo).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts while form fields have focus', () => {
    const handlers = createHandlers();
    renderHook(() => useKeyboardShortcuts(handlers));

    const input = document.createElement('input');
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: '1' });
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(input, { key: 'ArrowRight' });

    expect(handlers.onRowSnap).not.toHaveBeenCalled();
    expect(handlers.onUndo).not.toHaveBeenCalled();
    expect(handlers.onPageNext).not.toHaveBeenCalled();
  });
});
