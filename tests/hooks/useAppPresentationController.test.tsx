import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useAppPresentationController } from '../../hooks/useAppPresentationController';
import { createAppSettings, createTemplate } from '../../test/factories';

vi.mock('react-pdf', () => ({
  pdfjs: {
    version: '5.4.296',
    GlobalWorkerOptions: {
      workerSrc: '/pdf.worker.min.mjs',
    },
  },
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

vi.mock('../../hooks/useDebugPanel', () => ({ useDebugPanel: debugPanelMocks.useDebugPanel }));
vi.mock('../../hooks/useWorkspaceFileActions', () => ({
  useWorkspaceFileActions: fileActionsMocks.useWorkspaceFileActions,
}));
vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: keyboardMocks.useKeyboardShortcuts,
}));
vi.mock('../../hooks/useAppShellProps', () => ({ useAppShellProps: shellPropsMocks.useAppShellProps }));

describe('useAppPresentationController', () => {
  beforeEach(() => {
    debugPanelMocks.useDebugPanel.mockReset();
    fileActionsMocks.useWorkspaceFileActions.mockReset();
    keyboardMocks.useKeyboardShortcuts.mockReset();
    shellPropsMocks.useAppShellProps.mockReset();
  });

  it('composes debug, file actions, shortcuts, and shell props from workspace state', () => {
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
    const workspace = {
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
      selectedLogicalPageNumber: 1,
      selectedAssetIndex: null,
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
      projectStatusMessage: '論理P1 は未割当です。割当を決めると対応する素材ページを表示します。',
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
    const debugLogs = [];
    const logDebug = vi.fn();

    debugPanelMocks.useDebugPanel.mockReturnValue(debugPanel);
    fileActionsMocks.useWorkspaceFileActions.mockReturnValue(fileActions);
    shellPropsMocks.useAppShellProps.mockReturnValue(shellProps);

    const { result } = renderHook(() => useAppPresentationController({
      workspace,
      debugEnabled: true,
      debugLogs,
      logDebug,
    }));

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
        imageFiles: workspace.imageFiles,
        isLoadedProjectActive: true,
        setIsExporting: expect.any(Function),
      })
    );
    expect(keyboardMocks.useKeyboardShortcuts).toHaveBeenCalledWith(
      expect.objectContaining({
        onUndo: workspace.activeCutEditor.undo,
        onRedo: workspace.activeCutEditor.redo,
        onRowSnap: workspace.handleRowSnap,
      })
    );
    expect(shellPropsMocks.useAppShellProps).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          docType: 'images',
          onPdfFileChange: fileActions.onPdfLoaded,
          onProjectFileChange: workspace.loadedProjectManager.onProjectLoaded,
        }),
        preview: expect.objectContaining({
          currentImageUrl: 'blob:image',
          projectNotice: {
            title: '論理P1 は未割当です',
            message: '論理P1 は未割当です。割当を決めると対応する素材ページを表示します。',
          },
          onPdfPageLoadSuccess: workspace.applyPdfDefaultFontSize,
        }),
        sidebar: expect.objectContaining({
          templates: workspace.templates,
          onRowSnap: workspace.handleRowSnap,
        }),
      })
    );
    expect(result.current).toBe(shellProps);
  });
});
