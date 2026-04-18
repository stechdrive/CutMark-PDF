import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLoadedProjectPanel } from '../../hooks/useLoadedProjectPanel';
import { UseLoadedProjectSessionResult } from '../../hooks/useLoadedProjectSession';
import { createProjectDocument } from '../../domain/project';
import { createAppSettings, createTemplate } from '../../test/factories';

const project = createProjectDocument({
  settings: createAppSettings(),
  template: createTemplate(),
  logicalPages: [
    {
      id: 'page-1',
      cuts: [],
      expectedAssetHint: { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
    },
  ],
});

const createLoadedProjectSession = (): UseLoadedProjectSessionResult => ({
  project,
  bindings: { 'page-1': 0 },
  workspaceSession: {
    project,
    bindings: { 'page-1': 0 },
    canApply: true,
    assignedCount: 1,
    selectedLogicalPage: project.logicalPages[0],
    selectedLogicalPageId: 'page-1',
    selectedLogicalPageNumber: 1,
    selectedAssetIndex: 0,
  },
  projectCutEditorApi: {
    project,
    settings: createAppSettings(),
    selectedLogicalPageId: 'page-1',
    selectedCutId: null,
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
  },
  projectDraftApi: {
    updateSettings: vi.fn(),
    updateTemplate: vi.fn(),
    beginTransaction: vi.fn(),
    commitTransaction: vi.fn(),
  },
  loadProject: vi.fn(),
  replaceProject: vi.fn(),
  assignAsset: vi.fn(),
  resetBindings: vi.fn(),
  selectLogicalPage: vi.fn(),
  selectCut: vi.fn(),
  insertPageAfter: vi.fn(),
  removePage: vi.fn(),
  movePage: vi.fn(),
  undoDraft: vi.fn(),
  redoDraft: vi.fn(),
});

describe('useLoadedProjectPanel', () => {
  it('returns panel props and routes actions to the loaded project session', () => {
    const loadedProjectSession = createLoadedProjectSession();
    const onApplyProject = vi.fn();
    const { result } = renderHook(() =>
      useLoadedProjectPanel({
        loadedProjectSession,
        comparison: {
          logicalPageCount: 1,
          currentAssetCount: 1,
          matchedPageCount: 1,
          needsReviewCount: 0,
          missingAssetCount: 0,
          extraAssetCount: 0,
          canApplyByPageCount: true,
          rows: [
            {
              logicalPageId: 'page-1',
              pageNumber: 1,
              expectedAsset: { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
              currentAsset: { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
              status: 'matched',
            },
          ],
        },
        statusMessage: '論理P1 を現在P1 に割り当てています。',
        currentAssets: [{ sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 }],
        canApplyProject: true,
        onApplyProject,
      })
    );

    expect(result.current.projectPanelProps).not.toBeNull();
    expect(result.current.projectPanelProps?.projectName).toBe(project.meta.name);
    expect(result.current.projectPanelProps?.canUndoDraft).toBe(true);
    expect(result.current.projectPanelProps?.canRedoDraft).toBe(false);

    act(() => {
      result.current.projectPanelProps?.onBindingChange('page-1', null);
      result.current.projectPanelProps?.onSelectLogicalPage('page-1');
      result.current.projectPanelProps?.onInsertLogicalPageAfter('page-1');
      result.current.projectPanelProps?.onRemoveLogicalPage('page-1');
      result.current.projectPanelProps?.onMoveLogicalPage('page-1', 1);
      result.current.projectPanelProps?.onResetBindings();
      result.current.projectPanelProps?.onUndoDraft();
      result.current.projectPanelProps?.onRedoDraft();
      result.current.projectPanelProps?.onApplyProject();
    });

    expect(loadedProjectSession.assignAsset).toHaveBeenCalledWith('page-1', null);
    expect(loadedProjectSession.selectLogicalPage).toHaveBeenCalledWith('page-1');
    expect(loadedProjectSession.insertPageAfter).toHaveBeenCalledWith('page-1');
    expect(loadedProjectSession.removePage).toHaveBeenCalledWith('page-1');
    expect(loadedProjectSession.movePage).toHaveBeenCalledWith('page-1', 1);
    expect(loadedProjectSession.resetBindings).toHaveBeenCalledTimes(1);
    expect(loadedProjectSession.undoDraft).toHaveBeenCalledTimes(1);
    expect(loadedProjectSession.redoDraft).toHaveBeenCalledTimes(1);
    expect(onApplyProject).toHaveBeenCalledTimes(1);
  });

  it('returns null when no loaded project is active', () => {
    const loadedProjectSession = createLoadedProjectSession();
    loadedProjectSession.project = null;
    loadedProjectSession.workspaceSession = {
      ...loadedProjectSession.workspaceSession,
      project: null,
      selectedLogicalPage: null,
      selectedLogicalPageId: null,
      selectedLogicalPageNumber: null,
      selectedAssetIndex: null,
    };
    loadedProjectSession.projectCutEditorApi = {
      ...loadedProjectSession.projectCutEditorApi,
      project: null,
    };

    const { result } = renderHook(() =>
      useLoadedProjectPanel({
        loadedProjectSession,
        comparison: null,
        statusMessage: null,
        currentAssets: [],
        canApplyProject: false,
        onApplyProject: vi.fn(),
      })
    );

    expect(result.current.projectPanelProps).toBeNull();
  });
});
