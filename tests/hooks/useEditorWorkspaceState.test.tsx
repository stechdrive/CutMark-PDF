import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useEditorWorkspaceState } from '../../hooks/useEditorWorkspaceState';
import { createAppSettings, createTemplate } from '../../test/factories';

const presentationMocks = vi.hoisted(() => ({
  useWorkspacePresentation: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  useProjectWorkspace: vi.fn(),
}));

vi.mock('../../hooks/useWorkspacePresentation', () => ({
  useWorkspacePresentation: presentationMocks.useWorkspacePresentation,
}));

vi.mock('../../hooks/useProjectWorkspace', () => ({
  useProjectWorkspace: workspaceMocks.useProjectWorkspace,
}));

describe('useEditorWorkspaceState', () => {
  beforeEach(() => {
    presentationMocks.useWorkspacePresentation.mockReset();
    workspaceMocks.useProjectWorkspace.mockReset();
  });

  it('composes workspace presentation and project workspace state', () => {
    const settings = createAppSettings();
    const template = createTemplate();
    const loadedProject = createProjectDocument({
      settings: createAppSettings({ nextNumber: 10 }),
      template: createTemplate({ id: 'loaded-template' }),
      name: 'Loaded',
      logicalPages: [],
    });
    const currentProjectSession = {
      setProjectNumberingState: vi.fn(),
      workspaceSession: {
        project: null,
        bindings: {},
        selectedLogicalPage: null,
        selectedLogicalPageId: null,
        selectedLogicalPageNumber: null,
        selectedAssetIndex: null,
      },
    };
    const loadedProjectSession = {
      projectDraftApi: {
        updateSettings: vi.fn(),
        updateTemplate: vi.fn(),
        beginTransaction: vi.fn(),
        commitTransaction: vi.fn(),
      },
      workspaceSession: {
        project: loadedProject,
        bindings: { 'page-1': 0 },
        canApply: true,
        assignedCount: 1,
        selectedLogicalPage: null,
        selectedLogicalPageId: null,
        selectedLogicalPageNumber: null,
        selectedAssetIndex: null,
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
      activeProject: loadedProject,
      previewCuts: [],
      effectiveExportCuts: [],
      effectiveExportSettings: createAppSettings({ nextNumber: 10 }),
      canApplyLoadedProject: true,
      activeProjectBindings: { 'page-1': 0 },
      projectComparison: { logicalPageCount: 1 },
      projectStatusMessage: 'status',
      resolveProjectDocumentForCurrentState: vi.fn((project) => project),
    };
    const setSettings = vi.fn();
    const setCurrentPage = vi.fn();
    const currentAssetHints = [{ sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 }];

    presentationMocks.useWorkspacePresentation.mockReturnValue(presentation);
    workspaceMocks.useProjectWorkspace.mockReturnValue(workspace);

    const { result } = renderHook(() =>
      useEditorWorkspaceState({
        currentProjectSession: currentProjectSession as never,
        loadedProjectSession: loadedProjectSession as never,
        loadedProject,
        docType: 'images',
        currentPage: 1,
        setCurrentPage,
        currentAssetHints,
        settings,
        setSettings,
        templateApi,
      })
    );

    expect(presentationMocks.useWorkspacePresentation).toHaveBeenCalledWith({
      loadedProject,
      settings,
      setSettings,
      setCurrentNumberingStateWithHistory: currentProjectSession.setProjectNumberingState,
      templateApi: {
        templates: templateApi.templates,
        template: templateApi.template,
        setTemplate: templateApi.setTemplate,
        changeTemplate: templateApi.changeTemplate,
        saveTemplateByName: templateApi.saveTemplateByName,
        saveTemplateDraftByName: templateApi.saveTemplateDraftByName,
        deleteTemplate: templateApi.deleteTemplate,
        deleteTemplateById: templateApi.deleteTemplateById,
        distributeRows: templateApi.distributeRows,
      },
      projectDraftApi: loadedProjectSession.projectDraftApi,
    });
    expect(workspaceMocks.useProjectWorkspace).toHaveBeenCalledWith({
      docType: 'images',
      currentPage: 1,
      setCurrentPage,
      currentAssetHints,
      effectiveSettings: presentation.effectiveSettings,
      effectiveTemplate: presentation.effectiveTemplate,
      fallbackSettings: settings,
      loadedSession: loadedProjectSession.workspaceSession,
      currentSession: currentProjectSession.workspaceSession,
    });
    expect(result.current.workspace).toBe(workspace);
    expect(result.current.effectiveTemplate).toBe(presentation.effectiveTemplate);
  });
});
