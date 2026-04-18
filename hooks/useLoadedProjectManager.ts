import { ProjectAssetBindings } from '../application/projectBindings';
import { AssetHint, ProjectDocument, TemplateSnapshot } from '../domain/project';
import { DocType } from '../types';
import { useLoadedProjectOrganizer } from './useLoadedProjectOrganizer';
import { UseLoadedProjectSessionResult } from './useLoadedProjectSession';
import { useProjectLifecycle } from './useProjectLifecycle';

type DebugLogData = unknown | (() => unknown);

interface UseLoadedProjectManagerOptions {
  loadedProjectSession: UseLoadedProjectSessionResult;
  docType: DocType | null;
  numPages: number;
  currentAssetHints: Array<AssetHint | null | undefined>;
  currentProject: ProjectDocument | null;
  currentProjectBindings: ProjectAssetBindings;
  canApplyLoadedProject: boolean;
  resolveProjectDocumentForCurrentState: (
    project: ProjectDocument,
    bindings: ProjectAssetBindings,
    options?: { touchSavedAt?: boolean }
  ) => ProjectDocument;
  upsertTemplate: (template: TemplateSnapshot) => void;
  setMode: (mode: 'edit' | 'template') => void;
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

export const useLoadedProjectManager = ({
  loadedProjectSession,
  docType,
  numPages,
  currentAssetHints,
  currentProject,
  currentProjectBindings,
  canApplyLoadedProject,
  resolveProjectDocumentForCurrentState,
  upsertTemplate,
  setMode,
  logDebug,
}: UseLoadedProjectManagerOptions) => {
  const {
    handleApplyLoadedProject,
    handleSaveProject,
    loadProjectFile,
    onProjectLoaded,
  } = useProjectLifecycle({
    docType,
    numPages,
    currentAssetHints,
    loadedProject: loadedProjectSession.project,
    projectBindings: loadedProjectSession.bindings,
    currentProject,
    currentProjectBindings,
    canApplyLoadedProject,
    resolveProjectDocumentForCurrentState,
    loadProjectIntoEditor: loadedProjectSession.loadProject,
    replaceEditorProject: loadedProjectSession.replaceProject,
    upsertTemplate,
    setMode,
    logDebug,
  });

  const { projectOrganizerProps } = useLoadedProjectOrganizer({
    loadedProjectSession,
    currentAssets: currentAssetHints,
    canApplyProject: canApplyLoadedProject,
    onApplyProject: handleApplyLoadedProject,
  });

  return {
    projectOrganizerProps,
    handleSaveProject,
    loadProjectFile,
    onProjectLoaded,
  };
};
