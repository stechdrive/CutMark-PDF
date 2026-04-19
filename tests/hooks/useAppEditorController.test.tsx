import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppEditorController } from '../../hooks/useAppEditorController';
import { createAppSettings, createTemplate } from '../../test/factories';

const editorWorkspaceMocks = vi.hoisted(() => ({
  useEditorWorkspace: vi.fn(),
}));

const canvasBehaviorMocks = vi.hoisted(() => ({
  useEditorCanvasBehavior: vi.fn(),
}));

vi.mock('../../hooks/useEditorWorkspace', () => ({
  useEditorWorkspace: editorWorkspaceMocks.useEditorWorkspace,
}));
vi.mock('../../hooks/useEditorCanvasBehavior', () => ({
  useEditorCanvasBehavior: canvasBehaviorMocks.useEditorCanvasBehavior,
}));

describe('useAppEditorController', () => {
  beforeEach(() => {
    editorWorkspaceMocks.useEditorWorkspace.mockReset();
    canvasBehaviorMocks.useEditorCanvasBehavior.mockReset();
  });

  it('composes editor workspace and canvas behavior from document state', () => {
    const settings = createAppSettings();
    const template = createTemplate();
    const documentState = {
      settings,
      setSettings: vi.fn(),
      numberingState: {
        nextNumber: settings.nextNumber,
        branchChar: settings.branchChar,
      },
      setNumberingState: vi.fn(),
      setResetHandler: vi.fn(),
      docType: 'images' as const,
      pdfFile: null,
      imageFiles: [new File(['img'], '001.png', { type: 'image/png' })],
      currentImageUrl: 'blob:image',
      numPages: 2,
      currentPage: 1,
      scale: 1,
      isDragging: false,
      loadPdf: vi.fn(),
      loadImages: vi.fn(),
      setNumPages: vi.fn(),
      setCurrentPage: vi.fn(),
      setScale: vi.fn(),
      dragHandlers: {
        onDragEnter: vi.fn(),
        onDragOver: vi.fn(),
        onDragLeave: vi.fn(),
        onDrop: vi.fn(),
      },
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
      importTemplateDocument: vi.fn(),
      currentAssetHints: [{ sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 }],
      currentProjectName: 'shots',
    };
    const editorWorkspace = {
      resetCurrentProject: vi.fn(),
      isLoadedProjectActive: true,
      selectedLogicalPageId: 'page-1',
      effectiveSettings: settings,
      effectiveTemplate: template,
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
      activeProject: {
        logicalPages: [{ cuts: [{ id: 'cut-1' }] }, { cuts: [] }],
      },
      previewCuts: [{ id: 'cut-1' }],
      effectiveExportCuts: [],
      effectiveExportSettings: settings,
      canApplyLoadedProject: true,
      loadedProjectManager: {
        loadProjectFile: vi.fn(),
        onProjectLoaded: vi.fn(),
        handleSaveProject: vi.fn(),
        projectOrganizerProps: null,
      },
      activeCutEditor: {
        selectedCutId: 'cut-1',
        canUndo: true,
        canRedo: false,
        historyIndex: 0,
        historyLength: 1,
        undo: vi.fn(),
        redo: vi.fn(),
        createCutAt: vi.fn(),
        selectCut: vi.fn(),
        deleteCut: vi.fn(),
        updateCutPosition: vi.fn(),
        commitCutDrag: vi.fn(),
        setNumberingState: vi.fn(),
        renumberFromSelected: vi.fn(),
      },
    };
    const canvasBehavior = {
      handleRowSnap: vi.fn(),
      applyPdfDefaultFontSize: vi.fn(),
    };

    editorWorkspaceMocks.useEditorWorkspace.mockReturnValue(editorWorkspace);
    canvasBehaviorMocks.useEditorCanvasBehavior.mockReturnValue(canvasBehavior);

    const setMode = vi.fn();
    const logDebug = vi.fn();
    const { result } = renderHook(() =>
      useAppEditorController({
        documentState,
        setMode,
        logDebug,
      })
    );

    expect(editorWorkspaceMocks.useEditorWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: 'images',
        currentPage: 1,
        currentAssetHints: documentState.currentAssetHints,
        currentProjectName: 'shots',
        logDebug,
        setMode,
      })
    );
    expect(documentState.setResetHandler).toHaveBeenCalledWith(editorWorkspace.resetCurrentProject);
    expect(canvasBehaviorMocks.useEditorCanvasBehavior).toHaveBeenCalledWith({
      docType: 'images',
      pdfFile: null,
      settings,
      setSettings: documentState.setSettings,
      template,
      isLoadedProjectActive: true,
      createCutAt: editorWorkspace.activeCutEditor.createCutAt,
    });
    expect(result.current.activeProject).toBe(editorWorkspace.activeProject);
    expect(result.current.handleRowSnap).toBe(canvasBehavior.handleRowSnap);
    expect(result.current.applyPdfDefaultFontSize).toBe(canvasBehavior.applyPdfDefaultFontSize);
  });
});
