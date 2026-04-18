import { useCallback, useMemo } from 'react';
import { createProjectConteOrganizerSummary } from '../application/projectOrganizer';
import { AssetHint } from '../domain/project';
import { ProjectOrganizerPanelProps } from '../components/ProjectOrganizerPanel';
import { UseLoadedProjectSessionResult } from './useLoadedProjectSession';

interface UseLoadedProjectOrganizerOptions {
  loadedProjectSession: UseLoadedProjectSessionResult;
  currentAssets: Array<AssetHint | null | undefined>;
  canApplyProject: boolean;
  onApplyProject: () => void;
}

export const useLoadedProjectOrganizer = ({
  loadedProjectSession,
  currentAssets,
  canApplyProject,
  onApplyProject,
}: UseLoadedProjectOrganizerOptions) => {
  const onSelectLogicalPage = useCallback((logicalPageId: string) => {
    loadedProjectSession.selectLogicalPage(logicalPageId);
  }, [loadedProjectSession]);

  const onInsertBlankPageAtAsset = useCallback((assetIndex: number) => {
    loadedProjectSession.insertBlankPageAtAsset(assetIndex);
  }, [loadedProjectSession]);

  const onRemoveLogicalPageFromConte = useCallback((logicalPageId: string) => {
    loadedProjectSession.removePageFromConte(logicalPageId);
  }, [loadedProjectSession]);

  const onMoveLogicalPageToAsset = useCallback((logicalPageId: string, assetIndex: number) => {
    loadedProjectSession.movePageToAsset(logicalPageId, assetIndex);
  }, [loadedProjectSession]);

  const onResetBindings = useCallback(() => {
    loadedProjectSession.resetBindings();
  }, [loadedProjectSession]);

  const projectOrganizerProps = useMemo<ProjectOrganizerPanelProps | null>(() => {
    if (!loadedProjectSession.project) {
      return null;
    }

    return {
      projectName: loadedProjectSession.project.meta.name,
      savedAt: loadedProjectSession.project.meta.savedAt,
      selectedLogicalPageId: loadedProjectSession.workspaceSession.selectedLogicalPageId,
      organizer: createProjectConteOrganizerSummary(
        loadedProjectSession.project.logicalPages,
        loadedProjectSession.bindings,
        currentAssets,
        loadedProjectSession.workspaceSession.selectedLogicalPageId
      ),
      canApplyProject,
      canResetBindings: currentAssets.length > 0,
      canUndoDraft: loadedProjectSession.projectCutEditorApi.canUndo,
      canRedoDraft: loadedProjectSession.projectCutEditorApi.canRedo,
      onSelectLogicalPage,
      onInsertBlankPageAtAsset,
      onRemoveLogicalPageFromConte,
      onMoveLogicalPageToAsset,
      onResetBindings,
      onUndoDraft: loadedProjectSession.undoDraft,
      onRedoDraft: loadedProjectSession.redoDraft,
      onApplyProject,
    };
  }, [
    canApplyProject,
    currentAssets,
    loadedProjectSession,
    onApplyProject,
    onInsertBlankPageAtAsset,
    onMoveLogicalPageToAsset,
    onRemoveLogicalPageFromConte,
    onResetBindings,
    onSelectLogicalPage,
  ]);

  return {
    projectOrganizerProps,
  };
};
