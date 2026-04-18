import { useCallback, useMemo } from 'react';
import { ProjectAssetComparisonSummary } from '../application/projectComparison';
import { AssetHint } from '../domain/project';
import { SidebarProjectPanelProps } from '../components/SidebarProjectPanel';
import { UseLoadedProjectSessionResult } from './useLoadedProjectSession';

interface UseLoadedProjectPanelOptions {
  loadedProjectSession: UseLoadedProjectSessionResult;
  comparison: ProjectAssetComparisonSummary | null;
  statusMessage: string | null;
  currentAssets: Array<AssetHint | null | undefined>;
  canApplyProject: boolean;
  onApplyProject: () => void;
}

export const useLoadedProjectPanel = ({
  loadedProjectSession,
  comparison,
  statusMessage,
  currentAssets,
  canApplyProject,
  onApplyProject,
}: UseLoadedProjectPanelOptions) => {
  const onBindingChange = useCallback((logicalPageId: string, nextAssetIndex: number | null) => {
    loadedProjectSession.assignAsset(logicalPageId, nextAssetIndex);
  }, [loadedProjectSession]);

  const onSelectLogicalPage = useCallback((logicalPageId: string) => {
    loadedProjectSession.selectLogicalPage(logicalPageId);
  }, [loadedProjectSession]);

  const onInsertLogicalPageAfter = useCallback((logicalPageId: string) => {
    loadedProjectSession.insertPageAfter(logicalPageId);
  }, [loadedProjectSession]);

  const onRemoveLogicalPage = useCallback((logicalPageId: string) => {
    loadedProjectSession.removePage(logicalPageId);
  }, [loadedProjectSession]);

  const onMoveLogicalPage = useCallback((logicalPageId: string, direction: -1 | 1) => {
    loadedProjectSession.movePage(logicalPageId, direction);
  }, [loadedProjectSession]);

  const onResetBindings = useCallback(() => {
    loadedProjectSession.resetBindings();
  }, [loadedProjectSession]);

  const projectPanelProps = useMemo<SidebarProjectPanelProps | null>(() => {
    if (!loadedProjectSession.project || !comparison) {
      return null;
    }

    return {
      projectName: loadedProjectSession.project.meta.name,
      savedAt: loadedProjectSession.project.meta.savedAt,
      selectedLogicalPageId: loadedProjectSession.workspaceSession.selectedLogicalPageId,
      statusMessage,
      comparison,
      bindings: loadedProjectSession.bindings,
      assignedCount: loadedProjectSession.workspaceSession.assignedCount,
      currentAssets,
      canApplyProject,
      canResetBindings: currentAssets.length > 0,
      canUndoDraft: loadedProjectSession.projectCutEditorApi.canUndo,
      canRedoDraft: loadedProjectSession.projectCutEditorApi.canRedo,
      onSelectLogicalPage,
      onBindingChange,
      onInsertLogicalPageAfter,
      onRemoveLogicalPage,
      onMoveLogicalPage,
      onResetBindings,
      onUndoDraft: loadedProjectSession.undoDraft,
      onRedoDraft: loadedProjectSession.redoDraft,
      onApplyProject,
    };
  }, [
    canApplyProject,
    comparison,
    currentAssets,
    loadedProjectSession,
    onApplyProject,
    onBindingChange,
    onInsertLogicalPageAfter,
    onMoveLogicalPage,
    onRemoveLogicalPage,
    onResetBindings,
    onSelectLogicalPage,
    statusMessage,
  ]);

  return {
    projectPanelProps,
  };
};
