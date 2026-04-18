import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useEditorWorkspace } from '../../hooks/useEditorWorkspace';
import { createAppSettings, createTemplate } from '../../test/factories';

const currentSessionMocks = vi.hoisted(() => ({
  useEditorSessions: vi.fn(),
}));

const presentationMocks = vi.hoisted(() => ({
  useWorkspacePresentation: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  useProjectWorkspace: vi.fn(),
}));

const managerMocks = vi.hoisted(() => ({
  useLoadedProjectManager: vi.fn(),
}));

const cutEditorMocks = vi.hoisted(() => ({
  useActiveCutEditor: vi.fn(),
}));

vi.mock('../../hooks/useEditorSessions', () => ({
  useEditorSessions: currentSessionMocks.useEditorSessions,
}));

vi.mock('../../hooks/useWorkspacePresentation', () => ({
  useWorkspacePresentation: presentationMocks.useWorkspacePresentation,
}));

vi.mock('../../hooks/useProjectWorkspace', () => ({
  useProjectWorkspace: workspaceMocks.useProjectWorkspace,
}));

vi.mock('../../hooks/useLoadedProjectManager', () => ({
  useLoadedProjectManager: managerMocks.useLoadedProjectManager,
}));

vi.mock('../../hooks/useActiveCutEditor', () => ({
  useActiveCutEditor: cutEditorMocks.useActiveCutEditor,
}));

const currentProject = createProjectDocument({
  settings: createAppSettings(),
  template: createTemplate(),
  name: 'Current',
  logicalPages: [],
});

const loadedProject = createProjectDocument({
  settings: createAppSettings({ nextNumber: 10 }),
  template: createTemplate({ id: 'loaded-template' }),
  name: 'Loaded',
  logicalPages: [
    {
      id: 'page-1',
      cuts: [],
      expectedAssetHint: { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
    },
  ],
});

const createOptions = () => {
  const settings = createAppSettings();
  const template = createTemplate();

  return {
    docType: 'images' as const,
    currentPage: 1,
    setCurrentPage: vi.fn(),
    numPages: 1,
    currentAssetHints: [{ sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 }],
    currentProjectName: 'current-folder',
    settings,
    setSettings: vi.fn(),
    numberingState: {
      nextNumber: settings.nextNumber,
      branchChar: settings.branchChar,
    },
    setNumberingState: vi.fn(),
    templateApi: {
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
    },
    setMode: vi.fn(),
    logDebug: vi.fn(),
  };
};

describe('useEditorWorkspace', () => {
  beforeEach(() => {
    currentSessionMocks.useEditorSessions.mockReset();
    presentationMocks.useWorkspacePresentation.mockReset();
    workspaceMocks.useProjectWorkspace.mockReset();
    managerMocks.useLoadedProjectManager.mockReset();
    cutEditorMocks.useActiveCutEditor.mockReset();
  });

  it('composes current and loaded sessions into one workspace contract', () => {
    const options = createOptions();
    const currentProjectSession = {
      project: currentProject,
      resetCuts: vi.fn(),
      setNumberingStateWithHistory: vi.fn(),
      workspaceSession: {
        project: currentProject,
        bindings: {},
        selectedLogicalPage: null,
        selectedLogicalPageId: null,
        selectedLogicalPageNumber: null,
        selectedAssetIndex: null,
      },
      projectCutEditorApi: { id: 'current-editor' },
    };
    const loadedProjectSession = {
      project: loadedProject,
      bindings: { 'page-1': 0 },
      workspaceSession: {
        project: loadedProject,
        bindings: { 'page-1': 0 },
        canApply: true,
        assignedCount: 1,
        selectedLogicalPage: loadedProject.logicalPages[0],
        selectedLogicalPageId: 'page-1',
        selectedLogicalPageNumber: 1,
        selectedAssetIndex: 0,
      },
      projectDraftApi: {
        updateSettings: vi.fn(),
        updateTemplate: vi.fn(),
        beginTransaction: vi.fn(),
        commitTransaction: vi.fn(),
      },
      projectCutEditorApi: { id: 'loaded-editor' },
    };
    const presentation = {
      effectiveSettings: createAppSettings({ nextNumber: 10 }),
      effectiveTemplate: createTemplate({ id: 'effective-template' }),
      setEffectiveSettings: vi.fn(),
      setEffectiveSettingsLive: vi.fn(),
      setEffectiveTemplate: vi.fn(),
      setEffectiveTemplateLive: vi.fn(),
      handleTemplateChange: vi.fn(),
      handleSaveTemplate: vi.fn(),
      handleDeleteTemplate: vi.fn(),
      handleDistributeRows: vi.fn(),
      handleProjectDraftInteractionStart: vi.fn(),
      handleProjectDraftInteractionEnd: vi.fn(),
    };
    const workspace = {
      projectComparison: { logicalPageCount: 1 },
      projectStatusMessage: 'status',
      canApplyLoadedProject: true,
      resolveProjectDocumentForCurrentState: vi.fn((project) => project),
      activeProject: loadedProject,
      activeProjectBindings: { 'page-1': 0 },
      previewCuts: [],
      effectiveExportCuts: [],
      effectiveExportSettings: createAppSettings({ nextNumber: 10 }),
    };
    const loadedProjectManager = {
      projectPanelProps: null,
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

    currentSessionMocks.useEditorSessions.mockReturnValue({
      currentProjectSession,
      loadedProjectSession,
      loadedProject,
      isLoadedProjectActive: true,
    });
    presentationMocks.useWorkspacePresentation.mockReturnValue(presentation);
    workspaceMocks.useProjectWorkspace.mockReturnValue(workspace);
    managerMocks.useLoadedProjectManager.mockReturnValue(loadedProjectManager);
    cutEditorMocks.useActiveCutEditor.mockReturnValue(activeCutEditor);

    const { result } = renderHook(() => useEditorWorkspace(options));

    expect(currentSessionMocks.useEditorSessions).toHaveBeenCalledWith({
      docType: 'images',
      currentPage: 1,
      numPages: 1,
      currentAssetHints: options.currentAssetHints,
      currentProjectName: 'current-folder',
      settings: options.settings,
      numberingState: options.numberingState,
      setNumberingState: options.setNumberingState,
      template: options.templateApi.template,
    });
    expect(presentationMocks.useWorkspacePresentation).toHaveBeenCalledWith({
      loadedProject,
      settings: options.settings,
      setSettings: options.setSettings,
      setCurrentNumberingStateWithHistory: currentProjectSession.setNumberingStateWithHistory,
      templateApi: {
        templates: options.templateApi.templates,
        template: options.templateApi.template,
        setTemplate: options.templateApi.setTemplate,
        changeTemplate: options.templateApi.changeTemplate,
        saveTemplateByName: options.templateApi.saveTemplateByName,
        saveTemplateDraftByName: options.templateApi.saveTemplateDraftByName,
        deleteTemplate: options.templateApi.deleteTemplate,
        deleteTemplateById: options.templateApi.deleteTemplateById,
        distributeRows: options.templateApi.distributeRows,
      },
      projectDraftApi: loadedProjectSession.projectDraftApi,
    });
    expect(workspaceMocks.useProjectWorkspace).toHaveBeenCalledWith({
      docType: 'images',
      currentPage: 1,
      setCurrentPage: options.setCurrentPage,
      currentAssetHints: options.currentAssetHints,
      effectiveSettings: presentation.effectiveSettings,
      effectiveTemplate: presentation.effectiveTemplate,
      fallbackSettings: options.settings,
      loadedSession: loadedProjectSession.workspaceSession,
      currentSession: currentProjectSession.workspaceSession,
    });
    expect(managerMocks.useLoadedProjectManager).toHaveBeenCalledWith({
      loadedProjectSession,
      docType: 'images',
      numPages: 1,
      currentAssetHints: options.currentAssetHints,
      currentProject,
      currentProjectBindings: workspace.activeProjectBindings,
      comparison: workspace.projectComparison,
      statusMessage: workspace.projectStatusMessage,
      canApplyLoadedProject: true,
      resolveProjectDocumentForCurrentState: workspace.resolveProjectDocumentForCurrentState,
      upsertTemplate: options.templateApi.upsertTemplate,
      setMode: options.setMode,
      logDebug: options.logDebug,
    });
    expect(cutEditorMocks.useActiveCutEditor).toHaveBeenCalledWith({
      editor: loadedProjectSession.projectCutEditorApi,
    });
    expect(result.current.isLoadedProjectActive).toBe(true);
    expect(result.current.resetCurrentProject).toBe(currentProjectSession.resetCuts);
    expect(result.current.selectedLogicalPageId).toBe('page-1');
    expect(result.current.loadedProjectManager).toBe(loadedProjectManager);
    expect(result.current.activeCutEditor).toBe(activeCutEditor);
  });

  it('falls back to the current project editor when no loaded project is active', () => {
    const options = createOptions();
    const currentProjectSession = {
      project: currentProject,
      resetCuts: vi.fn(),
      setNumberingStateWithHistory: vi.fn(),
      workspaceSession: {
        project: currentProject,
        bindings: {},
        selectedLogicalPage: null,
        selectedLogicalPageId: null,
        selectedLogicalPageNumber: null,
        selectedAssetIndex: null,
      },
      projectCutEditorApi: { id: 'current-editor' },
    };
    const loadedProjectSession = {
      project: null,
      bindings: {},
      workspaceSession: {
        project: null,
        bindings: {},
        canApply: false,
        assignedCount: 0,
        selectedLogicalPage: null,
        selectedLogicalPageId: null,
        selectedLogicalPageNumber: null,
        selectedAssetIndex: null,
      },
      projectDraftApi: {
        updateSettings: vi.fn(),
        updateTemplate: vi.fn(),
        beginTransaction: vi.fn(),
        commitTransaction: vi.fn(),
      },
      projectCutEditorApi: { id: 'loaded-editor' },
    };
    const presentation = {
      effectiveSettings: options.settings,
      effectiveTemplate: options.templateApi.template,
      setEffectiveSettings: vi.fn(),
      setEffectiveSettingsLive: vi.fn(),
      setEffectiveTemplate: vi.fn(),
      setEffectiveTemplateLive: vi.fn(),
      handleTemplateChange: vi.fn(),
      handleSaveTemplate: vi.fn(),
      handleDeleteTemplate: vi.fn(),
      handleDistributeRows: vi.fn(),
      handleProjectDraftInteractionStart: vi.fn(),
      handleProjectDraftInteractionEnd: vi.fn(),
    };
    const workspace = {
      projectComparison: null,
      projectStatusMessage: null,
      canApplyLoadedProject: false,
      resolveProjectDocumentForCurrentState: vi.fn((project) => project),
      activeProject: currentProject,
      activeProjectBindings: {},
      previewCuts: [],
      effectiveExportCuts: [],
      effectiveExportSettings: options.settings,
    };

    currentSessionMocks.useEditorSessions.mockReturnValue({
      currentProjectSession,
      loadedProjectSession,
      loadedProject: null,
      isLoadedProjectActive: false,
    });
    presentationMocks.useWorkspacePresentation.mockReturnValue(presentation);
    workspaceMocks.useProjectWorkspace.mockReturnValue(workspace);
    managerMocks.useLoadedProjectManager.mockReturnValue({
      projectPanelProps: null,
      handleSaveProject: vi.fn(),
      onProjectLoaded: vi.fn(),
    });
    cutEditorMocks.useActiveCutEditor.mockReturnValue({
      selectedCutId: null,
      canUndo: false,
      canRedo: false,
      historyIndex: -1,
      historyLength: 0,
      createCutAt: vi.fn(),
      selectCut: vi.fn(),
      deleteCut: vi.fn(),
      updateCutPosition: vi.fn(),
      commitCutDrag: vi.fn(),
      setNumberingState: vi.fn(),
      renumberFromSelected: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
    });

    const { result } = renderHook(() => useEditorWorkspace(options));

    expect(cutEditorMocks.useActiveCutEditor).toHaveBeenCalledWith({
      editor: currentProjectSession.projectCutEditorApi,
    });
    expect(result.current.isLoadedProjectActive).toBe(false);
    expect(result.current.selectedLogicalPageId).toBeNull();

    act(() => {
      result.current.resetCurrentProject();
    });

    expect(currentProjectSession.resetCuts).toHaveBeenCalledTimes(1);
  });
});
