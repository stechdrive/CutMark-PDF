import { Dispatch, SetStateAction } from 'react';
import { ProjectAssetBindings } from '../application/projectBindings';
import { AssetHint, TemplateSnapshot } from '../domain/project';
import { AppSettings, DocType, NumberingState, Template } from '../types';
import { useActiveCutEditor } from './useActiveCutEditor';
import { useLoadedProjectManager } from './useLoadedProjectManager';
import { useEditorSessions } from './useEditorSessions';
import { useProjectWorkspace } from './useProjectWorkspace';
import { useWorkspacePresentation } from './useWorkspacePresentation';

type DebugLogData = unknown | (() => unknown);

interface EditorWorkspaceTemplateApi {
  templates: Template[];
  template: Template;
  setTemplate: (next: SetStateAction<Template>) => void;
  changeTemplate: (id: string) => void;
  saveTemplateByName: (name: string) => void;
  saveTemplateDraftByName: (template: Template, name: string) => Template | null;
  deleteTemplate: () => void;
  deleteTemplateById: (id: string) => Template | null;
  distributeRows: () => void;
  upsertTemplate: (template: TemplateSnapshot) => void;
}

interface UseEditorWorkspaceOptions {
  docType: DocType | null;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  numPages: number;
  currentAssetHints: Array<AssetHint | null | undefined>;
  currentProjectName?: string;
  settings: AppSettings;
  setSettings: (next: SetStateAction<AppSettings>) => void;
  numberingState: NumberingState;
  setNumberingState: (next: NumberingState) => void;
  templateApi: EditorWorkspaceTemplateApi;
  setMode: (mode: 'edit' | 'template') => void;
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

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
  const {
    currentProjectSession,
    loadedProjectSession,
    loadedProject,
    isLoadedProjectActive,
  } = useEditorSessions({
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

  const {
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
  } = useWorkspacePresentation({
    loadedProject,
    settings,
    setSettings,
    setCurrentNumberingStateWithHistory: currentProjectSession.setNumberingStateWithHistory,
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
    effectiveSettings,
    effectiveTemplate,
    fallbackSettings: settings,
    loadedSession: loadedProjectSession.workspaceSession,
    currentSession: currentProjectSession.workspaceSession,
  });

  const loadedProjectManager = useLoadedProjectManager({
    loadedProjectSession,
    docType,
    numPages,
    currentAssetHints,
    currentProject: currentProjectSession.project,
    currentProjectBindings: workspace.activeProjectBindings as ProjectAssetBindings,
    comparison: workspace.projectComparison,
    statusMessage: workspace.projectStatusMessage,
    canApplyLoadedProject: workspace.canApplyLoadedProject,
    resolveProjectDocumentForCurrentState: workspace.resolveProjectDocumentForCurrentState,
    upsertTemplate: templateApi.upsertTemplate,
    setMode,
    logDebug,
  });

  const activeCutEditor = useActiveCutEditor({
    editor: isLoadedProjectActive
      ? loadedProjectSession.projectCutEditorApi
      : currentProjectSession.projectCutEditorApi,
  });

  return {
    resetCurrentProject: currentProjectSession.resetCuts,
    isLoadedProjectActive,
    selectedLogicalPageId: loadedProjectSession.workspaceSession.selectedLogicalPageId,
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
    activeProject: workspace.activeProject,
    previewCuts: workspace.previewCuts,
    effectiveExportCuts: workspace.effectiveExportCuts,
    effectiveExportSettings: workspace.effectiveExportSettings,
    canApplyLoadedProject: workspace.canApplyLoadedProject,
    loadedProjectManager,
    activeCutEditor,
  };
};
