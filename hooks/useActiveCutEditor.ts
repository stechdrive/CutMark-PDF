import { useCallback } from 'react';
import { advanceNumberingState, buildNumberLabel } from '../domain/numbering';
import { LogicalCutEditorApi } from './logicalCutEditorApi';
import { NumberingState } from '../types';

interface UseActiveCutEditorOptions {
  editor: LogicalCutEditorApi;
}

export const useActiveCutEditor = ({
  editor,
}: UseActiveCutEditorOptions) => {
  const createCutAt = useCallback((x: number, y: number) => {
    if (!editor.project || !editor.selectedLogicalPageId) return;

    const currentNumbering = {
      nextNumber: editor.settings.nextNumber,
      branchChar: editor.settings.branchChar,
    };
    const nextNumbering = advanceNumberingState(
      currentNumbering,
      editor.settings.autoIncrement
    );

    editor.addCutToSelectedPage(
      {
        id: crypto.randomUUID(),
        x,
        y,
        label: buildNumberLabel(currentNumbering, editor.settings.minDigits),
        isBranch: !!editor.settings.branchChar,
      },
      nextNumbering
    );
  }, [editor]);

  const selectCut = useCallback((cutId: string | null) => {
    editor.selectCut(cutId);
  }, [editor]);

  const deleteCut = useCallback((cutId: string) => {
    editor.deleteCut(cutId);
  }, [editor]);

  const updateCutPosition = useCallback((cutId: string, x: number, y: number) => {
    editor.updateCutPosition(cutId, x, y);
  }, [editor]);

  const commitCutDrag = useCallback(() => {
    editor.commitCutDrag();
  }, [editor]);

  const renumberFromSelected = useCallback((cutId: string) => {
    if (!editor.project) {
      return;
    }

    editor.renumberFromCut(cutId, {
      nextNumber: editor.settings.nextNumber,
      branchChar: editor.settings.branchChar,
      minDigits: editor.settings.minDigits,
      autoIncrement: editor.settings.autoIncrement,
    });
  }, [editor]);

  const setNumberingState = useCallback((next: NumberingState) => {
    editor.setNumberingState(next);
  }, [editor]);

  const undo = useCallback(() => {
    editor.undo();
  }, [editor]);

  const redo = useCallback(() => {
    editor.redo();
  }, [editor]);

  return {
    selectedCutId: editor.selectedCutId,
    canUndo: editor.canUndo,
    canRedo: editor.canRedo,
    historyIndex: editor.historyIndex,
    historyLength: editor.historyLength,
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
