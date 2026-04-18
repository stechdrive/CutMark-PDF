import { NumberingPolicy, ProjectDocument } from '../domain/project';
import { AppSettings, Cut, NumberingState } from '../types';

export interface LogicalCutEditorApi {
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
