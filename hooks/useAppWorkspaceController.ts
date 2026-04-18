import { useCallback, useEffect, useMemo, useState } from 'react';
import { NumberingState } from '../types';
import { useCurrentDocumentMetadata } from './useCurrentDocumentMetadata';
import { useDocumentViewer } from './useDocumentViewer';
import { useTemplates } from './useTemplates';
import { useAppSettings } from './useAppSettings';
import { useDocumentResetController } from './useDocumentResetController';
import { useEditorCanvasBehavior } from './useEditorCanvasBehavior';
import { useEditorWorkspace } from './useEditorWorkspace';

type DebugLogData = unknown | (() => unknown);

interface UseAppWorkspaceControllerOptions {
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

export const useAppWorkspaceController = ({
  logDebug,
}: UseAppWorkspaceControllerOptions) => {
  const { settings, setSettings } = useAppSettings();

  const setNumberingState = useCallback((next: NumberingState) => {
    setSettings((prev) => ({
      ...prev,
      nextNumber: next.nextNumber,
      branchChar: next.branchChar,
    }));
  }, [setSettings]);

  const numberingState = useMemo(() => ({
    nextNumber: settings.nextNumber,
    branchChar: settings.branchChar,
  }), [settings.branchChar, settings.nextNumber]);

  const {
    handleDocumentReset,
    setResetHandler,
  } = useDocumentResetController();
  const {
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
  } = useDocumentViewer(handleDocumentReset);
  const {
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
  } = useTemplates();

  const [mode, setMode] = useState<'edit' | 'template'>('edit');

  const {
    currentAssetHints,
    currentProjectName,
  } = useCurrentDocumentMetadata({
    docType,
    pdfFile,
    imageFiles,
    numPages,
  });

  const editorWorkspace = useEditorWorkspace({
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
    setResetHandler(editorWorkspace.resetCurrentProject);
  }, [editorWorkspace.resetCurrentProject, setResetHandler]);

  const {
    handleRowSnap,
    applyPdfDefaultFontSize,
  } = useEditorCanvasBehavior({
    docType,
    pdfFile,
    settings,
    setSettings,
    template: editorWorkspace.effectiveTemplate,
    isLoadedProjectActive: editorWorkspace.isLoadedProjectActive,
    createCutAt: editorWorkspace.activeCutEditor.createCutAt,
  });

  return {
    mode,
    setMode,
    settings,
    setSettings,
    numberingState,
    setNumberingState,
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
    template,
    currentAssetHints,
    currentProjectName,
    ...editorWorkspace,
    handleRowSnap,
    applyPdfDefaultFontSize,
  };
};
