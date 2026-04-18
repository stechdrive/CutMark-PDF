
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';

import { NumberingState } from './types';
import {
  createAssetHintsFromCurrentDocument,
} from './adapters/legacyProjectAdapter';
import {
  ProjectDocument,
} from './domain/project';

// Hooks
import { useDocumentViewer } from './hooks/useDocumentViewer';
import { useTemplates } from './hooks/useTemplates';
import { useAppSettings } from './hooks/useAppSettings';
import { useDebugLogger } from './hooks/useDebugLogger';
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

const DEFAULT_IMAGE_FONT_SIZE = 28;
const IMAGE_A4_WIDTH_AT_150_DPI = 1240.5; // 8.27inch * 150dpi
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 72;

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

  const resetLegacyCutEditorRef = useRef<() => void>(() => {});
  const handleDocumentReset = useCallback(() => {
    resetLegacyCutEditorRef.current();
  }, []);

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
  const pdfFontSizeAppliedRef = useRef(false);
  const pdfAutoFontSizeRef = useRef<number | null>(null);
  const {
    debugEnabled,
    debugLogs,
    logDebug,
  } = useDebugLogger();

  useEffect(() => {
    pdfFontSizeAppliedRef.current = false;
  }, [pdfFile]);

  const currentAssetHints = useMemo(() => {
    if (!docType) return [];

    const pageCount = docType === 'images' ? imageFiles.length : numPages;
    if (pageCount < 1) return [];

    return createAssetHintsFromCurrentDocument({
      docType,
      pdfFile,
      imageFiles,
      pageCount,
    });
  }, [docType, imageFiles, numPages, pdfFile]);

  const currentProjectName = useMemo(() => {
    if (docType === 'pdf') {
      return pdfFile?.name;
    }
    if (docType === 'images') {
      return imageFiles[0]?.webkitRelativePath.split('/')[0] || imageFiles[0]?.name;
    }
    return undefined;
  }, [docType, imageFiles, pdfFile]);

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
    resetLegacyCutEditorRef.current = resetCurrentProject;
  }, [resetCurrentProject]);
  useEffect(() => {
    if (isLoadedProjectActive) return;
    if (docType !== 'images') return;
    if (pdfAutoFontSizeRef.current !== null && settings.fontSize === pdfAutoFontSizeRef.current) {
      setSettings(prev => ({
        ...prev,
        fontSize: DEFAULT_IMAGE_FONT_SIZE,
      }));
    }
    pdfAutoFontSizeRef.current = null;
  }, [docType, isLoadedProjectActive, settings.fontSize, setSettings]);
  const effectiveSelectedCutId = activeCutEditor.selectedCutId;
  const canUndoHistory = activeCutEditor.canUndo;
  const canRedoHistory = activeCutEditor.canRedo;
  const activeHistoryIndex = activeCutEditor.historyIndex;
  const activeHistoryLength = activeCutEditor.historyLength;
  const handleUndoAction = activeCutEditor.undo;
  const handleRedoAction = activeCutEditor.redo;

  // Row Snap (Keyboard 1-9 or Button)
  const handleRowSnap = (rowIndex: number) => {
    if (rowIndex >= effectiveTemplate.rowPositions.length) return;
    const y = effectiveTemplate.rowPositions[rowIndex];
    const x = effectiveTemplate.xPosition;
    activeCutEditor.createCutAt(x, y);
  };

  const applyPdfDefaultFontSize = useCallback((page: { originalWidth: number }) => {
    if (isLoadedProjectActive) return;
    if (docType !== 'pdf') return;
    if (pdfFontSizeAppliedRef.current) return;
    if (settings.fontSize !== DEFAULT_IMAGE_FONT_SIZE) return;

    const ratio = DEFAULT_IMAGE_FONT_SIZE / IMAGE_A4_WIDTH_AT_150_DPI;
    const proposed = Math.round(page.originalWidth * ratio);
    const nextFontSize = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, proposed));

    pdfFontSizeAppliedRef.current = true;
    pdfAutoFontSizeRef.current = nextFontSize;
    if (nextFontSize !== settings.fontSize) {
      setSettings(prev => ({
        ...prev,
        fontSize: nextFontSize,
      }));
    }
  }, [docType, isLoadedProjectActive, settings.fontSize, setSettings]);

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
