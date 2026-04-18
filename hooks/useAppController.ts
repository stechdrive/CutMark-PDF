import { useState } from 'react';
import { pdfjs } from 'react-pdf';
import { useDebugLogger } from './useDebugLogger';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useDebugPanel } from './useDebugPanel';
import { useAppShellProps } from './useAppShellProps';
import { useAppWorkspaceController } from './useAppWorkspaceController';
import { useWorkspaceFileActions } from './useWorkspaceFileActions';

export const useAppController = () => {
  const [isExporting, setIsExporting] = useState(false);
  const {
    debugEnabled,
    debugLogs,
    logDebug,
  } = useDebugLogger();
  const {
    mode,
    setMode,
    docType,
    pdfFile,
    imageFiles,
    currentImageUrl,
    numPages,
    currentPage,
    scale,
    isDragging,
    loadPdf,
    loadImages,
    setNumPages,
    setCurrentPage,
    setScale,
    dragHandlers,
    templates,
    isLoadedProjectActive,
    selectedLogicalPageId,
    effectiveSettings,
    effectiveTemplate,
    setEffectiveSettings,
    setEffectiveSettingsLive,
    setEffectiveTemplate,
    setEffectiveTemplateLive,
    handleTemplateChange,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleDistributeRows,
    handleProjectDraftInteractionStart,
    handleProjectDraftInteractionEnd,
    activeProject,
    previewCuts,
    effectiveExportCuts,
    effectiveExportSettings,
    canApplyLoadedProject,
    loadedProjectManager,
    activeCutEditor,
    handleRowSnap,
    applyPdfDefaultFontSize,
  } = useAppWorkspaceController({ logDebug });

  const effectiveSelectedCutId = activeCutEditor.selectedCutId;
  const canUndoHistory = activeCutEditor.canUndo;
  const canRedoHistory = activeCutEditor.canRedo;
  const activeHistoryIndex = activeCutEditor.historyIndex;
  const activeHistoryLength = activeCutEditor.historyLength;
  const handleUndoAction = activeCutEditor.undo;
  const handleRedoAction = activeCutEditor.redo;

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
    docType,
    mode,
    isExporting,
    currentPage,
    numPages,
    scale,
    activeProjectCutCount: activeProject
      ? activeProject.logicalPages.reduce((count, page) => count + page.cuts.length, 0)
      : 0,
    previewCutCount: previewCuts.length,
    selectedCutId: effectiveSelectedCutId,
    pdfFile,
    imageFiles,
    effectiveSettings,
    effectiveTemplate,
    isLoadedProjectActive,
    canUndoHistory,
    canRedoHistory,
    activeHistoryIndex,
    activeHistoryLength,
    selectedLogicalPageId,
    pdfjsVersion: (pdfjs as { version?: string }).version,
    pdfWorkerSrc: pdfjs.GlobalWorkerOptions.workerSrc,
  });
  const {
    onPdfLoaded,
    onFolderLoaded,
    onFileDropped,
    handleExportPdf,
    handleExportImages,
  } = useWorkspaceFileActions({
    docType,
    pdfFile,
    imageFiles,
    effectiveExportCuts,
    effectiveExportSettings,
    isLoadedProjectActive,
    canApplyLoadedProject,
    loadPdf,
    loadImages,
    onDrop: dragHandlers.onDrop,
    setIsExporting,
    logDebug,
  });

  useKeyboardShortcuts({
    onUndo: handleUndoAction,
    onRedo: handleRedoAction,
    onPageNext: () => setCurrentPage((page) => page + 1),
    onPagePrev: () => setCurrentPage((page) => page - 1),
    onRowSnap: handleRowSnap,
  });

  return useAppShellProps({
    header: {
      docType,
      mode,
      setMode,
      isExporting,
      canUndo: canUndoHistory,
      canRedo: canRedoHistory,
      onUndo: handleUndoAction,
      onRedo: handleRedoAction,
      onPdfFileChange: onPdfLoaded,
      onFolderChange: onFolderLoaded,
      onProjectFileChange: loadedProjectManager.onProjectLoaded,
      onSaveProject: loadedProjectManager.handleSaveProject,
      onExportPdf: handleExportPdf,
      onExportImages: handleExportImages,
      onOpenDebug: openDebug,
      showDebug: debugEnabled,
    },
    preview: {
      docType,
      pdfFile,
      currentImageUrl,
      numPages,
      setNumPages,
      currentPage,
      setCurrentPage,
      scale,
      setScale,
      isDragging,
      dragHandlers,
      onFileDropped,
      cuts: previewCuts,
      selectedCutId: effectiveSelectedCutId,
      setSelectedCutId: activeCutEditor.selectCut,
      deleteCut: activeCutEditor.deleteCut,
      updateCutPosition: activeCutEditor.updateCutPosition,
      handleCutDragEnd: activeCutEditor.commitCutDrag,
      mode,
      template: effectiveTemplate,
      setTemplate: setEffectiveTemplate,
      setTemplateLive: setEffectiveTemplateLive,
      onTemplateInteractionStart: handleProjectDraftInteractionStart,
      onTemplateInteractionEnd: handleProjectDraftInteractionEnd,
      settings: effectiveSettings,
      onContentClick: activeCutEditor.createCutAt,
      onPdfPageLoadSuccess: applyPdfDefaultFontSize,
      logDebug,
      isLoadedProjectActive,
    },
    sidebar: {
      mode,
      setMode,
      pdfFile: pdfFile || (imageFiles.length > 0 ? imageFiles[0] : null),
      selectedCutId: effectiveSelectedCutId,
      projectPanelProps: loadedProjectManager.projectPanelProps,
      templates,
      template: effectiveTemplate,
      setTemplate: setEffectiveTemplate,
      changeTemplate: handleTemplateChange,
      saveTemplateByName: handleSaveTemplate,
      deleteTemplate: handleDeleteTemplate,
      distributeRows: handleDistributeRows,
      onRowSnap: handleRowSnap,
      settings: effectiveSettings,
      setSettings: setEffectiveSettings,
      setLiveSettings: setEffectiveSettingsLive,
      onLiveSettingsStart: handleProjectDraftInteractionStart,
      onLiveSettingsEnd: handleProjectDraftInteractionEnd,
      setNumberingState: activeCutEditor.setNumberingState,
      onRenumberFromSelected: activeCutEditor.renumberFromSelected,
      isLoadedProjectActive,
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
