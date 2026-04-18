
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { pdfjs } from 'react-pdf';

import { NumberingState } from './types';
import {
  ProjectDocument,
} from './domain/project';

// Hooks
import { useCurrentDocumentMetadata } from './hooks/useCurrentDocumentMetadata';
import { useDocumentViewer } from './hooks/useDocumentViewer';
import { useTemplates } from './hooks/useTemplates';
import { useAppSettings } from './hooks/useAppSettings';
import { useDebugLogger } from './hooks/useDebugLogger';
import { useDocumentResetController } from './hooks/useDocumentResetController';
import { useEditorCanvasBehavior } from './hooks/useEditorCanvasBehavior';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDebugPanel } from './hooks/useDebugPanel';
import { useEditorWorkspace } from './hooks/useEditorWorkspace';
import { useAppShellProps } from './hooks/useAppShellProps';
import { useWorkspaceFileActions } from './hooks/useWorkspaceFileActions';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DocumentPreview } from './components/DocumentPreview';
import { ExportOverlay } from './components/ExportOverlay';
import { DebugModal } from './components/DebugModal';

// Worker setup: GH-Pages でもローカルのワーカーを利用する
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const countProjectCuts = (project: ProjectDocument) =>
  project.logicalPages.reduce((count, page) => count + page.cuts.length, 0);

export default function App() {
  // --- Hooks ---
  const {
    settings, setSettings
  } = useAppSettings();

  const setNumberingState = useCallback((next: NumberingState) => {
    setSettings(prev => ({
      ...prev,
      nextNumber: next.nextNumber,
      branchChar: next.branchChar,
    }));
  }, [setSettings]);

  const numberingState = useMemo(() => ({
    nextNumber: settings.nextNumber,
    branchChar: settings.branchChar,
  }), [settings.nextNumber, settings.branchChar]);

  const {
    handleDocumentReset,
    setResetHandler,
  } = useDocumentResetController();

  const {
    docType, pdfFile, imageFiles, currentImageUrl,
    numPages, currentPage, scale, isDragging,
    loadPdf, loadImages,
    setNumPages, setCurrentPage, setScale, dragHandlers
  } = useDocumentViewer(handleDocumentReset);

  const {
    templates, template, setTemplate, changeTemplate,
    saveTemplateByName, saveTemplateDraftByName, deleteTemplate, deleteTemplateById, distributeRows, upsertTemplate
  } = useTemplates();

  // --- UI State ---
  const [mode, setMode] = useState<'edit' | 'template'>('edit');
  const [isExporting, setIsExporting] = useState(false);
  const {
    debugEnabled,
    debugLogs,
    logDebug,
  } = useDebugLogger();
  const {
    currentAssetHints,
    currentProjectName,
  } = useCurrentDocumentMetadata({
    docType,
    pdfFile,
    imageFiles,
    numPages,
  });

  const {
    resetCurrentProject,
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
  } = useEditorWorkspace({
    docType,
    currentPage,
    setCurrentPage,
    numPages,
    currentAssetHints,
    currentProjectName,
    settings,
    setSettings,
    numberingState,
    setNumberingState,
    templateApi: {
      templates,
      template,
      setTemplate,
      changeTemplate,
      saveTemplateByName,
      saveTemplateDraftByName,
      deleteTemplate,
      deleteTemplateById,
      distributeRows,
      upsertTemplate,
    },
    setMode,
    logDebug,
  });

  useEffect(() => {
    setResetHandler(resetCurrentProject);
  }, [resetCurrentProject, setResetHandler]);
  const effectiveSelectedCutId = activeCutEditor.selectedCutId;
  const canUndoHistory = activeCutEditor.canUndo;
  const canRedoHistory = activeCutEditor.canRedo;
  const activeHistoryIndex = activeCutEditor.historyIndex;
  const activeHistoryLength = activeCutEditor.historyLength;
  const handleUndoAction = activeCutEditor.undo;
  const handleRedoAction = activeCutEditor.redo;

  const {
    handleRowSnap,
    applyPdfDefaultFontSize,
  } = useEditorCanvasBehavior({
    docType,
    pdfFile,
    settings,
    setSettings,
    template: effectiveTemplate,
    isLoadedProjectActive,
    createCutAt: activeCutEditor.createCutAt,
  });

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
    activeProjectCutCount: activeProject ? countProjectCuts(activeProject) : 0,
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

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    onUndo: handleUndoAction,
    onRedo: handleRedoAction,
    onPageNext: () => setCurrentPage(p => p + 1),
    onPagePrev: () => setCurrentPage(p => p - 1),
    onRowSnap: handleRowSnap
  });
  const {
    headerProps,
    documentPreviewProps,
    sidebarProps,
    debugModalProps,
    exportOverlayProps,
  } = useAppShellProps({
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

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 font-sans overflow-hidden">
      <Header {...headerProps} />

      <div className="flex flex-1 overflow-hidden relative">
        <ExportOverlay {...exportOverlayProps} />
        <DocumentPreview {...documentPreviewProps} />
        <Sidebar {...sidebarProps} />
      </div>

      <DebugModal {...debugModalProps} />
    </div>
  );
}
