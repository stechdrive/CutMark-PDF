import { useEffect } from 'react';
import { useEditorCanvasBehavior } from './useEditorCanvasBehavior';
import { useEditorWorkspace } from './useEditorWorkspace';
import type { AppDocumentControllerState } from './useAppDocumentController';

type DebugLogData = unknown | (() => unknown);

interface UseAppEditorControllerOptions {
  documentState: AppDocumentControllerState;
  setMode: (mode: 'edit' | 'template') => void;
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

export const useAppEditorController = ({
  documentState,
  setMode,
  logDebug,
}: UseAppEditorControllerOptions) => {
  const { setResetHandler } = documentState;
  const editorWorkspace = useEditorWorkspace({
    docType: documentState.docType,
    currentPage: documentState.currentPage,
    setCurrentPage: documentState.setCurrentPage,
    numPages: documentState.numPages,
    currentAssetHints: documentState.currentAssetHints,
    currentProjectName: documentState.currentProjectName,
    settings: documentState.settings,
    setSettings: documentState.setSettings,
    numberingState: documentState.numberingState,
    setNumberingState: documentState.setNumberingState,
    templateApi: {
      templates: documentState.templates,
      template: documentState.template,
      setTemplate: documentState.setTemplate,
      changeTemplate: documentState.changeTemplate,
      saveTemplateByName: documentState.saveTemplateByName,
      saveTemplateDraftByName: documentState.saveTemplateDraftByName,
      deleteTemplate: documentState.deleteTemplate,
      deleteTemplateById: documentState.deleteTemplateById,
      distributeRows: documentState.distributeRows,
      upsertTemplate: documentState.upsertTemplate,
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
    docType: documentState.docType,
    pdfFile: documentState.pdfFile,
    settings: documentState.settings,
    setSettings: documentState.setSettings,
    template: editorWorkspace.effectiveTemplate,
    isLoadedProjectActive: editorWorkspace.isLoadedProjectActive,
    createCutAt: editorWorkspace.activeCutEditor.createCutAt,
  });

  return {
    ...editorWorkspace,
    handleRowSnap,
    applyPdfDefaultFontSize,
  };
};

export type AppEditorControllerState = ReturnType<typeof useAppEditorController>;
