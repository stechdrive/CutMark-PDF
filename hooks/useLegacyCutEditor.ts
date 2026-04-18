import { useMemo } from 'react';
import { AppSettings, NumberingState } from '../types';
import { useCuts } from './useCuts';

interface UseLegacyCutEditorOptions {
  currentPage: number;
  settings: AppSettings;
  numberingState: NumberingState;
  setNumberingState: (next: NumberingState) => void;
  getNextLabel: () => string;
  getNextNumberingState: () => NumberingState;
}

export const useLegacyCutEditor = ({
  currentPage,
  settings,
  numberingState,
  setNumberingState,
  getNextLabel,
  getNextNumberingState,
}: UseLegacyCutEditorOptions) => {
  const cutsApi = useCuts({ numberingState, setNumberingState });

  const cutEditorApi = useMemo(
    () => ({
      currentPage,
      settings,
      selectedCutId: cutsApi.selectedCutId,
      historyIndex: cutsApi.historyIndex,
      historyLength: cutsApi.historyLength,
      getNextLabel,
      getNextNumberingState,
      setSelectedCutId: cutsApi.setSelectedCutId,
      addCut: cutsApi.addCut,
      updateCutPosition: cutsApi.updateCutPosition,
      handleCutDragEnd: cutsApi.handleCutDragEnd,
      deleteCut: cutsApi.deleteCut,
      setNumberingStateWithHistory: cutsApi.setNumberingStateWithHistory,
      renumberFromCut: cutsApi.renumberFromCut,
      undo: cutsApi.undo,
      redo: cutsApi.redo,
    }),
    [
      currentPage,
      cutsApi.addCut,
      cutsApi.deleteCut,
      cutsApi.handleCutDragEnd,
      cutsApi.historyIndex,
      cutsApi.historyLength,
      cutsApi.redo,
      cutsApi.renumberFromCut,
      cutsApi.selectedCutId,
      cutsApi.setNumberingStateWithHistory,
      cutsApi.setSelectedCutId,
      cutsApi.undo,
      cutsApi.updateCutPosition,
      getNextLabel,
      getNextNumberingState,
      settings,
    ]
  );

  return {
    ...cutsApi,
    cutEditorApi,
  };
};
