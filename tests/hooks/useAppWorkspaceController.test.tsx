import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppWorkspaceController } from '../../hooks/useAppWorkspaceController';

const documentControllerMocks = vi.hoisted(() => ({
  useAppDocumentController: vi.fn(),
}));

const editorControllerMocks = vi.hoisted(() => ({
  useAppEditorController: vi.fn(),
}));

vi.mock('../../hooks/useAppDocumentController', () => ({
  useAppDocumentController: documentControllerMocks.useAppDocumentController,
}));
vi.mock('../../hooks/useAppEditorController', () => ({
  useAppEditorController: editorControllerMocks.useAppEditorController,
}));

describe('useAppWorkspaceController', () => {
  beforeEach(() => {
    documentControllerMocks.useAppDocumentController.mockReset();
    editorControllerMocks.useAppEditorController.mockReset();
  });

  it('composes mode, document state, and editor state', () => {
    const documentController = {
      settings: { nextNumber: 1 },
      setSettings: vi.fn(),
      numberingState: { nextNumber: 1, branchChar: null },
      setNumberingState: vi.fn(),
      setResetHandler: vi.fn(),
      docType: 'images' as const,
      pdfFile: null as File | null,
      imageFiles: [] as File[],
      currentImageUrl: null as string | null,
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
      templates: [],
      template: { id: 'default' },
      setTemplate: vi.fn(),
      changeTemplate: vi.fn(),
      saveTemplateByName: vi.fn(),
      saveTemplateDraftByName: vi.fn(),
      deleteTemplate: vi.fn(),
      deleteTemplateById: vi.fn(),
      distributeRows: vi.fn(),
      upsertTemplate: vi.fn(),
      currentAssetHints: [],
      currentProjectName: 'shots',
    };
    const editorState = {
      isLoadedProjectActive: true,
      selectedLogicalPageId: 'page-1' as string | null,
      effectiveSettings: { nextNumber: 10 },
      effectiveTemplate: { id: 'template-1' },
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
      activeProject: { logicalPages: [] },
      previewCuts: [],
      effectiveExportCuts: [],
      effectiveExportSettings: { nextNumber: 10 },
      canApplyLoadedProject: true,
      loadedProjectManager: {
        loadProjectFile: vi.fn(),
        onProjectLoaded: vi.fn(),
        handleSaveProject: vi.fn(),
        projectPanelProps: null,
      },
      activeCutEditor: { createCutAt: vi.fn() },
      handleRowSnap: vi.fn(),
      applyPdfDefaultFontSize: vi.fn(),
    };

    documentControllerMocks.useAppDocumentController.mockReturnValue(documentController);
    editorControllerMocks.useAppEditorController.mockReturnValue(editorState);

    const logDebug = vi.fn();
    const { result } = renderHook(() => useAppWorkspaceController({ logDebug }));

    expect(documentControllerMocks.useAppDocumentController).toHaveBeenCalledTimes(1);
    expect(editorControllerMocks.useAppEditorController).toHaveBeenCalledWith({
      documentState: documentController,
      setMode: expect.any(Function),
      logDebug,
    });
    expect(result.current.mode).toBe('edit');
    expect(result.current.docType).toBe('images');
    expect(result.current.activeProject).toBe(editorState.activeProject);
    expect(result.current.handleRowSnap).toBe(editorState.handleRowSnap);
    expect(result.current.applyPdfDefaultFontSize).toBe(editorState.applyPdfDefaultFontSize);
  });
});
