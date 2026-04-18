import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppController } from '../../hooks/useAppController';
import { createAppSettings, createTemplate } from '../../test/factories';

vi.mock('react-pdf', () => ({
  pdfjs: {
    version: '5.4.296',
    GlobalWorkerOptions: {
      workerSrc: '/pdf.worker.min.mjs',
    },
  },
}));

const appSettingsMocks = vi.hoisted(() => ({
  useAppSettings: vi.fn(),
}));
const resetControllerMocks = vi.hoisted(() => ({
  useDocumentResetController: vi.fn(),
}));
const documentViewerMocks = vi.hoisted(() => ({
  useDocumentViewer: vi.fn(),
}));
const templateMocks = vi.hoisted(() => ({
  useTemplates: vi.fn(),
}));
const debugLoggerMocks = vi.hoisted(() => ({
  useDebugLogger: vi.fn(),
}));
const metadataMocks = vi.hoisted(() => ({
  useCurrentDocumentMetadata: vi.fn(),
}));
const editorWorkspaceMocks = vi.hoisted(() => ({
  useEditorWorkspace: vi.fn(),
}));
const canvasBehaviorMocks = vi.hoisted(() => ({
  useEditorCanvasBehavior: vi.fn(),
}));
const debugPanelMocks = vi.hoisted(() => ({
  useDebugPanel: vi.fn(),
}));
const fileActionsMocks = vi.hoisted(() => ({
  useWorkspaceFileActions: vi.fn(),
}));
const keyboardMocks = vi.hoisted(() => ({
  useKeyboardShortcuts: vi.fn(),
}));
const shellPropsMocks = vi.hoisted(() => ({
  useAppShellProps: vi.fn(),
}));

vi.mock('../../hooks/useAppSettings', () => ({ useAppSettings: appSettingsMocks.useAppSettings }));
vi.mock('../../hooks/useDocumentResetController', () => ({ useDocumentResetController: resetControllerMocks.useDocumentResetController }));
vi.mock('../../hooks/useDocumentViewer', () => ({ useDocumentViewer: documentViewerMocks.useDocumentViewer }));
vi.mock('../../hooks/useTemplates', () => ({ useTemplates: templateMocks.useTemplates }));
vi.mock('../../hooks/useDebugLogger', () => ({ useDebugLogger: debugLoggerMocks.useDebugLogger }));
vi.mock('../../hooks/useCurrentDocumentMetadata', () => ({ useCurrentDocumentMetadata: metadataMocks.useCurrentDocumentMetadata }));
vi.mock('../../hooks/useEditorWorkspace', () => ({ useEditorWorkspace: editorWorkspaceMocks.useEditorWorkspace }));
vi.mock('../../hooks/useEditorCanvasBehavior', () => ({ useEditorCanvasBehavior: canvasBehaviorMocks.useEditorCanvasBehavior }));
vi.mock('../../hooks/useDebugPanel', () => ({ useDebugPanel: debugPanelMocks.useDebugPanel }));
vi.mock('../../hooks/useWorkspaceFileActions', () => ({ useWorkspaceFileActions: fileActionsMocks.useWorkspaceFileActions }));
vi.mock('../../hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: keyboardMocks.useKeyboardShortcuts }));
vi.mock('../../hooks/useAppShellProps', () => ({ useAppShellProps: shellPropsMocks.useAppShellProps }));

describe('useAppController', () => {
  beforeEach(() => {
    appSettingsMocks.useAppSettings.mockReset();
    resetControllerMocks.useDocumentResetController.mockReset();
    documentViewerMocks.useDocumentViewer.mockReset();
    templateMocks.useTemplates.mockReset();
    debugLoggerMocks.useDebugLogger.mockReset();
    metadataMocks.useCurrentDocumentMetadata.mockReset();
    editorWorkspaceMocks.useEditorWorkspace.mockReset();
    canvasBehaviorMocks.useEditorCanvasBehavior.mockReset();
    debugPanelMocks.useDebugPanel.mockReset();
    fileActionsMocks.useWorkspaceFileActions.mockReset();
    keyboardMocks.useKeyboardShortcuts.mockReset();
    shellPropsMocks.useAppShellProps.mockReset();
  });

  it('composes the app shell from the orchestration hooks', () => {
    const settings = createAppSettings();
    const setSettings = vi.fn();
    const handleDocumentReset = vi.fn();
    const setResetHandler = vi.fn();
    const documentViewer = {
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
    };
    const template = createTemplate();
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
    const debugLogger = {
      debugEnabled: true,
      debugLogs: [],
      logDebug: vi.fn(),
    };
    const metadata = {
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
        onProjectLoaded: vi.fn(),
        handleSaveProject: vi.fn(),
        projectPanelProps: null,
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
    const debugPanel = {
      debugOpen: false,
      debugCopyStatus: 'idle' as const,
      debugTextRef: { current: null },
      debugReport: 'report',
      openDebug: vi.fn(),
      closeDebug: vi.fn(),
      handleCopyDebugReport: vi.fn(),
    };
    const fileActions = {
      onPdfLoaded: vi.fn(),
      onFolderLoaded: vi.fn(),
      onFileDropped: vi.fn(),
      handleExportPdf: vi.fn(),
      handleExportImages: vi.fn(),
    };
    const shellProps = {
      headerProps: { id: 'header' },
      documentPreviewProps: { id: 'preview' },
      sidebarProps: { id: 'sidebar' },
      debugModalProps: { id: 'debug' },
      exportOverlayProps: { id: 'overlay' },
    };

    appSettingsMocks.useAppSettings.mockReturnValue({ settings, setSettings });
    resetControllerMocks.useDocumentResetController.mockReturnValue({ handleDocumentReset, setResetHandler });
    documentViewerMocks.useDocumentViewer.mockReturnValue(documentViewer);
    templateMocks.useTemplates.mockReturnValue(templateApi);
    debugLoggerMocks.useDebugLogger.mockReturnValue(debugLogger);
    metadataMocks.useCurrentDocumentMetadata.mockReturnValue(metadata);
    editorWorkspaceMocks.useEditorWorkspace.mockReturnValue(editorWorkspace);
    canvasBehaviorMocks.useEditorCanvasBehavior.mockReturnValue(canvasBehavior);
    debugPanelMocks.useDebugPanel.mockReturnValue(debugPanel);
    fileActionsMocks.useWorkspaceFileActions.mockReturnValue(fileActions);
    shellPropsMocks.useAppShellProps.mockReturnValue(shellProps);

    const { result } = renderHook(() => useAppController());

    expect(documentViewerMocks.useDocumentViewer).toHaveBeenCalledWith(handleDocumentReset);
    expect(metadataMocks.useCurrentDocumentMetadata).toHaveBeenCalledWith({
      docType: 'images',
      pdfFile: null,
      imageFiles: documentViewer.imageFiles,
      numPages: 2,
    });
    expect(editorWorkspaceMocks.useEditorWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: 'images',
        currentPage: 1,
        currentAssetHints: metadata.currentAssetHints,
        currentProjectName: 'shots',
      })
    );
    expect(setResetHandler).toHaveBeenCalledWith(editorWorkspace.resetCurrentProject);
    expect(canvasBehaviorMocks.useEditorCanvasBehavior).toHaveBeenCalledWith({
      docType: 'images',
      pdfFile: null,
      settings,
      setSettings,
      template,
      isLoadedProjectActive: true,
      createCutAt: editorWorkspace.activeCutEditor.createCutAt,
    });
    expect(debugPanelMocks.useDebugPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        debugEnabled: true,
        currentPage: 1,
        activeProjectCutCount: 1,
        previewCutCount: 1,
        selectedLogicalPageId: 'page-1',
      })
    );
    expect(fileActionsMocks.useWorkspaceFileActions).toHaveBeenCalledWith(
      expect.objectContaining({
        docType: 'images',
        imageFiles: documentViewer.imageFiles,
        isLoadedProjectActive: true,
        setIsExporting: expect.any(Function),
      })
    );
    expect(keyboardMocks.useKeyboardShortcuts).toHaveBeenCalledWith(
      expect.objectContaining({
        onUndo: editorWorkspace.activeCutEditor.undo,
        onRedo: editorWorkspace.activeCutEditor.redo,
        onRowSnap: canvasBehavior.handleRowSnap,
      })
    );
    expect(shellPropsMocks.useAppShellProps).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          docType: 'images',
          onPdfFileChange: fileActions.onPdfLoaded,
          onProjectFileChange: editorWorkspace.loadedProjectManager.onProjectLoaded,
        }),
        preview: expect.objectContaining({
          currentImageUrl: 'blob:image',
          onPdfPageLoadSuccess: canvasBehavior.applyPdfDefaultFontSize,
        }),
        sidebar: expect.objectContaining({
          templates: templateApi.templates,
          onRowSnap: canvasBehavior.handleRowSnap,
        }),
      })
    );
    expect(result.current).toBe(shellProps);
  });
});
