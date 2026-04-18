import { useEditorSessions } from './useEditorSessions';
import { UseEditorWorkspaceOptions } from './editorWorkspaceTypes';
import { useEditorWorkspaceControls } from './useEditorWorkspaceControls';
import { useEditorWorkspaceState } from './useEditorWorkspaceState';

export const useEditorWorkspace = ({
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
  templateApi,
  setMode,
  logDebug,
}: UseEditorWorkspaceOptions) => {
  const sessions = useEditorSessions({
    docType,
    currentPage,
    numPages,
    currentAssetHints,
    currentProjectName,
    settings,
    numberingState,
    setNumberingState,
    template: templateApi.template,
  });

  const workspaceState = useEditorWorkspaceState({
    currentProjectSession: sessions.currentProjectSession,
    loadedProjectSession: sessions.loadedProjectSession,
    settings,
    loadedProject: sessions.loadedProject,
    setSettings,
    docType,
    currentPage,
    setCurrentPage,
    currentAssetHints,
    templateApi,
  });

  const controls = useEditorWorkspaceControls({
    sessions,
    workspaceState,
    docType,
    currentPage,
    numPages,
    currentAssetHints,
    templateApi,
    setMode,
    logDebug,
  });

  return {
    resetCurrentProject: sessions.currentProjectSession.resetProject,
    isLoadedProjectActive: sessions.isLoadedProjectActive,
    selectedLogicalPageId: sessions.loadedProjectSession.workspaceSession.selectedLogicalPageId,
    selectedLogicalPageNumber: sessions.loadedProjectSession.workspaceSession.selectedLogicalPageNumber,
    selectedAssetIndex: sessions.loadedProjectSession.workspaceSession.selectedAssetIndex,
    effectiveSettings: workspaceState.effectiveSettings,
    effectiveTemplate: workspaceState.effectiveTemplate,
    setEffectiveSettings: workspaceState.setEffectiveSettings,
    setEffectiveSettingsLive: workspaceState.setEffectiveSettingsLive,
    setEffectiveTemplate: workspaceState.setEffectiveTemplate,
    setEffectiveTemplateLive: workspaceState.setEffectiveTemplateLive,
    handleTemplateChange: workspaceState.handleTemplateChange,
    handleSaveTemplate: workspaceState.handleSaveTemplate,
    handleDeleteTemplate: workspaceState.handleDeleteTemplate,
    handleDistributeRows: workspaceState.handleDistributeRows,
    handleProjectDraftInteractionStart: workspaceState.handleProjectDraftInteractionStart,
    handleProjectDraftInteractionEnd: workspaceState.handleProjectDraftInteractionEnd,
    activeProject: workspaceState.workspace.activeProject,
    previewCuts: workspaceState.workspace.previewCuts,
    effectiveExportCuts: workspaceState.workspace.effectiveExportCuts,
    effectiveExportSettings: workspaceState.workspace.effectiveExportSettings,
    canApplyLoadedProject: workspaceState.workspace.canApplyLoadedProject,
    projectStatusMessage: workspaceState.workspace.projectStatusMessage,
    loadedProjectManager: controls.loadedProjectManager,
    activeCutEditor: controls.activeCutEditor,
  };
};
