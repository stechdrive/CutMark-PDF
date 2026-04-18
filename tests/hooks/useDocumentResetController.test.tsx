import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDocumentResetController } from '../../hooks/useDocumentResetController';

describe('useDocumentResetController', () => {
  it('forwards reset calls to the latest handler', () => {
    const firstReset = vi.fn();
    const secondReset = vi.fn();

    const { result } = renderHook(() => useDocumentResetController());

    act(() => {
      result.current.setResetHandler(firstReset);
      result.current.handleDocumentReset();
    });
    expect(firstReset).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setResetHandler(secondReset);
      result.current.handleDocumentReset();
    });
    expect(secondReset).toHaveBeenCalledTimes(1);
  });
});
