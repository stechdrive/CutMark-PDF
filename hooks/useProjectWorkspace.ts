import { Dispatch, SetStateAction, useCallback, useEffect, useMemo } from 'react';
import {
  createAppSettingsFromProjectDocument,
  createLegacyCutsFromProjectDocument,
} from '../adapters/legacyProjectAdapter';
import {
  applyBoundAssetHintsToProject,
  ProjectAssetBindings,
} from '../application/projectBindings';
import { summarizeProjectAssetComparison } from '../application/projectComparison';
import {
  AssetHint,
  ProjectDocument,
  toNumberingPolicy,
  toStyleSettings,
  toTemplateSnapshot,
} from '../domain/project';
import { ProjectWorkspaceSession } from './projectWorkspaceSession';
import { AppSettings, Cut, DocType, Template } from '../types';

interface UseProjectWorkspaceOptions {
  docType: DocType | null;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  currentAssetHints: Array<AssetHint | null | undefined>;
  effectiveSettings: AppSettings;
  effectiveTemplate: Template;
  fallbackSettings: AppSettings;
  loadedSession: ProjectWorkspaceSession & {
    canApply: boolean;
    assignedCount: number;
  };
  currentSession: ProjectWorkspaceSession;
}

const toCutLike = (
  pageIndex: number,
  cut: ProjectDocument['logicalPages'][number]['cuts'][number]
): Cut => ({
  id: cut.id,
  pageIndex,
  x: cut.x,
  y: cut.y,
  label: cut.label,
  isBranch: cut.isBranch,
});

export const useProjectWorkspace = ({
  docType,
  currentPage,
  setCurrentPage,
  currentAssetHints,
  effectiveSettings,
  effectiveTemplate,
  fallbackSettings,
  loadedSession,
  currentSession,
}: UseProjectWorkspaceOptions) => {
  const loadedProject = loadedSession.project;
  const projectBindings = loadedSession.bindings;

  const projectComparison = useMemo(() => {
    if (!loadedProject) return null;
    return summarizeProjectAssetComparison(loadedProject, currentAssetHints);
  }, [currentAssetHints, loadedProject]);

  useEffect(() => {
    if (!loadedSession.selectedLogicalPageId) return;
    const assetIndex = projectBindings[loadedSession.selectedLogicalPageId];
    if (assetIndex == null) return;
    if (assetIndex + 1 !== currentPage) {
      setCurrentPage(assetIndex + 1);
    }
  }, [
    currentPage,
    loadedSession.selectedLogicalPageId,
    projectBindings,
    setCurrentPage,
  ]);

  const assignedProjectBindingCount = loadedSession.assignedCount;
  const canApplyLoadedProject = !!docType && loadedSession.canApply;

  const projectStatusMessage = useMemo(() => {
    if (!loadedProject) return null;
    if (!loadedSession.selectedLogicalPage) {
      return '論理ページを選ぶと、割当先の素材ページへプレビューを合わせます。';
    }
    if (loadedSession.selectedAssetIndex == null) {
      return `論理P${loadedSession.selectedLogicalPageNumber ?? '?'} は未割当です。割当を決めると対応する素材ページを表示します。`;
    }
    return `論理P${loadedSession.selectedLogicalPageNumber ?? '?'} を現在P${loadedSession.selectedAssetIndex + 1} に割り当てています。`;
  }, [
    loadedProject,
    loadedSession.selectedAssetIndex,
    loadedSession.selectedLogicalPage,
    loadedSession.selectedLogicalPageNumber,
  ]);

  const resolveProjectDocumentForCurrentState = useCallback((
    project: ProjectDocument,
    bindings: ProjectAssetBindings,
    options: { touchSavedAt?: boolean } = {}
  ) => {
    const projectWithBoundHints = applyBoundAssetHintsToProject(
      project,
      bindings,
      currentAssetHints
    );

    return {
      ...projectWithBoundHints,
      meta: {
        ...projectWithBoundHints.meta,
        savedAt: options.touchSavedAt
          ? new Date().toISOString()
          : projectWithBoundHints.meta.savedAt,
      },
      numbering: toNumberingPolicy(effectiveSettings),
      style: toStyleSettings(effectiveSettings),
      template: toTemplateSnapshot(effectiveTemplate),
    };
  }, [currentAssetHints, effectiveSettings, effectiveTemplate]);

  const resolvedLoadedProject = useMemo(
    () =>
      loadedProject
        ? resolveProjectDocumentForCurrentState(loadedProject, projectBindings)
        : null,
    [loadedProject, projectBindings, resolveProjectDocumentForCurrentState]
  );

  const activeProject = resolvedLoadedProject ?? currentSession.project;
  const activeProjectBindings = loadedProject
    ? projectBindings
    : currentSession.bindings;
  const previewLogicalPage = loadedProject
    ? loadedSession.selectedLogicalPage
    : currentSession.selectedLogicalPage;

  const previewCuts = useMemo(
    () =>
      previewLogicalPage
        ? previewLogicalPage.cuts.map((cut) => toCutLike(currentPage - 1, cut))
        : [],
    [currentPage, previewLogicalPage]
  );

  const effectiveExportCuts = useMemo(
    () =>
      activeProject
        ? createLegacyCutsFromProjectDocument(activeProject, activeProjectBindings)
        : [],
    [activeProject, activeProjectBindings]
  );

  const effectiveExportSettings = useMemo(
    () =>
      activeProject
        ? createAppSettingsFromProjectDocument(activeProject)
        : fallbackSettings,
    [activeProject, fallbackSettings]
  );

  return {
    loadedProject,
    projectBindings,
    projectComparison,
    assignedProjectBindingCount,
    canApplyLoadedProject,
    projectStatusMessage,
    resolveProjectDocumentForCurrentState,
    activeProject,
    activeProjectBindings,
    previewLogicalPage,
    previewCuts,
    effectiveExportCuts,
    effectiveExportSettings,
  };
};
