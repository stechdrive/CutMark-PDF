import { useLegacyCutEditor } from './useLegacyCutEditor';
import { useLegacyProjectProjection } from './useLegacyProjectProjection';
import { AssetHint } from '../domain/project';
import { LogicalCutEditorApi } from './logicalCutEditorApi';
import { AppSettings, DocType, NumberingState, Template } from '../types';

interface UseCurrentProjectSessionOptions {
  docType: DocType | null;
  currentPage: number;
  numPages: number;
  currentAssetHints: Array<AssetHint | null | undefined>;
  currentProjectName?: string;
  settings: AppSettings;
  numberingState: NumberingState;
  setNumberingState: (next: NumberingState) => void;
  getNextLabel: () => string;
  getNextNumberingState: () => NumberingState;
  template: Template;
}

export const useCurrentProjectSession = ({
  docType,
  currentPage,
  numPages,
  currentAssetHints,
  currentProjectName,
  settings,
  numberingState,
  setNumberingState,
  getNextLabel,
  getNextNumberingState,
  template,
}: UseCurrentProjectSessionOptions) => {
  const cutEditor = useLegacyCutEditor({
    currentPage,
    settings,
    numberingState,
    setNumberingState,
    getNextLabel,
    getNextNumberingState,
  });

  const projectProjection = useLegacyProjectProjection({
    docType,
    cuts: cutEditor.cuts,
    settings,
    template,
    numPages,
    currentPage,
    currentAssetHints,
    currentProjectName,
  });

  const selectedLogicalPageId = projectProjection.previewLogicalPage?.id ?? null;
  const canUndo = cutEditor.historyIndex > -1;
  const canRedo = cutEditor.historyIndex < cutEditor.historyLength - 1;

  const projectCutEditorApi: LogicalCutEditorApi = {
    project: projectProjection.project,
    settings,
    selectedLogicalPageId,
    selectedCutId: cutEditor.selectedCutId,
    canUndo,
    canRedo,
    historyIndex: cutEditor.historyIndex,
    historyLength: cutEditor.historyLength,
    addCutToSelectedPage: (cut, nextNumbering) => {
      if (!selectedLogicalPageId) return;

      cutEditor.addCut(
        {
          ...cut,
          pageIndex: Math.max(currentPage - 1, 0),
        },
        nextNumbering
      );
    },
    selectCut: cutEditor.setSelectedCutId,
    updateCutPosition: cutEditor.updateCutPosition,
    commitCutDrag: cutEditor.handleCutDragEnd,
    deleteCut: cutEditor.deleteCut,
    setNumberingState: cutEditor.setNumberingStateWithHistory,
    renumberFromCut: (cutId, numbering) => {
      cutEditor.renumberFromCut(
        cutId,
        {
          nextNumber: numbering.nextNumber,
          branchChar: numbering.branchChar,
        },
        numbering.minDigits,
        numbering.autoIncrement
      );
    },
    undo: cutEditor.undo,
    redo: cutEditor.redo,
  };

  return {
    ...cutEditor,
    project: projectProjection.project,
    bindings: projectProjection.bindings,
    previewLogicalPage: projectProjection.previewLogicalPage,
    projectCutEditorApi,
  };
};
