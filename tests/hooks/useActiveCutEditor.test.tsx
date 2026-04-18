import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useActiveCutEditor } from '../../hooks/useActiveCutEditor';
import { LogicalCutEditorApi } from '../../hooks/logicalCutEditorApi';
import { createAppSettings, createTemplate } from '../../test/factories';

const createEditorApi = (
  overrides: Partial<LogicalCutEditorApi> = {}
): LogicalCutEditorApi => ({
  project: createProjectDocument({
    settings: createAppSettings({
      nextNumber: 5,
      branchChar: null,
      minDigits: 3,
      autoIncrement: true,
    }),
    template: createTemplate(),
    logicalPages: [{ id: 'page-3', cuts: [] }],
  }),
  settings: createAppSettings({
    nextNumber: 5,
    branchChar: null,
    minDigits: 3,
    autoIncrement: true,
  }),
  selectedLogicalPageId: 'page-3',
  selectedCutId: 'cut-1',
  canUndo: true,
  canRedo: false,
  historyIndex: 0,
  historyLength: 1,
  addCutToSelectedPage: vi.fn(),
  selectCut: vi.fn(),
  updateCutPosition: vi.fn(),
  commitCutDrag: vi.fn(),
  deleteCut: vi.fn(),
  setNumberingState: vi.fn(),
  renumberFromCut: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  ...overrides,
});

describe('useActiveCutEditor', () => {
  it('routes edit operations through the normalized logical cut editor contract', () => {
    const editor = createEditorApi({
      settings: createAppSettings({
        nextNumber: 12,
        branchChar: 'A',
        minDigits: 4,
        autoIncrement: true,
      }),
      selectedLogicalPageId: 'page-1',
      selectedCutId: 'project-cut',
      historyIndex: 2,
      historyLength: 3,
    });
    const { result } = renderHook(() =>
      useActiveCutEditor({ editor })
    );

    expect(result.current.selectedCutId).toBe('project-cut');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyIndex).toBe(2);
    expect(result.current.historyLength).toBe(3);

    act(() => {
      result.current.createCutAt(0.3, 0.4);
      result.current.selectCut('cut-2');
      result.current.deleteCut('cut-2');
      result.current.updateCutPosition('cut-2', 0.5, 0.6);
      result.current.commitCutDrag();
      result.current.setNumberingState({ nextNumber: 15, branchChar: null });
      result.current.renumberFromSelected('cut-2');
      result.current.undo();
      result.current.redo();
    });

    expect(editor.addCutToSelectedPage).toHaveBeenCalledTimes(1);
    expect(editor.addCutToSelectedPage).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0.3,
        y: 0.4,
        label: '0012\nA',
        isBranch: true,
      }),
      {
        nextNumber: 12,
        branchChar: 'B',
      }
    );
    expect(editor.selectCut).toHaveBeenCalledWith('cut-2');
    expect(editor.deleteCut).toHaveBeenCalledWith('cut-2');
    expect(editor.updateCutPosition).toHaveBeenCalledWith('cut-2', 0.5, 0.6);
    expect(editor.commitCutDrag).toHaveBeenCalledTimes(1);
    expect(editor.setNumberingState).toHaveBeenCalledWith({
      nextNumber: 15,
      branchChar: null,
    });
    expect(editor.renumberFromCut).toHaveBeenCalledWith('cut-2', {
      nextNumber: 12,
      branchChar: 'A',
      minDigits: 4,
      autoIncrement: true,
    });
    expect(editor.undo).toHaveBeenCalledTimes(1);
    expect(editor.redo).toHaveBeenCalledTimes(1);
  });

  it('does not create a cut without an active logical page', () => {
    const editor = createEditorApi({
      project: null,
      selectedLogicalPageId: null,
      canUndo: false,
      canRedo: true,
      historyIndex: -1,
      historyLength: 2,
    });
    const { result } = renderHook(() =>
      useActiveCutEditor({ editor })
    );

    expect(result.current.selectedCutId).toBe('cut-1');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.historyIndex).toBe(-1);
    expect(result.current.historyLength).toBe(2);

    act(() => {
      result.current.createCutAt(0.1, 0.2);
    });

    expect(editor.addCutToSelectedPage).not.toHaveBeenCalled();
  });
});
