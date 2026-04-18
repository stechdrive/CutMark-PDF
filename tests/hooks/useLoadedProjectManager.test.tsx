import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useLoadedProjectManager } from '../../hooks/useLoadedProjectManager';
import { UseLoadedProjectSessionResult } from '../../hooks/useLoadedProjectSession';
import { createProjectDocument } from '../../domain/project';
import { createAppSettings, createTemplate } from '../../test/factories';

const lifecycleMocks = vi.hoisted(() => ({
  useProjectLifecycle: vi.fn(),
}));

const organizerMocks = vi.hoisted(() => ({
  useLoadedProjectOrganizer: vi.fn(),
}));

vi.mock('../../hooks/useProjectLifecycle', () => ({
  useProjectLifecycle: lifecycleMocks.useProjectLifecycle,
}));

vi.mock('../../hooks/useLoadedProjectOrganizer', () => ({
  useLoadedProjectOrganizer: organizerMocks.useLoadedProjectOrganizer,
}));

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
  bindingStatuses: { 'page-1': 'matched' },
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
    canUndo: false,
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

describe('useLoadedProjectManager', () => {
  beforeEach(() => {
    lifecycleMocks.useProjectLifecycle.mockReset();
    organizerMocks.useLoadedProjectOrganizer.mockReset();
  });

  it('composes lifecycle and organizer hooks around the loaded project session', () => {
    const loadedProjectSession = createLoadedProjectSession();
    const handleApplyLoadedProject = vi.fn();
    const handleSaveProject = vi.fn();
    const loadProjectFile = vi.fn();
    const onProjectLoaded = vi.fn();
    const projectOrganizerProps = {
      projectName: 'Episode 01',
    };

    lifecycleMocks.useProjectLifecycle.mockReturnValue({
      handleApplyLoadedProject,
      handleSaveProject,
      loadProjectFile,
      onProjectLoaded,
    });
    organizerMocks.useLoadedProjectOrganizer.mockReturnValue({
      projectOrganizerProps,
    });

    const currentProject = createProjectDocument({
      settings: createAppSettings(),
      template: createTemplate(),
      name: 'Current',
      logicalPages: [],
    });
    const currentAssetHints = [{ sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 }];
    const currentProjectBindings = { 'page-1': 0 };
    const onSelectContePage = vi.fn();
    const resolveProjectDocumentForCurrentState = vi.fn((value) => value);
    const upsertTemplate = vi.fn();
    const setMode = vi.fn();
    const logDebug = vi.fn();

    const { result } = renderHook(() =>
      useLoadedProjectManager({
        loadedProjectSession,
        docType: 'images',
        numPages: 1,
        currentPage: 1,
        currentAssetHints,
        currentProject,
        currentProjectBindings,
        canApplyLoadedProject: true,
        onSelectContePage,
        resolveProjectDocumentForCurrentState,
        upsertTemplate,
        setMode,
        logDebug,
      })
    );

    expect(lifecycleMocks.useProjectLifecycle).toHaveBeenCalledWith({
      docType: 'images',
      numPages: 1,
      currentAssetHints,
      loadedProject: loadedProjectSession.project,
      projectBindings: loadedProjectSession.bindings,
      currentProject,
      currentProjectBindings,
      canApplyLoadedProject: true,
      resolveProjectDocumentForCurrentState,
      loadProjectIntoEditor: loadedProjectSession.loadProject,
      replaceEditorProject: loadedProjectSession.replaceProject,
      upsertTemplate,
      setMode,
      logDebug,
    });
    expect(organizerMocks.useLoadedProjectOrganizer).toHaveBeenCalledWith({
      loadedProjectSession,
      currentAssets: currentAssetHints,
      currentContePage: 1,
      canApplyProject: true,
      onSelectContePage,
      onApplyProject: expect.any(Function),
    });
    expect(result.current).toEqual({
      projectOrganizerProps,
      handleSaveProject,
      loadProjectFile,
      onProjectLoaded,
    });
  });

  it('disables apply again after the current organizer state has been applied', () => {
    const loadedProjectSession = createLoadedProjectSession();
    const handleApplyLoadedProject = vi.fn();

    lifecycleMocks.useProjectLifecycle.mockReturnValue({
      handleApplyLoadedProject,
      handleSaveProject: vi.fn(),
      loadProjectFile: vi.fn(),
      onProjectLoaded: vi.fn(),
    });
    organizerMocks.useLoadedProjectOrganizer.mockReturnValue({
      projectOrganizerProps: {
        projectName: 'Episode 01',
      },
    });

    renderHook(() =>
      useLoadedProjectManager({
        loadedProjectSession,
        docType: 'images',
        numPages: 1,
        currentPage: 1,
        currentAssetHints: [
          { sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 },
        ],
        currentProject: null,
        currentProjectBindings: {},
        canApplyLoadedProject: true,
        onSelectContePage: vi.fn(),
        resolveProjectDocumentForCurrentState: vi.fn((value) => value),
        upsertTemplate: vi.fn(),
        setMode: vi.fn(),
        logDebug: vi.fn(),
      })
    );

    expect(organizerMocks.useLoadedProjectOrganizer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canApplyProject: true,
        onApplyProject: expect.any(Function),
      })
    );

    const firstApply = organizerMocks.useLoadedProjectOrganizer.mock.calls.at(-1)?.[0]
      ?.onApplyProject as (() => void) | undefined;

    if (!firstApply) {
      throw new Error('Expected onApplyProject callback');
    }

    act(() => {
      firstApply();
    });

    expect(handleApplyLoadedProject).toHaveBeenCalledTimes(1);
    expect(organizerMocks.useLoadedProjectOrganizer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canApplyProject: false,
        onApplyProject: expect.any(Function),
      })
    );
  });
});
