import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLoadedProjectOrganizer } from '../../hooks/useLoadedProjectOrganizer';
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
    {
      id: 'page-2',
      cuts: [],
      expectedAssetHint: { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
    },
  ],
});

const createLoadedProjectSession = (): UseLoadedProjectSessionResult => ({
  project,
  bindings: { 'page-1': 0, 'page-2': null },
  bindingStatuses: { 'page-1': 'matched', 'page-2': 'unbound' },
  workspaceSession: {
    project,
    bindings: { 'page-1': 0, 'page-2': null },
    canApply: false,
    assignedCount: 1,
    selectedLogicalPage: project.logicalPages[1],
    selectedLogicalPageId: 'page-2',
    selectedLogicalPageNumber: 2,
    selectedAssetIndex: null,
  },
  projectCutEditorApi: {
    project,
    settings: createAppSettings(),
    selectedLogicalPageId: 'page-2',
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
  insertBlankPageAtAsset: vi.fn(),
  removePageFromConte: vi.fn(),
  movePageToAsset: vi.fn(),
  undoDraft: vi.fn(),
  redoDraft: vi.fn(),
});

describe('useLoadedProjectOrganizer', () => {
  it('returns organizer props and routes organizer actions to the loaded session', () => {
    const loadedProjectSession = createLoadedProjectSession();
    const onApplyProject = vi.fn();
    const onSelectContePage = vi.fn();

    const { result } = renderHook(() =>
      useLoadedProjectOrganizer({
        loadedProjectSession,
        currentAssets: [
          { sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image' as const, sourceLabel: '009_revised.png', pageNumber: 2 },
        ],
        currentContePage: 2,
        canApplyProject: false,
        onSelectContePage,
        onApplyProject,
      })
    );

    expect(result.current.projectOrganizerProps).not.toBeNull();
    expect(result.current.projectOrganizerProps?.projectName).toBe(project.meta.name);
    expect(result.current.projectOrganizerProps?.currentContePage).toBe(2);
    expect(result.current.projectOrganizerProps?.organizer.unplacedPages).toHaveLength(1);

    act(() => {
      result.current.projectOrganizerProps?.onSelectLogicalPage('page-2');
      result.current.projectOrganizerProps?.onSelectContePage(1, 'page-2');
      result.current.projectOrganizerProps?.onInsertBlankPageAtAsset(1);
      result.current.projectOrganizerProps?.onRemoveLogicalPageFromConte('page-1');
      result.current.projectOrganizerProps?.onUnassignLogicalPage('page-2');
      result.current.projectOrganizerProps?.onMoveLogicalPageToAsset('page-2', 0);
      result.current.projectOrganizerProps?.onResetBindings();
      result.current.projectOrganizerProps?.onApplyProject();
    });

    expect(loadedProjectSession.selectLogicalPage).toHaveBeenCalledWith('page-2');
    expect(onSelectContePage).toHaveBeenCalledWith(1, 'page-2');
    expect(loadedProjectSession.insertBlankPageAtAsset).toHaveBeenCalledWith(1);
    expect(loadedProjectSession.removePageFromConte).toHaveBeenCalledWith('page-1');
    expect(loadedProjectSession.assignAsset).toHaveBeenCalledWith('page-2', null);
    expect(loadedProjectSession.movePageToAsset).toHaveBeenCalledWith('page-2', 0);
    expect(loadedProjectSession.resetBindings).toHaveBeenCalledTimes(1);
    expect(onApplyProject).toHaveBeenCalledTimes(1);
  });

  it('returns null while no loaded project is active', () => {
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

    const { result } = renderHook(() =>
      useLoadedProjectOrganizer({
        loadedProjectSession,
        currentAssets: [],
        currentContePage: null,
        canApplyProject: false,
        onSelectContePage: vi.fn(),
        onApplyProject: vi.fn(),
      })
    );

    expect(result.current.projectOrganizerProps).toBeNull();
  });
});
