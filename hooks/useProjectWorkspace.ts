import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef } from 'react';
import { createCutsFromProjectDocument } from '../application/projectProjection';
import { createAppSettingsFromProjectDocument } from '../application/projectPresentation';
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
  setLoadedLogicalPageSelection?: (logicalPageId: string | null) => void;
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
  setLoadedLogicalPageSelection,
  currentAssetHints,
  effectiveSettings,
  effectiveTemplate,
  fallbackSettings,
  loadedSession,
  currentSession,
}: UseProjectWorkspaceOptions) => {
  const lastCurrentPageRef = useRef<number | null>(null);
  const lastSelectedLogicalPageIdRef = useRef<string | null>(null);
  const loadedProject = loadedSession.project;
  const projectBindings = loadedSession.bindings;

  const projectComparison = useMemo(() => {
    if (!loadedProject) return null;
    return summarizeProjectAssetComparison(loadedProject, currentAssetHints);
  }, [currentAssetHints, loadedProject]);

  useEffect(() => {
    if (!loadedProject) return;

    const currentAssetIndex = currentPage - 1;
    if (currentAssetIndex < 0) return;
    const selectedLogicalPageId = loadedSession.selectedLogicalPageId;
    const selectedAssetIndex =
      selectedLogicalPageId != null ? projectBindings[selectedLogicalPageId] ?? null : null;
    const matchedLogicalPageId =
      loadedProject.logicalPages.find((page) => projectBindings[page.id] === currentAssetIndex)?.id ?? null;
    const previousCurrentPage = lastCurrentPageRef.current;
    const previousSelectedLogicalPageId = lastSelectedLogicalPageIdRef.current;
    const isInitialSync =
      previousCurrentPage === null && previousSelectedLogicalPageId === null;
    const currentPageChanged =
      previousCurrentPage !== null && previousCurrentPage !== currentPage;
    const selectedLogicalPageChanged =
      previousSelectedLogicalPageId !== selectedLogicalPageId;

    if (isInitialSync) {
      if (selectedLogicalPageId && selectedAssetIndex != null && selectedAssetIndex + 1 !== currentPage) {
        setCurrentPage(selectedAssetIndex + 1);
      } else if (!selectedLogicalPageId && matchedLogicalPageId !== null && setLoadedLogicalPageSelection) {
        setLoadedLogicalPageSelection(matchedLogicalPageId);
      }
    } else if (currentPageChanged && !selectedLogicalPageChanged) {
      if (setLoadedLogicalPageSelection && matchedLogicalPageId !== selectedLogicalPageId) {
        setLoadedLogicalPageSelection(matchedLogicalPageId);
      }
    } else if (selectedLogicalPageChanged && !currentPageChanged) {
      if (selectedLogicalPageId && selectedAssetIndex != null && selectedAssetIndex + 1 !== currentPage) {
        setCurrentPage(selectedAssetIndex + 1);
      }
    }

    lastCurrentPageRef.current = currentPage;
    lastSelectedLogicalPageIdRef.current = selectedLogicalPageId;
  }, [
    currentPage,
    loadedProject,
    loadedSession.selectedLogicalPageId,
    projectBindings,
    setCurrentPage,
    setLoadedLogicalPageSelection,
  ]);

  const assignedProjectBindingCount = loadedSession.assignedCount;
  const canApplyLoadedProject = !!docType && loadedSession.canApply;

  const projectStatusMessage = useMemo(() => {
    if (!loadedProject) return null;
    if (!loadedSession.selectedLogicalPage) {
      return 'カット番号ページを選ぶと、割付先のコンテへプレビューを合わせます。';
    }
    if (loadedSession.selectedAssetIndex == null) {
      return `カット番号P${loadedSession.selectedLogicalPageNumber ?? '?'} は未配置です。割付を決めると対応するコンテを表示します。`;
    }
    return `カット番号P${loadedSession.selectedLogicalPageNumber ?? '?'} をコンテP${loadedSession.selectedAssetIndex + 1} に割り付けています。`;
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
        ? createCutsFromProjectDocument(activeProject, activeProjectBindings)
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
