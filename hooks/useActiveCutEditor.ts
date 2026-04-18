import { useCallback } from 'react';
import { advanceNumberingState, buildNumberLabel } from '../domain/numbering';
import { NumberingPolicy, ProjectDocument } from '../domain/project';
import { AppSettings, Cut, NumberingState } from '../types';

interface LegacyCutEditorApi {
  currentPage: number;
  settings: AppSettings;
  selectedCutId: string | null;
  historyIndex: number;
  historyLength: number;
  getNextLabel: () => string;
  getNextNumberingState: () => NumberingState;
  setSelectedCutId: (cutId: string | null) => void;
  addCut: (cut: Cut, nextNumbering?: NumberingState) => void;
  updateCutPosition: (cutId: string, x: number, y: number) => void;
  handleCutDragEnd: () => void;
  deleteCut: (cutId: string) => void;
  setNumberingStateWithHistory: (next: NumberingState) => void;
  renumberFromCut: (
    cutId: string,
    numbering: NumberingState,
    minDigits: number,
    autoIncrement: boolean
  ) => void;
  undo: () => void;
  redo: () => void;
}

interface ProjectCutEditorApi {
  project: ProjectDocument | null;
  settings: AppSettings;
  selectedLogicalPageId: string | null;
  selectedCutId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  historyLength: number;
  addCutToSelectedPage: (
    cut: Omit<Cut, 'pageIndex'>,
    nextNumbering?: NumberingState
  ) => void;
  selectCut: (cutId: string | null) => void;
  updateCutPosition: (cutId: string, x: number, y: number) => void;
  commitCutDrag: () => void;
  deleteCut: (cutId: string) => void;
  setNumberingState: (next: NumberingState) => void;
  renumberFromCut: (cutId: string, numbering: NumberingPolicy) => void;
  undo: () => void;
  redo: () => void;
}

interface UseActiveCutEditorOptions {
  legacy: LegacyCutEditorApi;
  project: ProjectCutEditorApi;
}

export const useActiveCutEditor = ({
  legacy,
  project,
}: UseActiveCutEditorOptions) => {
  const usingProjectEditor = !!project.project;

  const createCutAt = useCallback((x: number, y: number) => {
    if (project.project) {
      if (!project.selectedLogicalPageId) return;

      const currentNumbering = {
        nextNumber: project.settings.nextNumber,
        branchChar: project.settings.branchChar,
      };
      const nextNumbering = advanceNumberingState(
        currentNumbering,
        project.settings.autoIncrement
      );

      project.addCutToSelectedPage(
        {
          id: crypto.randomUUID(),
          x,
          y,
          label: buildNumberLabel(currentNumbering, project.settings.minDigits),
          isBranch: !!project.settings.branchChar,
        },
        nextNumbering
      );
      return;
    }

    legacy.addCut(
      {
        id: crypto.randomUUID(),
        pageIndex: legacy.currentPage - 1,
        x,
        y,
        label: legacy.getNextLabel(),
        isBranch: !!legacy.settings.branchChar,
      },
      legacy.getNextNumberingState()
    );
  }, [legacy, project]);

  const selectCut = useCallback((cutId: string | null) => {
    if (project.project) {
      project.selectCut(cutId);
      return;
    }

    legacy.setSelectedCutId(cutId);
  }, [legacy, project]);

  const deleteCut = useCallback((cutId: string) => {
    if (project.project) {
      project.deleteCut(cutId);
      return;
    }

    legacy.deleteCut(cutId);
  }, [legacy, project]);

  const updateCutPosition = useCallback((cutId: string, x: number, y: number) => {
    if (project.project) {
      project.updateCutPosition(cutId, x, y);
      return;
    }

    legacy.updateCutPosition(cutId, x, y);
  }, [legacy, project]);

  const commitCutDrag = useCallback(() => {
    if (project.project) {
      project.commitCutDrag();
      return;
    }

    legacy.handleCutDragEnd();
  }, [legacy, project]);

  const renumberFromSelected = useCallback((cutId: string) => {
    if (project.project) {
      project.renumberFromCut(cutId, {
        nextNumber: project.settings.nextNumber,
        branchChar: project.settings.branchChar,
        minDigits: project.settings.minDigits,
        autoIncrement: project.settings.autoIncrement,
      });
      return;
    }

    legacy.renumberFromCut(
      cutId,
      {
        nextNumber: legacy.settings.nextNumber,
        branchChar: legacy.settings.branchChar,
      },
      legacy.settings.minDigits,
      legacy.settings.autoIncrement
    );
  }, [legacy, project]);

  const setNumberingState = useCallback((next: NumberingState) => {
    if (project.project) {
      project.setNumberingState(next);
      return;
    }

    legacy.setNumberingStateWithHistory(next);
  }, [legacy, project]);

  const undo = useCallback(() => {
    if (project.project) {
      project.undo();
      return;
    }

    legacy.undo();
  }, [legacy, project]);

  const redo = useCallback(() => {
    if (project.project) {
      project.redo();
      return;
    }

    legacy.redo();
  }, [legacy, project]);

  return {
    selectedCutId: usingProjectEditor
      ? project.selectedCutId
      : legacy.selectedCutId,
    canUndo: usingProjectEditor
      ? project.canUndo
      : legacy.historyIndex > -1,
    canRedo: usingProjectEditor
      ? project.canRedo
      : legacy.historyIndex < legacy.historyLength - 1,
    historyIndex: usingProjectEditor
      ? project.historyIndex
      : legacy.historyIndex,
    historyLength: usingProjectEditor
      ? project.historyLength
      : legacy.historyLength,
    createCutAt,
    selectCut,
    deleteCut,
    updateCutPosition,
    commitCutDrag,
    setNumberingState,
    renumberFromSelected,
    undo,
    redo,
  };
};
