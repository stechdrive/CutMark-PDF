import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useEditorWorkspaceControls } from '../../hooks/useEditorWorkspaceControls';
import { createAppSettings, createTemplate } from '../../test/factories';

const managerMocks = vi.hoisted(() => ({
  useLoadedProjectManager: vi.fn(),
}));

const cutEditorMocks = vi.hoisted(() => ({
  useActiveCutEditor: vi.fn(),
}));

vi.mock('../../hooks/useLoadedProjectManager', () => ({
  useLoadedProjectManager: managerMocks.useLoadedProjectManager,
}));

vi.mock('../../hooks/useActiveCutEditor', () => ({
  useActiveCutEditor: cutEditorMocks.useActiveCutEditor,
}));

describe('useEditorWorkspaceControls', () => {
  beforeEach(() => {
    managerMocks.useLoadedProjectManager.mockReset();
    cutEditorMocks.useActiveCutEditor.mockReset();
  });

  it('composes loaded project manager and active cut editor', () => {
    const settings = createAppSettings();
    const template = createTemplate();
    const currentProject = createProjectDocument({
      settings,
      template,
      name: 'Current',
      logicalPages: [],
    });
    const sessions = {
      currentProjectSession: {
        project: currentProject,
        projectCutEditorApi: { id: 'current-editor' },
      },
      loadedProjectSession: {
        projectCutEditorApi: { id: 'loaded-editor' },
      },
      loadedProject: currentProject,
      isLoadedProjectActive: true,
    };
    const workspaceState = {
      workspace: {
        activeProjectBindings: { 'page-1': 0 },
        canApplyLoadedProject: true,
        focusContePage: vi.fn(),
        resolveProjectDocumentForCurrentState: vi.fn((project) => project),
      },
    };
    const templateApi = {
      templates: [template],
      template,
      setTemplate: vi.fn(),
      changeTemplate: vi.fn(),
      saveTemplateByName: vi.fn(),
      saveTemplateDraftByName: vi.fn(() => template),
      deleteTemplate: vi.fn(),
      deleteTemplateById: vi.fn(() => template),
      distributeRows: vi.fn(),
      upsertTemplate: vi.fn(),
    };
    const loadedProjectManager = {
      projectOrganizerProps: null,
      loadProjectFile: vi.fn(),
      handleSaveProject: vi.fn(),
      onProjectLoaded: vi.fn(),
    };
    const activeCutEditor = {
      selectedCutId: null,
      canUndo: true,
      canRedo: false,
      historyIndex: 0,
      historyLength: 1,
      createCutAt: vi.fn(),
      selectCut: vi.fn(),
      deleteCut: vi.fn(),
      updateCutPosition: vi.fn(),
      commitCutDrag: vi.fn(),
      setNumberingState: vi.fn(),
      renumberFromSelected: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
    };

    managerMocks.useLoadedProjectManager.mockReturnValue(loadedProjectManager);
    cutEditorMocks.useActiveCutEditor.mockReturnValue(activeCutEditor);

    const { result } = renderHook(() =>
      useEditorWorkspaceControls({
        sessions: sessions as never,
        workspaceState: workspaceState as never,
        docType: 'images',
        currentPage: 1,
        numPages: 1,
        currentAssetHints: [{ sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 }],
        templateApi,
        setMode: vi.fn(),
        logDebug: vi.fn(),
      })
    );

    expect(managerMocks.useLoadedProjectManager).toHaveBeenCalledWith(
      expect.objectContaining({
        loadedProjectSession: sessions.loadedProjectSession,
        currentProject,
        currentProjectBindings: workspaceState.workspace.activeProjectBindings,
        canApplyLoadedProject: true,
        currentPage: 1,
        onSelectContePage: workspaceState.workspace.focusContePage,
        resolveProjectDocumentForCurrentState: workspaceState.workspace.resolveProjectDocumentForCurrentState,
        upsertTemplate: templateApi.upsertTemplate,
      })
    );
    expect(cutEditorMocks.useActiveCutEditor).toHaveBeenCalledWith({
      editor: sessions.loadedProjectSession.projectCutEditorApi,
    });
    expect(result.current.loadedProjectManager).toBe(loadedProjectManager);
    expect(result.current.activeCutEditor).toBe(activeCutEditor);
  });
});
