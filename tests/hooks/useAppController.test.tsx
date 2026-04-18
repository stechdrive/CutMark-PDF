import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectDocument } from '../../domain/project';
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

const debugLoggerMocks = vi.hoisted(() => ({
  useDebugLogger: vi.fn(),
}));
const workspaceControllerMocks = vi.hoisted(() => ({
  useAppWorkspaceController: vi.fn(),
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

vi.mock('../../hooks/useDebugLogger', () => ({ useDebugLogger: debugLoggerMocks.useDebugLogger }));
vi.mock('../../hooks/useAppWorkspaceController', () => ({
  useAppWorkspaceController: workspaceControllerMocks.useAppWorkspaceController,
}));
vi.mock('../../hooks/useDebugPanel', () => ({ useDebugPanel: debugPanelMocks.useDebugPanel }));
vi.mock('../../hooks/useWorkspaceFileActions', () => ({ useWorkspaceFileActions: fileActionsMocks.useWorkspaceFileActions }));
vi.mock('../../hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: keyboardMocks.useKeyboardShortcuts }));
vi.mock('../../hooks/useAppShellProps', () => ({ useAppShellProps: shellPropsMocks.useAppShellProps }));

describe('useAppController', () => {
  beforeEach(() => {
    debugLoggerMocks.useDebugLogger.mockReset();
    workspaceControllerMocks.useAppWorkspaceController.mockReset();
    debugPanelMocks.useDebugPanel.mockReset();
    fileActionsMocks.useWorkspaceFileActions.mockReset();
    keyboardMocks.useKeyboardShortcuts.mockReset();
    shellPropsMocks.useAppShellProps.mockReset();
  });

  it('composes the app shell from the orchestration hooks', () => {
    const settings = createAppSettings();
    const template = createTemplate();
    const activeProject = createProjectDocument({
      settings,
      template,
      logicalPages: [
        {
          id: 'page-1',
          cuts: [{ id: 'cut-1', x: 0.1, y: 0.2, label: '001', isBranch: false }],
        },
      ],
    });
    const workspaceController = {
      mode: 'edit' as const,
      setMode: vi.fn(),
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
      activeProject,
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
      handleRowSnap: vi.fn(),
      applyPdfDefaultFontSize: vi.fn(),
    };
    const debugLogger = {
      debugEnabled: true,
      debugLogs: [],
      logDebug: vi.fn(),
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

    debugLoggerMocks.useDebugLogger.mockReturnValue(debugLogger);
    workspaceControllerMocks.useAppWorkspaceController.mockReturnValue(workspaceController);
    debugPanelMocks.useDebugPanel.mockReturnValue(debugPanel);
    fileActionsMocks.useWorkspaceFileActions.mockReturnValue(fileActions);
    shellPropsMocks.useAppShellProps.mockReturnValue(shellProps);

    const { result } = renderHook(() => useAppController());

    expect(workspaceControllerMocks.useAppWorkspaceController).toHaveBeenCalledWith({
      logDebug: debugLogger.logDebug,
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
        imageFiles: workspaceController.imageFiles,
        isLoadedProjectActive: true,
        setIsExporting: expect.any(Function),
      })
    );
    expect(keyboardMocks.useKeyboardShortcuts).toHaveBeenCalledWith(
      expect.objectContaining({
        onUndo: workspaceController.activeCutEditor.undo,
        onRedo: workspaceController.activeCutEditor.redo,
        onRowSnap: workspaceController.handleRowSnap,
      })
    );
    expect(shellPropsMocks.useAppShellProps).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          docType: 'images',
          onPdfFileChange: fileActions.onPdfLoaded,
          onProjectFileChange: workspaceController.loadedProjectManager.onProjectLoaded,
        }),
        preview: expect.objectContaining({
          currentImageUrl: 'blob:image',
          onPdfPageLoadSuccess: workspaceController.applyPdfDefaultFontSize,
        }),
        sidebar: expect.objectContaining({
          templates: workspaceController.templates,
          onRowSnap: workspaceController.handleRowSnap,
        }),
      })
    );
    expect(result.current).toBe(shellProps);
  });
});
