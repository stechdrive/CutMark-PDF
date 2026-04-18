import { SetStateAction, useMemo } from 'react';
import { ProjectAssetBindings } from '../application/projectBindings';
import { createAppSettingsFromProjectDocument } from '../application/projectPresentation';
import { PageBindingStatus, ProjectDocument } from '../domain/project';
import { LogicalCutEditorApi } from './logicalCutEditorApi';
import { ProjectWorkspaceSession } from './projectWorkspaceSession';
import { useProjectEditor } from './useProjectEditor';
import { AppSettings, NumberingState, Template } from '../types';

interface LoadedProjectWorkspaceSession extends ProjectWorkspaceSession {
  canApply: boolean;
  assignedCount: number;
}

interface LoadedProjectDraftApi {
  updateSettings: (
    next: SetStateAction<AppSettings>,
    options?: { pushHistory?: boolean }
  ) => void;
  updateTemplate: (
    next: SetStateAction<Template>,
    options?: { pushHistory?: boolean }
  ) => void;
  beginTransaction: () => void;
  commitTransaction: () => void;
}

export interface UseLoadedProjectSessionResult {
  project: ProjectDocument | null;
  bindings: ProjectAssetBindings;
  bindingStatuses: Record<string, PageBindingStatus>;
  workspaceSession: LoadedProjectWorkspaceSession;
  projectCutEditorApi: LogicalCutEditorApi;
  projectDraftApi: LoadedProjectDraftApi;
  loadProject: (project: ProjectDocument) => void;
  replaceProject: (
    project: ProjectDocument,
    bindings?: ProjectAssetBindings | null
  ) => void;
  assignAsset: (logicalPageId: string, assetIndex: number | null) => void;
  resetBindings: () => void;
  selectLogicalPage: (logicalPageId: string | null) => void;
  selectCut: (cutId: string | null) => void;
  insertPageAfter: (afterLogicalPageId: string | null) => void;
  removePage: (logicalPageId: string) => void;
  movePage: (logicalPageId: string, direction: -1 | 1) => void;
  insertBlankPageAtAsset: (assetIndex: number) => void;
  removePageFromConte: (logicalPageId: string) => void;
  movePageToAsset: (logicalPageId: string, assetIndex: number) => void;
  undoDraft: () => void;
  redoDraft: () => void;
}

export const useLoadedProjectSession = (
  currentAssets: Parameters<typeof useProjectEditor>[0],
  fallbackSettings: AppSettings
): UseLoadedProjectSessionResult => {
  const editor = useProjectEditor(currentAssets);

  const effectiveSettings = useMemo(
    () =>
      editor.project
        ? createAppSettingsFromProjectDocument(editor.project)
        : fallbackSettings,
    [editor.project, fallbackSettings]
  );

  const workspaceSession: LoadedProjectWorkspaceSession = {
    project: editor.project,
    bindings: editor.bindings,
    canApply: editor.canApply,
    assignedCount: editor.assignedCount,
    selectedLogicalPage: editor.selectedLogicalPage,
    selectedLogicalPageId: editor.selectedLogicalPageId,
    selectedLogicalPageNumber: editor.selectedLogicalPageNumber,
    selectedAssetIndex: editor.selectedAssetIndex,
  };

  const setNumberingState = (next: NumberingState) => {
    editor.updateSettings((current) => ({
      ...current,
      nextNumber: next.nextNumber,
      branchChar: next.branchChar,
    }), { pushHistory: true });
  };

  const projectCutEditorApi: LogicalCutEditorApi = {
    project: editor.project,
    settings: effectiveSettings,
    selectedLogicalPageId: editor.selectedLogicalPageId,
    selectedCutId: editor.selectedCutId,
    canUndo: editor.canUndo,
    canRedo: editor.canRedo,
    historyIndex: editor.historyIndex,
    historyLength: editor.historyLength,
    addCutToSelectedPage: editor.addCutToSelectedPage,
    selectCut: editor.selectCut,
    updateCutPosition: editor.updateCutPosition,
    commitCutDrag: editor.commitCutDrag,
    deleteCut: editor.deleteCut,
    setNumberingState,
    renumberFromCut: (cutId, numbering) => {
      editor.renumberFromCut(cutId, numbering);
    },
    undo: editor.undo,
    redo: editor.redo,
  };

  return {
    project: editor.project,
    bindings: editor.bindings,
    bindingStatuses: editor.bindingStatuses,
    workspaceSession,
    projectCutEditorApi,
    projectDraftApi: {
      updateSettings: editor.updateSettings,
      updateTemplate: editor.updateTemplate,
      beginTransaction: editor.beginTransaction,
      commitTransaction: editor.commitTransaction,
    },
    loadProject: editor.loadProject,
    replaceProject: editor.replaceProject,
    assignAsset: editor.assignAsset,
    resetBindings: editor.resetBindings,
    selectLogicalPage: editor.selectLogicalPage,
    selectCut: editor.selectCut,
    insertPageAfter: editor.insertPageAfter,
    removePage: editor.removePage,
    movePage: editor.movePage,
    insertBlankPageAtAsset: editor.insertBlankPageAtAsset,
    removePageFromConte: editor.removePageFromConte,
    movePageToAsset: editor.movePageToAsset,
    undoDraft: editor.undo,
    redoDraft: editor.redo,
  };
};
