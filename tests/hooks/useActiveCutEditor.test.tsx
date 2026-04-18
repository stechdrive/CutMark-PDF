import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useActiveCutEditor } from '../../hooks/useActiveCutEditor';
import { createAppSettings, createTemplate } from '../../test/factories';

const createLegacyApi = (overrides: Partial<Parameters<typeof useActiveCutEditor>[0]['legacy']> = {}) => ({
  currentPage: 3,
  settings: createAppSettings({
    nextNumber: 5,
    branchChar: null,
    minDigits: 3,
    autoIncrement: true,
  }),
  selectedCutId: 'legacy-cut',
  historyIndex: 0,
  historyLength: 1,
  getNextLabel: vi.fn(() => '005'),
  getNextNumberingState: vi.fn(() => ({ nextNumber: 6, branchChar: null })),
  setSelectedCutId: vi.fn(),
  addCut: vi.fn(),
  updateCutPosition: vi.fn(),
  handleCutDragEnd: vi.fn(),
  deleteCut: vi.fn(),
  setNumberingStateWithHistory: vi.fn(),
  renumberFromCut: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  ...overrides,
});

const createProjectApi = (overrides: Partial<Parameters<typeof useActiveCutEditor>[0]['project']> = {}) => {
  const settings = createAppSettings({
    nextNumber: 12,
    branchChar: 'A',
    minDigits: 4,
    autoIncrement: true,
  });

  return {
    project: createProjectDocument({
      settings,
      template: createTemplate(),
      logicalPages: [{ id: 'page-1', cuts: [] }],
    }),
    settings,
    selectedLogicalPageId: 'page-1',
    selectedCutId: 'project-cut',
    canUndo: true,
    canRedo: false,
    historyIndex: 2,
    historyLength: 3,
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
  };
};

describe('useActiveCutEditor', () => {
  it('routes edit operations to the project editor when a project is loaded', () => {
    const legacy = createLegacyApi();
    const project = createProjectApi();
    const { result } = renderHook(() =>
      useActiveCutEditor({ legacy, project })
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

    expect(project.addCutToSelectedPage).toHaveBeenCalledTimes(1);
    expect(project.addCutToSelectedPage).toHaveBeenCalledWith(
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
    expect(project.selectCut).toHaveBeenCalledWith('cut-2');
    expect(project.deleteCut).toHaveBeenCalledWith('cut-2');
    expect(project.updateCutPosition).toHaveBeenCalledWith('cut-2', 0.5, 0.6);
    expect(project.commitCutDrag).toHaveBeenCalledTimes(1);
    expect(project.setNumberingState).toHaveBeenCalledWith({
      nextNumber: 15,
      branchChar: null,
    });
    expect(project.renumberFromCut).toHaveBeenCalledWith('cut-2', {
      nextNumber: 12,
      branchChar: 'A',
      minDigits: 4,
      autoIncrement: true,
    });
    expect(project.undo).toHaveBeenCalledTimes(1);
    expect(project.redo).toHaveBeenCalledTimes(1);
    expect(legacy.addCut).not.toHaveBeenCalled();
  });

  it('routes edit operations to the legacy editor when no project is loaded', () => {
    const legacy = createLegacyApi({
      historyIndex: -1,
      historyLength: 2,
    });
    const project = createProjectApi({ project: null });
    const { result } = renderHook(() =>
      useActiveCutEditor({ legacy, project })
    );

    expect(result.current.selectedCutId).toBe('legacy-cut');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.historyIndex).toBe(-1);
    expect(result.current.historyLength).toBe(2);

    act(() => {
      result.current.createCutAt(0.1, 0.2);
      result.current.selectCut('legacy-next');
      result.current.deleteCut('legacy-next');
      result.current.updateCutPosition('legacy-next', 0.7, 0.8);
      result.current.commitCutDrag();
      result.current.setNumberingState({ nextNumber: 9, branchChar: 'B' });
      result.current.renumberFromSelected('legacy-next');
      result.current.undo();
      result.current.redo();
    });

    expect(legacy.addCut).toHaveBeenCalledWith(
      expect.objectContaining({
        pageIndex: 2,
        x: 0.1,
        y: 0.2,
        label: '005',
        isBranch: false,
      }),
      {
        nextNumber: 6,
        branchChar: null,
      }
    );
    expect(legacy.setSelectedCutId).toHaveBeenCalledWith('legacy-next');
    expect(legacy.deleteCut).toHaveBeenCalledWith('legacy-next');
    expect(legacy.updateCutPosition).toHaveBeenCalledWith('legacy-next', 0.7, 0.8);
    expect(legacy.handleCutDragEnd).toHaveBeenCalledTimes(1);
    expect(legacy.setNumberingStateWithHistory).toHaveBeenCalledWith({
      nextNumber: 9,
      branchChar: 'B',
    });
    expect(legacy.renumberFromCut).toHaveBeenCalledWith(
      'legacy-next',
      {
        nextNumber: 5,
        branchChar: null,
      },
      3,
      true
    );
    expect(legacy.undo).toHaveBeenCalledTimes(1);
    expect(legacy.redo).toHaveBeenCalledTimes(1);
    expect(project.addCutToSelectedPage).not.toHaveBeenCalled();
  });
});
