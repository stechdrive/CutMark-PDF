import { ChangeEvent, useCallback } from 'react';
import { createTemplateFromProjectDocument } from '../adapters/legacyProjectAdapter';
import {
  createSuggestedProjectAssetBindings,
  ProjectAssetBindings,
} from '../application/projectBindings';
import { ProjectDocument, TemplateSnapshot } from '../domain/project';
import {
  downloadProjectDocument,
  loadProjectDocumentFromFile,
} from '../repositories/projectRepository';

type DebugLogData = unknown | (() => unknown);

interface UseProjectLifecycleOptions {
  docType: 'pdf' | 'images' | null;
  numPages: number;
  currentAssetHints: Parameters<typeof createSuggestedProjectAssetBindings>[1];
  loadedProject: ProjectDocument | null;
  projectBindings: ProjectAssetBindings;
  legacyProject: ProjectDocument | null;
  activeProjectBindings: ProjectAssetBindings;
  canApplyLoadedProject: boolean;
  resolveProjectDocumentForCurrentState: (
    project: ProjectDocument,
    bindings: ProjectAssetBindings,
    options?: { touchSavedAt?: boolean }
  ) => ProjectDocument;
  loadProjectIntoEditor: (project: ProjectDocument) => void;
  replaceEditorProject: (
    project: ProjectDocument,
    bindings?: ProjectAssetBindings | null
  ) => void;
  upsertTemplate: (template: TemplateSnapshot) => void;
  setMode: (mode: 'edit' | 'template') => void;
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

const countProjectCuts = (project: ProjectDocument) =>
  project.logicalPages.reduce((count, page) => count + page.cuts.length, 0);

const toFileInfo = (file: File | null) => {
  if (!file) return null;
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toISOString(),
  };
};

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
};

export const useProjectLifecycle = ({
  docType,
  numPages,
  currentAssetHints,
  loadedProject,
  projectBindings,
  legacyProject,
  activeProjectBindings,
  canApplyLoadedProject,
  resolveProjectDocumentForCurrentState,
  loadProjectIntoEditor,
  replaceEditorProject,
  upsertTemplate,
  setMode,
  logDebug,
}: UseProjectLifecycleOptions) => {
  const applyLoadedProjectToCurrentDocument = useCallback((
    project: ProjectDocument,
    sourceFile: ReturnType<typeof toFileInfo> | null = null,
    bindings?: ProjectAssetBindings
  ) => {
    const projectForApply =
      bindings ? resolveProjectDocumentForCurrentState(project, bindings) : project;
    upsertTemplate(createTemplateFromProjectDocument(projectForApply));
    setMode('edit');

    logDebug('info', 'プロジェクト適用完了', () => ({
      projectName: projectForApply.meta.name,
      logicalPages: projectForApply.logicalPages.length,
      cutCount: countProjectCuts(projectForApply),
      assignedPages: bindings
        ? Object.values(bindings).filter((pageIndex) => pageIndex != null).length
        : projectForApply.logicalPages.length,
      sourceFile,
    }));
  }, [logDebug, resolveProjectDocumentForCurrentState, setMode, upsertTemplate]);

  const handleApplyLoadedProject = useCallback(() => {
    if (!loadedProject || !canApplyLoadedProject) {
      return;
    }

    applyLoadedProjectToCurrentDocument(loadedProject, null, projectBindings);
  }, [applyLoadedProjectToCurrentDocument, canApplyLoadedProject, loadedProject, projectBindings]);

  const handleSaveProject = useCallback(() => {
    const projectSource = loadedProject ? loadedProject : legacyProject;
    const bindingsForSave = loadedProject ? projectBindings : activeProjectBindings;

    if (!docType || !projectSource) {
      alert('先にPDFまたは画像を読み込んでください');
      return;
    }

    const project = resolveProjectDocumentForCurrentState(
      projectSource,
      bindingsForSave,
      { touchSavedAt: true }
    );

    if (loadedProject) {
      replaceEditorProject(project, projectBindings);
    } else {
      loadProjectIntoEditor(project);
    }
    downloadProjectDocument(project);
    logDebug('info', 'プロジェクト保存', () => ({
      projectName: project.meta.name,
      logicalPages: project.logicalPages.length,
      cutCount: countProjectCuts(project),
    }));
  }, [
    activeProjectBindings,
    docType,
    legacyProject,
    loadedProject,
    loadProjectIntoEditor,
    logDebug,
    projectBindings,
    replaceEditorProject,
    resolveProjectDocumentForCurrentState,
  ]);

  const onProjectLoaded = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    try {
      if (!file) return;

      const project = await loadProjectDocumentFromFile(file);
      const fileInfo = toFileInfo(file);
      const suggestedBindings = createSuggestedProjectAssetBindings(project, currentAssetHints);

      loadProjectIntoEditor(project);
      upsertTemplate(createTemplateFromProjectDocument(project));
      logDebug('info', 'プロジェクト読込完了', () => ({
        projectName: project.meta.name,
        logicalPages: project.logicalPages.length,
        file: fileInfo,
      }));

      if (!docType || numPages < 1) {
        alert('プロジェクトを読み込みました。次にPDFまたは画像を読み込むと比較できます。');
        return;
      }

      if (project.logicalPages.length !== numPages) {
        alert(
          `このプロジェクトは ${project.logicalPages.length} ページですが、現在の素材は ${numPages} ページです。\n` +
          '論理ページの割当と増減は右パネルで調整できます。'
        );
        logDebug('warn', 'プロジェクト読込保留', () => ({
          reason: 'page-count-mismatch',
          projectPages: project.logicalPages.length,
          currentPages: numPages,
          file: fileInfo,
        }));
        return;
      }

      applyLoadedProjectToCurrentDocument(project, fileInfo, suggestedBindings);
    } catch (error) {
      alert('プロジェクト読込中にエラーが発生しました');
      logDebug('error', 'プロジェクト読込失敗', () => ({
        error: normalizeError(error),
        file: toFileInfo(file ?? null),
      }));
    } finally {
      e.target.value = '';
    }
  }, [
    applyLoadedProjectToCurrentDocument,
    currentAssetHints,
    docType,
    loadProjectIntoEditor,
    logDebug,
    numPages,
    upsertTemplate,
  ]);

  return {
    applyLoadedProjectToCurrentDocument,
    handleApplyLoadedProject,
    handleSaveProject,
    onProjectLoaded,
  };
};
