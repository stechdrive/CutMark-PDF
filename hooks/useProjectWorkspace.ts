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
  LogicalPage,
  ProjectDocument,
  toNumberingPolicy,
  toStyleSettings,
  toTemplateSnapshot,
} from '../domain/project';
import { AppSettings, Cut, DocType, Template } from '../types';

interface UseProjectWorkspaceOptions {
  docType: DocType | null;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  currentAssetHints: Array<AssetHint | null | undefined>;
  effectiveSettings: AppSettings;
  effectiveTemplate: Template;
  fallbackSettings: AppSettings;
  projectEditor: {
    project: ProjectDocument | null;
    bindings: ProjectAssetBindings;
    canApply: boolean;
    assignedCount: number;
    selectedLogicalPage: LogicalPage | null;
    selectedLogicalPageId: string | null;
    selectedLogicalPageNumber: number | null;
    selectedAssetIndex: number | null;
  };
  legacyProjection: {
    project: ProjectDocument | null;
    bindings: ProjectAssetBindings;
    previewLogicalPage: LogicalPage | null;
  };
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
  projectEditor,
  legacyProjection,
}: UseProjectWorkspaceOptions) => {
  const loadedProject = projectEditor.project;
  const projectBindings = projectEditor.bindings;

  const projectComparison = useMemo(() => {
    if (!loadedProject) return null;
    return summarizeProjectAssetComparison(loadedProject, currentAssetHints);
  }, [currentAssetHints, loadedProject]);

  useEffect(() => {
    if (!projectEditor.selectedLogicalPageId) return;
    const assetIndex = projectBindings[projectEditor.selectedLogicalPageId];
    if (assetIndex == null) return;
    if (assetIndex + 1 !== currentPage) {
      setCurrentPage(assetIndex + 1);
    }
  }, [
    currentPage,
    projectBindings,
    projectEditor.selectedLogicalPageId,
    setCurrentPage,
  ]);

  const assignedProjectBindingCount = projectEditor.assignedCount;
  const canApplyLoadedProject = !!docType && projectEditor.canApply;

  const projectStatusMessage = useMemo(() => {
    if (!loadedProject) return null;
    if (!projectEditor.selectedLogicalPage) {
      return '論理ページを選ぶと、割当先の素材ページへプレビューを合わせます。';
    }
    if (projectEditor.selectedAssetIndex == null) {
      return `論理P${projectEditor.selectedLogicalPageNumber ?? '?'} は未割当です。割当を決めると対応する素材ページを表示します。`;
    }
    return `論理P${projectEditor.selectedLogicalPageNumber ?? '?'} を現在P${projectEditor.selectedAssetIndex + 1} に割り当てています。`;
  }, [
    loadedProject,
    projectEditor.selectedAssetIndex,
    projectEditor.selectedLogicalPage,
    projectEditor.selectedLogicalPageNumber,
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

  const activeProject = resolvedLoadedProject ?? legacyProjection.project;
  const activeProjectBindings = loadedProject
    ? projectBindings
    : legacyProjection.bindings;
  const previewLogicalPage = loadedProject
    ? projectEditor.selectedLogicalPage
    : legacyProjection.previewLogicalPage;

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
