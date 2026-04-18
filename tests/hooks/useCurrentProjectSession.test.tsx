import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { NumberingState } from '../../types';
import { useCurrentProjectSession } from '../../hooks/useCurrentProjectSession';
import { createAppSettings, createTemplate } from '../../test/factories';

const useCurrentProjectSessionHarness = (
  currentPage: number,
  initialNumbering: NumberingState
) => {
  const [numberingState, setNumberingState] = useState(initialNumbering);
  return useCurrentProjectSession({
    docType: 'images',
    currentPage,
    numPages: 2,
    currentAssetHints: [
      { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
    ],
    currentProjectName: 'batch-a',
    settings: createAppSettings({
      nextNumber: numberingState.nextNumber,
      branchChar: numberingState.branchChar,
    }),
    numberingState,
    setNumberingState,
    getNextLabel: () => '005',
    getNextNumberingState: () => ({ nextNumber: 6, branchChar: null }),
    template: createTemplate(),
  });
};

describe('useCurrentProjectSession', () => {
  it('exposes the current document as a projected project session', () => {
    const { result } = renderHook(() =>
      useCurrentProjectSessionHarness(2, { nextNumber: 5, branchChar: null })
    );

    act(() => {
      result.current.projectCutEditorApi.addCutToSelectedPage(
        {
          id: 'cut-2',
          x: 0.1,
          y: 0.1,
          label: '005',
          isBranch: false,
        },
        { nextNumber: 6, branchChar: null }
      );
    });

    expect(result.current.project?.meta.name).toBe('batch-a');
    expect(result.current.project?.logicalPages).toHaveLength(2);
    expect(result.current.bindings).toEqual({
      'page-1': 0,
      'page-2': 1,
    });
    expect(result.current.previewLogicalPage?.id).toBe('page-2');
    expect(result.current.projectCutEditorApi.selectedLogicalPageId).toBe('page-2');
    expect(result.current.projectCutEditorApi.canUndo).toBe(true);
    expect(result.current.projectCutEditorApi.canRedo).toBe(false);
    expect(result.current.projectCutEditorApi.historyIndex).toBe(0);
    expect(result.current.project?.logicalPages[1].cuts[0]).toMatchObject({
      id: 'cut-2',
      label: '005',
    });
  });
});
