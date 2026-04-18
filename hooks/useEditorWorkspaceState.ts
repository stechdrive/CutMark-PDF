import { SetStateAction } from 'react';
import { ProjectDocument } from '../domain/project';
import { AppSettings } from '../types';
import { useCurrentProjectSession } from './useCurrentProjectSession';
import { useLoadedProjectSession } from './useLoadedProjectSession';
import { useProjectWorkspace } from './useProjectWorkspace';
import { useWorkspacePresentation } from './useWorkspacePresentation';
import { EditorWorkspaceTemplateApi } from './editorWorkspaceTypes';

interface UseEditorWorkspaceStateOptions {
  currentProjectSession: ReturnType<typeof useCurrentProjectSession>;
  loadedProjectSession: ReturnType<typeof useLoadedProjectSession>;
  loadedProject: ProjectDocument | null;
  docType: Parameters<typeof useProjectWorkspace>[0]['docType'];
  currentPage: Parameters<typeof useProjectWorkspace>[0]['currentPage'];
  setCurrentPage: Parameters<typeof useProjectWorkspace>[0]['setCurrentPage'];
  currentAssetHints: Parameters<typeof useProjectWorkspace>[0]['currentAssetHints'];
  settings: AppSettings;
  setSettings: (next: SetStateAction<AppSettings>) => void;
  templateApi: EditorWorkspaceTemplateApi;
}

export const useEditorWorkspaceState = ({
  currentProjectSession,
  loadedProjectSession,
  loadedProject,
  docType,
  currentPage,
  setCurrentPage,
  currentAssetHints,
  settings,
  setSettings,
  templateApi,
}: UseEditorWorkspaceStateOptions) => {
  const presentation = useWorkspacePresentation({
    loadedProject,
    settings,
    setSettings,
    setCurrentNumberingStateWithHistory: currentProjectSession.setProjectNumberingState,
    templateApi: {
      templates: templateApi.templates,
      template: templateApi.template,
      setTemplate: templateApi.setTemplate,
      changeTemplate: templateApi.changeTemplate,
      saveTemplateByName: templateApi.saveTemplateByName,
      saveTemplateDraftByName: templateApi.saveTemplateDraftByName,
      deleteTemplate: templateApi.deleteTemplate,
      deleteTemplateById: templateApi.deleteTemplateById,
      distributeRows: templateApi.distributeRows,
    },
    projectDraftApi: loadedProjectSession.projectDraftApi,
  });

  const workspace = useProjectWorkspace({
    docType,
    currentPage,
    setCurrentPage,
    currentAssetHints,
    effectiveSettings: presentation.effectiveSettings,
    effectiveTemplate: presentation.effectiveTemplate,
    fallbackSettings: settings,
    loadedSession: loadedProjectSession.workspaceSession,
    currentSession: currentProjectSession.workspaceSession,
  });

  return {
    ...presentation,
    workspace,
  };
};
