import { useState } from 'react';
import { pdfjs } from 'react-pdf';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useDebugPanel } from './useDebugPanel';
import { useAppShellProps } from './useAppShellProps';
import { useWorkspaceFileActions } from './useWorkspaceFileActions';
import type { AppWorkspaceControllerState } from './useAppWorkspaceController';
import type { DebugLog } from './useDebugLogger';

type DebugLogData = unknown | (() => unknown);
type AppPresentationWorkspace = Pick<
  AppWorkspaceControllerState,
  | 'mode'
  | 'setMode'
  | 'docType'
  | 'pdfFile'
  | 'imageFiles'
  | 'currentImageUrl'
  | 'numPages'
  | 'currentPage'
  | 'scale'
  | 'isDragging'
  | 'loadPdf'
  | 'loadImages'
  | 'setNumPages'
  | 'setCurrentPage'
  | 'setScale'
  | 'dragHandlers'
  | 'templates'
  | 'importTemplateDocument'
  | 'isLoadedProjectActive'
  | 'selectedLogicalPageId'
  | 'selectedLogicalPageNumber'
  | 'selectedAssetIndex'
  | 'effectiveSettings'
  | 'effectiveTemplate'
  | 'setEffectiveSettings'
  | 'setEffectiveSettingsLive'
  | 'setEffectiveTemplate'
  | 'setEffectiveTemplateLive'
  | 'handleTemplateChange'
  | 'handleSaveTemplate'
  | 'handleDeleteTemplate'
  | 'handleDistributeRows'
  | 'handleProjectDraftInteractionStart'
  | 'handleProjectDraftInteractionEnd'
  | 'activeProject'
  | 'previewCuts'
  | 'effectiveExportCuts'
  | 'effectiveExportSettings'
  | 'canApplyLoadedProject'
  | 'loadedProjectManager'
  | 'activeCutEditor'
  | 'handleRowSnap'
  | 'applyPdfDefaultFontSize'
>;

interface UseAppPresentationControllerOptions {
  workspace: AppPresentationWorkspace;
  debugEnabled: boolean;
  debugLogs: DebugLog[];
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

export const useAppPresentationController = ({
  workspace,
  debugEnabled,
  debugLogs,
  logDebug,
}: UseAppPresentationControllerOptions) => {
  const [isExporting, setIsExporting] = useState(false);
  const [includeProjectFileOnExport, setIncludeProjectFileOnExport] = useState(true);

  const effectiveSelectedCutId = workspace.activeCutEditor.selectedCutId;
  const canUndoHistory = workspace.activeCutEditor.canUndo;
  const canRedoHistory = workspace.activeCutEditor.canRedo;
  const activeHistoryIndex = workspace.activeCutEditor.historyIndex;
  const activeHistoryLength = workspace.activeCutEditor.historyLength;
  const handleUndoAction = workspace.activeCutEditor.undo;
  const handleRedoAction = workspace.activeCutEditor.redo;
  const projectPreviewNotice =
    workspace.isLoadedProjectActive &&
    workspace.selectedLogicalPageId &&
    workspace.selectedAssetIndex == null
      ? {
          title:
            workspace.selectedLogicalPageNumber != null
              ? `カット番号P${workspace.selectedLogicalPageNumber} は未配置です`
              : '未配置のカット番号ページを編集中',
          message:
            '左パネルでコンテへ割り付けると、プレビューが同期します。背景のコンテ表示は参照用です。',
        }
      : null;

  const {
    debugOpen,
    debugCopyStatus,
    debugTextRef,
    debugReport,
    openDebug,
    closeDebug,
    handleCopyDebugReport,
  } = useDebugPanel({
    debugEnabled,
    debugLogs,
    logDebug,
    docType: workspace.docType,
    mode: workspace.mode,
    isExporting,
    currentPage: workspace.currentPage,
    numPages: workspace.numPages,
    scale: workspace.scale,
    activeProjectCutCount: workspace.activeProject
      ? workspace.activeProject.logicalPages.reduce((count, page) => count + page.cuts.length, 0)
      : 0,
    previewCutCount: workspace.previewCuts.length,
    selectedCutId: effectiveSelectedCutId,
    pdfFile: workspace.pdfFile,
    imageFiles: workspace.imageFiles,
    effectiveSettings: workspace.effectiveSettings,
    effectiveTemplate: workspace.effectiveTemplate,
    isLoadedProjectActive: workspace.isLoadedProjectActive,
    canUndoHistory,
    canRedoHistory,
    activeHistoryIndex,
    activeHistoryLength,
    selectedLogicalPageId: workspace.selectedLogicalPageId,
    pdfjsVersion: (pdfjs as { version?: string }).version,
    pdfWorkerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
  });

  const {
    onImportFilesSelected,
    onFileDropped,
    handleExportPdf,
    handleExportImages,
  } = useWorkspaceFileActions({
    docType: workspace.docType,
    pdfFile: workspace.pdfFile,
    imageFiles: workspace.imageFiles,
    effectiveExportCuts: workspace.effectiveExportCuts,
    effectiveExportSettings: workspace.effectiveExportSettings,
    isLoadedProjectActive: workspace.isLoadedProjectActive,
    canApplyLoadedProject: workspace.canApplyLoadedProject,
    loadPdf: workspace.loadPdf,
    loadImages: workspace.loadImages,
    loadProjectFile: workspace.loadedProjectManager.loadProjectFile,
    exportProjectFile: workspace.loadedProjectManager.handleSaveProject,
    includeProjectFileOnExport,
    onDrop: workspace.dragHandlers.onDrop,
    setIsExporting,
    logDebug,
  });

  useKeyboardShortcuts({
    onUndo: handleUndoAction,
    onRedo: handleRedoAction,
    onPageNext: () => workspace.setCurrentPage((page) => page + 1),
    onPagePrev: () => workspace.setCurrentPage((page) => page - 1),
    onRowSnap: workspace.handleRowSnap,
  });

  return useAppShellProps({
    header: {
      docType: workspace.docType,
      mode: workspace.mode,
      setMode: workspace.setMode,
      isExporting,
      canUndo: canUndoHistory,
      canRedo: canRedoHistory,
      onUndo: handleUndoAction,
      onRedo: handleRedoAction,
      onImportFileChange: onImportFilesSelected,
      onExportPdf: handleExportPdf,
      onExportImages: handleExportImages,
      includeProjectFileOnExport,
      onToggleIncludeProjectFileOnExport: setIncludeProjectFileOnExport,
      onOpenDebug: openDebug,
      showDebug: debugEnabled,
    },
    preview: {
      docType: workspace.docType,
      pdfFile: workspace.pdfFile,
      currentImageUrl: workspace.currentImageUrl,
      numPages: workspace.numPages,
      setNumPages: workspace.setNumPages,
      currentPage: workspace.currentPage,
      setCurrentPage: workspace.setCurrentPage,
      scale: workspace.scale,
      setScale: workspace.setScale,
      isDragging: workspace.isDragging,
      dragHandlers: workspace.dragHandlers,
      onFileDropped,
      cuts: workspace.previewCuts,
      selectedCutId: effectiveSelectedCutId,
      setSelectedCutId: workspace.activeCutEditor.selectCut,
      deleteCut: workspace.activeCutEditor.deleteCut,
      updateCutPosition: workspace.activeCutEditor.updateCutPosition,
      handleCutDragEnd: workspace.activeCutEditor.commitCutDrag,
      mode: workspace.mode,
      template: workspace.effectiveTemplate,
      setTemplate: workspace.setEffectiveTemplate,
      setTemplateLive: workspace.setEffectiveTemplateLive,
      onTemplateInteractionStart: workspace.handleProjectDraftInteractionStart,
      onTemplateInteractionEnd: workspace.handleProjectDraftInteractionEnd,
      settings: workspace.effectiveSettings,
      projectNotice: projectPreviewNotice,
      onContentClick: workspace.activeCutEditor.createCutAt,
      onPdfPageLoadSuccess: workspace.applyPdfDefaultFontSize,
      logDebug,
      isLoadedProjectActive: workspace.isLoadedProjectActive,
    },
    sidebar: {
      mode: workspace.mode,
      pdfFile: workspace.pdfFile || (workspace.imageFiles.length > 0 ? workspace.imageFiles[0] : null),
      selectedCutId: effectiveSelectedCutId,
      projectOrganizerProps: workspace.loadedProjectManager.projectOrganizerProps,
      templates: workspace.templates,
      template: workspace.effectiveTemplate,
      setTemplate: workspace.setEffectiveTemplate,
      changeTemplate: workspace.handleTemplateChange,
      saveTemplateByName: workspace.handleSaveTemplate,
      deleteTemplate: workspace.handleDeleteTemplate,
      distributeRows: workspace.handleDistributeRows,
      importTemplateDocument: workspace.importTemplateDocument,
      onRowSnap: workspace.handleRowSnap,
      settings: workspace.effectiveSettings,
      setSettings: workspace.setEffectiveSettings,
      setLiveSettings: workspace.setEffectiveSettingsLive,
      onLiveSettingsStart: workspace.handleProjectDraftInteractionStart,
      onLiveSettingsEnd: workspace.handleProjectDraftInteractionEnd,
      setNumberingState: workspace.activeCutEditor.setNumberingState,
      onRenumberFromSelected: workspace.activeCutEditor.renumberFromSelected,
      isLoadedProjectActive: workspace.isLoadedProjectActive,
    },
    debugModal: {
      open: debugOpen,
      debugTextRef,
      debugReport,
      debugCopyStatus,
      onClose: closeDebug,
      onCopy: handleCopyDebugReport,
    },
    exportOverlay: {
      isExporting,
    },
  });
};
