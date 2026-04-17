import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { NumberingState } from '../../types';
import { createCut } from '../../test/factories';
import { useCuts } from '../../hooks/useCuts';

const useCutsHarness = (initialNumbering: NumberingState) => {
  const [numberingState, setNumberingState] = useState(initialNumbering);
  const cutsApi = useCuts({ numberingState, setNumberingState });
  return {
    numberingState,
    ...cutsApi,
  };
};

describe('useCuts', () => {
  it('updates numbering state and supports undo/redo when a cut is added', () => {
    const { result } = renderHook(() =>
      useCutsHarness({ nextNumber: 1, branchChar: null })
    );

    act(() => {
      result.current.addCut(
        createCut({ id: 'cut-a' }),
        { nextNumber: 2, branchChar: null }
      );
    });

    expect(result.current.cuts).toHaveLength(1);
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.numberingState).toEqual({
      nextNumber: 2,
      branchChar: null,
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.cuts).toHaveLength(0);
    expect(result.current.historyIndex).toBe(-1);
    expect(result.current.numberingState).toEqual({
      nextNumber: 1,
      branchChar: null,
    });

    act(() => {
      result.current.redo();
    });

    expect(result.current.cuts.map((cut) => cut.id)).toEqual(['cut-a']);
    expect(result.current.numberingState).toEqual({
      nextNumber: 2,
      branchChar: null,
    });
  });

  it('renumbers cuts from the selected point using page and coordinate order', () => {
    const { result } = renderHook(() =>
      useCutsHarness({ nextNumber: 1, branchChar: null })
    );

    act(() => {
      result.current.addCut(createCut({
        id: 'page-1',
        pageIndex: 1,
        x: 0.1,
        y: 0.2,
        label: 'old-page-1',
      }));
    });
    act(() => {
      result.current.addCut(createCut({
        id: 'page-0-right',
        pageIndex: 0,
        x: 0.7,
        y: 0.1,
        label: 'old-page-0-right',
      }));
    });
    act(() => {
      result.current.addCut(createCut({
        id: 'page-0-left',
        pageIndex: 0,
        x: 0.2,
        y: 0.1,
        label: 'old-page-0-left',
      }));
    });

    act(() => {
      result.current.renumberFromCut(
        'page-0-right',
        { nextNumber: 7, branchChar: null },
        3,
        true
      );
    });

    const labelMap = new Map(
      result.current.cuts.map((cut) => [cut.id, cut.label])
    );

    expect(labelMap.get('page-0-left')).toBe('old-page-0-left');
    expect(labelMap.get('page-0-right')).toBe('007');
    expect(labelMap.get('page-1')).toBe('008');
    expect(result.current.numberingState).toEqual({
      nextNumber: 9,
      branchChar: null,
    });
  });

  it('keeps branch numbering on the same parent number while advancing the branch letter', () => {
    const { result } = renderHook(() =>
      useCutsHarness({ nextNumber: 12, branchChar: 'A' })
    );

    act(() => {
      result.current.addCut(createCut({ id: 'branch-a', label: 'x' }));
    });
    act(() => {
      result.current.addCut(createCut({ id: 'branch-b', y: 0.3, label: 'y' }));
    });

    act(() => {
      result.current.renumberFromCut(
        'branch-a',
        { nextNumber: 12, branchChar: 'A' },
        4,
        true
      );
    });

    const branchA = result.current.cuts.find((cut) => cut.id === 'branch-a');
    const branchB = result.current.cuts.find((cut) => cut.id === 'branch-b');

    expect(branchA).toMatchObject({
      label: '0012\nA',
      isBranch: true,
    });
    expect(branchB).toMatchObject({
      label: '0012\nB',
      isBranch: true,
    });
    expect(result.current.numberingState).toEqual({
      nextNumber: 12,
      branchChar: 'C',
    });
  });
});
