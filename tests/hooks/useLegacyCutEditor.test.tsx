import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { NumberingState } from '../../types';
import { useLegacyCutEditor } from '../../hooks/useLegacyCutEditor';
import { createAppSettings, createCut } from '../../test/factories';

const useLegacyCutEditorHarness = (
  currentPage: number,
  initialNumbering: NumberingState
) => {
  const [numberingState, setNumberingState] = useState(initialNumbering);
  return useLegacyCutEditor({
    currentPage,
    settings: createAppSettings({
      nextNumber: numberingState.nextNumber,
      branchChar: numberingState.branchChar,
    }),
    numberingState,
    setNumberingState,
    getNextLabel: () => '005',
    getNextNumberingState: () => ({ nextNumber: 6, branchChar: null }),
  });
};

describe('useLegacyCutEditor', () => {
  it('exposes a legacy cut editor API backed by useCuts state', () => {
    const { result } = renderHook(() =>
      useLegacyCutEditorHarness(2, { nextNumber: 5, branchChar: null })
    );

    expect(result.current.cutEditorApi.currentPage).toBe(2);
    expect(result.current.cutEditorApi.historyIndex).toBe(-1);
    expect(result.current.cutEditorApi.historyLength).toBe(0);

    act(() => {
      result.current.addCut(
        createCut({ id: 'cut-a', pageIndex: 1, label: '005' }),
        { nextNumber: 6, branchChar: null }
      );
      result.current.cutEditorApi.setSelectedCutId('cut-a');
    });

    expect(result.current.cutEditorApi.selectedCutId).toBe('cut-a');
    expect(result.current.cutEditorApi.historyIndex).toBe(0);
    expect(result.current.cutEditorApi.historyLength).toBe(1);
  });
});
