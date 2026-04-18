import { ProjectAssetBindings } from '../application/projectBindings';
import { useActiveCutEditor } from './useActiveCutEditor';
import { EditorWorkspaceTemplateApi, UseEditorWorkspaceOptions } from './editorWorkspaceTypes';
import { useEditorSessions } from './useEditorSessions';
import { useEditorWorkspaceState } from './useEditorWorkspaceState';
import { useLoadedProjectManager } from './useLoadedProjectManager';

interface UseEditorWorkspaceControlsOptions {
  sessions: ReturnType<typeof useEditorSessions>;
  workspaceState: ReturnType<typeof useEditorWorkspaceState>;
  docType: UseEditorWorkspaceOptions['docType'];
  currentPage: UseEditorWorkspaceOptions['currentPage'];
  numPages: UseEditorWorkspaceOptions['numPages'];
  currentAssetHints: UseEditorWorkspaceOptions['currentAssetHints'];
  templateApi: EditorWorkspaceTemplateApi;
  setMode: UseEditorWorkspaceOptions['setMode'];
  logDebug: UseEditorWorkspaceOptions['logDebug'];
}

export const useEditorWorkspaceControls = ({
  sessions,
  workspaceState,
  docType,
  currentPage,
  numPages,
  currentAssetHints,
  templateApi,
  setMode,
  logDebug,
}: UseEditorWorkspaceControlsOptions) => {
  const loadedProjectManager = useLoadedProjectManager({
    loadedProjectSession: sessions.loadedProjectSession,
    docType,
    numPages,
    currentPage,
    currentAssetHints,
    currentProject: sessions.currentProjectSession.project,
    currentProjectBindings: workspaceState.workspace.activeProjectBindings as ProjectAssetBindings,
    canApplyLoadedProject: workspaceState.workspace.canApplyLoadedProject,
    onSelectContePage: workspaceState.workspace.focusContePage,
    resolveProjectDocumentForCurrentState: workspaceState.workspace.resolveProjectDocumentForCurrentState,
    upsertTemplate: templateApi.upsertTemplate,
    setMode,
    logDebug,
  });

  const activeCutEditor = useActiveCutEditor({
    editor: sessions.isLoadedProjectActive
      ? sessions.loadedProjectSession.projectCutEditorApi
      : sessions.currentProjectSession.projectCutEditorApi,
  });

  return {
    loadedProjectManager,
    activeCutEditor,
  };
};
