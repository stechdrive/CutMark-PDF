import { useEffect, useState } from 'react';
import { useAppDocumentController } from './useAppDocumentController';
import { useEditorCanvasBehavior } from './useEditorCanvasBehavior';
import { useEditorWorkspace } from './useEditorWorkspace';

type DebugLogData = unknown | (() => unknown);

interface UseAppWorkspaceControllerOptions {
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

export const useAppWorkspaceController = ({
  logDebug,
}: UseAppWorkspaceControllerOptions) => {
  const [mode, setMode] = useState<'edit' | 'template'>('edit');
  const {
    setResetHandler,
    ...documentState
  } = useAppDocumentController();

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
    mode,
    setMode,
    ...documentState,
    ...editorWorkspace,
    handleRowSnap,
    applyPdfDefaultFontSize,
  };
};

export type AppWorkspaceControllerState = ReturnType<typeof useAppWorkspaceController>;
