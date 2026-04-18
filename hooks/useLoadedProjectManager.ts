import { useCallback, useMemo, useState } from 'react';
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
  currentPage: number;
  currentAssetHints: Array<AssetHint | null | undefined>;
  currentProject: ProjectDocument | null;
  currentProjectBindings: ProjectAssetBindings;
  canApplyLoadedProject: boolean;
  onSelectContePage: (assetIndex: number, logicalPageId: string | null) => void;
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
  currentPage,
  currentAssetHints,
  currentProject,
  currentProjectBindings,
  canApplyLoadedProject,
  onSelectContePage,
  resolveProjectDocumentForCurrentState,
  upsertTemplate,
  setMode,
  logDebug,
}: UseLoadedProjectManagerOptions) => {
  const [lastAppliedSignature, setLastAppliedSignature] = useState<string | null>(null);

  const resolvedLoadedProject = useMemo(
    () =>
      loadedProjectSession.project
        ? resolveProjectDocumentForCurrentState(
            loadedProjectSession.project,
            loadedProjectSession.bindings
          )
        : null,
    [loadedProjectSession.bindings, loadedProjectSession.project, resolveProjectDocumentForCurrentState]
  );

  const currentApplySignature = useMemo(
    () =>
      resolvedLoadedProject
        ? JSON.stringify({
            project: resolvedLoadedProject,
            bindings: loadedProjectSession.bindings,
          })
        : null,
    [loadedProjectSession.bindings, resolvedLoadedProject]
  );

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

  const canApplyProject =
    canApplyLoadedProject &&
    currentApplySignature != null &&
    currentApplySignature !== lastAppliedSignature;

  const handleApplyProject = useCallback(() => {
    if (!canApplyProject || !currentApplySignature) {
      return;
    }

    handleApplyLoadedProject();
    setLastAppliedSignature(currentApplySignature);
  }, [canApplyProject, currentApplySignature, handleApplyLoadedProject]);

  const { projectOrganizerProps } = useLoadedProjectOrganizer({
    loadedProjectSession,
    currentAssets: currentAssetHints,
    currentContePage: currentPage,
    canApplyProject,
    onSelectContePage,
    onApplyProject: handleApplyProject,
  });

  return {
    projectOrganizerProps,
    handleSaveProject,
    loadProjectFile,
    onProjectLoaded,
  };
};
