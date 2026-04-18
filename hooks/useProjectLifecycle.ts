import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import {
  createSuggestedProjectAssetBindings,
  ProjectAssetBindings,
} from '../application/projectBindings';
import { createTemplateFromProjectDocument } from '../application/projectPresentation';
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
  currentProject: ProjectDocument | null;
  currentProjectBindings: ProjectAssetBindings;
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

export interface ProjectImportContext {
  docType: 'pdf' | 'images';
  numPages: number;
  currentAssetHints: Parameters<typeof createSuggestedProjectAssetBindings>[1];
  autoApplyWhenReady?: boolean;
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
  currentProject,
  currentProjectBindings,
  canApplyLoadedProject,
  resolveProjectDocumentForCurrentState,
  loadProjectIntoEditor,
  replaceEditorProject,
  upsertTemplate,
  setMode,
  logDebug,
}: UseProjectLifecycleOptions) => {
  const [pendingProjectImport, setPendingProjectImport] = useState<{
    sourceFile: ReturnType<typeof toFileInfo> | null;
  } | null>(null);

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

  useEffect(() => {
    if (!pendingProjectImport || !loadedProject || !docType || numPages < 1) {
      return;
    }

    if (loadedProject.logicalPages.length !== numPages) {
      logDebug('warn', 'プロジェクト読込保留', () => ({
        reason: 'page-count-mismatch',
        projectPages: loadedProject.logicalPages.length,
        currentPages: numPages,
        file: pendingProjectImport.sourceFile,
      }));
      setPendingProjectImport(null);
      return;
    }

    const suggestedBindings = createSuggestedProjectAssetBindings(loadedProject, currentAssetHints);
    applyLoadedProjectToCurrentDocument(loadedProject, pendingProjectImport.sourceFile, suggestedBindings);
    setPendingProjectImport(null);
  }, [
    applyLoadedProjectToCurrentDocument,
    currentAssetHints,
    docType,
    loadedProject,
    logDebug,
    numPages,
    pendingProjectImport,
  ]);

  const handleApplyLoadedProject = useCallback(() => {
    if (!loadedProject || !canApplyLoadedProject) {
      return;
    }

    applyLoadedProjectToCurrentDocument(loadedProject, null, projectBindings);
  }, [applyLoadedProjectToCurrentDocument, canApplyLoadedProject, loadedProject, projectBindings]);

  const handleSaveProject = useCallback(() => {
    const projectSource = loadedProject ? loadedProject : currentProject;
    const bindingsForSave = loadedProject ? projectBindings : currentProjectBindings;

    if (!projectSource) {
      alert('保存できるプロジェクトがありません');
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
    currentProject,
    currentProjectBindings,
    loadedProject,
    loadProjectIntoEditor,
    logDebug,
    projectBindings,
    replaceEditorProject,
    resolveProjectDocumentForCurrentState,
  ]);

  const loadProjectFile = useCallback(async (
    file: File,
    importContext?: ProjectImportContext
  ) => {
    try {
      setPendingProjectImport(null);
      const project = await loadProjectDocumentFromFile(file);
      const fileInfo = toFileInfo(file);
      const activeDocType = importContext?.docType ?? docType;
      const activeNumPages = importContext?.numPages ?? numPages;

      loadProjectIntoEditor(project);
      upsertTemplate(createTemplateFromProjectDocument(project));
      logDebug('info', 'プロジェクト読込完了', () => ({
        projectName: project.meta.name,
        logicalPages: project.logicalPages.length,
        file: fileInfo,
      }));

      if (!activeDocType || activeNumPages < 1) {
        if (importContext?.autoApplyWhenReady) {
          setPendingProjectImport({ sourceFile: fileInfo });
        }
        logDebug('info', 'プロジェクト読込待機', () => ({
          reason: 'awaiting-assets',
          projectPages: project.logicalPages.length,
          file: fileInfo,
        }));
        return;
      }

      if (project.logicalPages.length !== activeNumPages) {
        logDebug('warn', 'プロジェクト読込保留', () => ({
          reason: 'page-count-mismatch',
          projectPages: project.logicalPages.length,
          currentPages: activeNumPages,
          file: fileInfo,
        }));
        return;
      }

      const activeAssetHints = importContext?.currentAssetHints ?? currentAssetHints;
      const suggestedBindings = createSuggestedProjectAssetBindings(project, activeAssetHints);
      applyLoadedProjectToCurrentDocument(project, fileInfo, suggestedBindings);
    } catch (error) {
      alert('プロジェクト読込中にエラーが発生しました');
      logDebug('error', 'プロジェクト読込失敗', () => ({
        error: normalizeError(error),
        file: toFileInfo(file ?? null),
      }));
    }
  }, [
    applyLoadedProjectToCurrentDocument,
    currentAssetHints,
    docType,
    loadProjectIntoEditor,
    logDebug,
    numPages,
    setPendingProjectImport,
    upsertTemplate,
  ]);

  const onProjectLoaded = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    try {
      if (!file) return;
      await loadProjectFile(file);
    } finally {
      e.target.value = '';
    }
  }, [loadProjectFile]);

  return {
    applyLoadedProjectToCurrentDocument,
    handleApplyLoadedProject,
    handleSaveProject,
    loadProjectFile,
    onProjectLoaded,
  };
};
