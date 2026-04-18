import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorWorkspace } from '../../hooks/useEditorWorkspace';
import { createAppSettings, createTemplate } from '../../test/factories';

const sessionMocks = vi.hoisted(() => ({
  useEditorSessions: vi.fn(),
}));

const stateMocks = vi.hoisted(() => ({
  useEditorWorkspaceState: vi.fn(),
}));

const controlsMocks = vi.hoisted(() => ({
  useEditorWorkspaceControls: vi.fn(),
}));

vi.mock('../../hooks/useEditorSessions', () => ({
  useEditorSessions: sessionMocks.useEditorSessions,
}));

vi.mock('../../hooks/useEditorWorkspaceState', () => ({
  useEditorWorkspaceState: stateMocks.useEditorWorkspaceState,
}));

vi.mock('../../hooks/useEditorWorkspaceControls', () => ({
  useEditorWorkspaceControls: controlsMocks.useEditorWorkspaceControls,
}));

const createOptions = () => ({
  docType: 'images' as const,
  currentPage: 1,
  setCurrentPage: vi.fn(),
  numPages: 1,
  currentAssetHints: [{ sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 }],
  currentProjectName: 'current-folder',
  settings: createAppSettings(),
  setSettings: vi.fn(),
  numberingState: {
    nextNumber: 1,
    branchChar: null,
  },
  setNumberingState: vi.fn(),
  templateApi: {
    templates: [createTemplate()],
    template: createTemplate(),
    setTemplate: vi.fn(),
    changeTemplate: vi.fn(),
    saveTemplateByName: vi.fn(),
    saveTemplateDraftByName: vi.fn(),
    deleteTemplate: vi.fn(),
    deleteTemplateById: vi.fn(),
    distributeRows: vi.fn(),
    upsertTemplate: vi.fn(),
  },
  setMode: vi.fn(),
  logDebug: vi.fn(),
});

describe('useEditorWorkspace', () => {
  beforeEach(() => {
    sessionMocks.useEditorSessions.mockReset();
    stateMocks.useEditorWorkspaceState.mockReset();
    controlsMocks.useEditorWorkspaceControls.mockReset();
  });

  it('composes session, state, and control hooks into the editor workspace contract', () => {
    const options = createOptions();
    const currentProjectSession = {
      project: { id: 'current-project' },
      resetProject: vi.fn(),
      projectCutEditorApi: { id: 'current-editor' },
    };
    const loadedProjectSession = {
      workspaceSession: {
        project: { id: 'loaded-project' },
        bindings: { 'page-1': 0 },
        selectedLogicalPageId: 'page-1',
      },
      projectCutEditorApi: { id: 'loaded-editor' },
    };
    const sessions = {
      currentProjectSession,
      loadedProjectSession,
      loadedProject: { id: 'loaded-project' },
      isLoadedProjectActive: true,
    };
    const workspaceState = {
      effectiveSettings: { nextNumber: 10 },
      effectiveTemplate: { id: 'effective-template' },
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
      workspace: {
        activeProject: { id: 'active-project' },
        previewCuts: [{ id: 'cut-1' }],
        effectiveExportCuts: [{ id: 'cut-1' }],
        effectiveExportSettings: { nextNumber: 10 },
        canApplyLoadedProject: true,
      },
    };
    const controls = {
      loadedProjectManager: {
        projectPanelProps: null,
        loadProjectFile: vi.fn(),
        handleSaveProject: vi.fn(),
        onProjectLoaded: vi.fn(),
      },
      activeCutEditor: {
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
      },
    };

    sessionMocks.useEditorSessions.mockReturnValue(sessions);
    stateMocks.useEditorWorkspaceState.mockReturnValue(workspaceState);
    controlsMocks.useEditorWorkspaceControls.mockReturnValue(controls);

    const { result } = renderHook(() => useEditorWorkspace(options));

    expect(sessionMocks.useEditorSessions).toHaveBeenCalledWith({
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
    expect(stateMocks.useEditorWorkspaceState).toHaveBeenCalledWith({
      currentProjectSession,
      loadedProjectSession,
      settings: options.settings,
      loadedProject: sessions.loadedProject,
      setSettings: options.setSettings,
      docType: 'images',
      currentPage: 1,
      setCurrentPage: options.setCurrentPage,
      currentAssetHints: options.currentAssetHints,
      templateApi: options.templateApi,
    });
    expect(controlsMocks.useEditorWorkspaceControls).toHaveBeenCalledWith({
      sessions,
      workspaceState,
      docType: 'images',
      numPages: 1,
      currentAssetHints: options.currentAssetHints,
      templateApi: options.templateApi,
      setMode: options.setMode,
      logDebug: options.logDebug,
    });
    expect(result.current.isLoadedProjectActive).toBe(true);
    expect(result.current.resetCurrentProject).toBe(currentProjectSession.resetProject);
    expect(result.current.selectedLogicalPageId).toBe('page-1');
    expect(result.current.activeProject).toBe(workspaceState.workspace.activeProject);
    expect(result.current.previewCuts).toBe(workspaceState.workspace.previewCuts);
    expect(result.current.loadedProjectManager).toBe(controls.loadedProjectManager);
    expect(result.current.activeCutEditor).toBe(controls.activeCutEditor);
  });

  it('keeps current session reset available when no loaded project is active', () => {
    const options = createOptions();
    const currentProjectSession = {
      project: { id: 'current-project' },
      resetProject: vi.fn(),
      projectCutEditorApi: { id: 'current-editor' },
    };
    const loadedProjectSession = {
      workspaceSession: {
        project: null,
        bindings: {},
        selectedLogicalPageId: null,
      },
      projectCutEditorApi: { id: 'loaded-editor' },
    };

    sessionMocks.useEditorSessions.mockReturnValue({
      currentProjectSession,
      loadedProjectSession,
      loadedProject: null,
      isLoadedProjectActive: false,
    });
    stateMocks.useEditorWorkspaceState.mockReturnValue({
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
      workspace: {
        activeProject: currentProjectSession.project,
        previewCuts: [],
        effectiveExportCuts: [],
        effectiveExportSettings: options.settings,
        canApplyLoadedProject: false,
      },
    });
    controlsMocks.useEditorWorkspaceControls.mockReturnValue({
      loadedProjectManager: {
        projectPanelProps: null,
        loadProjectFile: vi.fn(),
        handleSaveProject: vi.fn(),
        onProjectLoaded: vi.fn(),
      },
      activeCutEditor: {
        selectedCutId: null,
      },
    });

    const { result } = renderHook(() => useEditorWorkspace(options));

    expect(result.current.isLoadedProjectActive).toBe(false);
    expect(result.current.selectedLogicalPageId).toBeNull();
    expect(result.current.resetCurrentProject).toBe(currentProjectSession.resetProject);
  });
});
