import { useState, useRef, useCallback, useEffect } from 'react';
import { HistoryState, createHistoryState, pushHistoryState, redoHistory, undoHistory } from '../application/history';
import { Cut, NumberingState } from '../types';
import { isSameNumberingState, renumberLegacyCuts } from '../domain/numbering';

const HISTORY_LIMIT = 100;

type LegacyCutsState = {
  cuts: Cut[];
  numbering: NumberingState;
};

interface UseCutsOptions {
  numberingState: NumberingState;
  setNumberingState: (next: NumberingState) => void;
}

const createLegacyCutsState = (
  cuts: Cut[],
  numbering: NumberingState
): LegacyCutsState => ({
  cuts,
  numbering,
});

export const useCuts = ({ numberingState, setNumberingState }: UseCutsOptions) => {
  const [history, setHistory] = useState<HistoryState<LegacyCutsState>>(() =>
    createHistoryState<LegacyCutsState>(createLegacyCutsState([], numberingState))
  );
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);

  const historyRef = useRef<HistoryState<LegacyCutsState>>(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const dragBaseRef = useRef<LegacyCutsState | null>(null);

  const requestNumberingSync = useCallback((next: NumberingState) => {
    setNumberingState(next);
  }, [setNumberingState]);

  const replacePresent = useCallback((updater: (state: LegacyCutsState) => LegacyCutsState) => {
    const current = historyRef.current.present;
    const next = updater(current);

    setHistory((prev) => ({
      ...prev,
      present: next,
    }));

    if (!isSameNumberingState(current.numbering, next.numbering)) {
      requestNumberingSync(next.numbering);
    }
  }, [requestNumberingSync]);

  const pushPresent = useCallback((updater: (state: LegacyCutsState) => LegacyCutsState) => {
    const current = historyRef.current.present;
    const next = updater(current);

    setHistory((prev) => pushHistoryState(prev, next, HISTORY_LIMIT));

    if (!isSameNumberingState(current.numbering, next.numbering)) {
      requestNumberingSync(next.numbering);
    }
  }, [requestNumberingSync]);

  const undo = useCallback(() => {
    const current = historyRef.current;
    const next = undoHistory<LegacyCutsState>(current);

    if (next === current) return;

    setHistory(next);
    dragBaseRef.current = null;
    if (!isSameNumberingState(current.present.numbering, next.present.numbering)) {
      requestNumberingSync(next.present.numbering);
    }
  }, [requestNumberingSync]);

  const redo = useCallback(() => {
    const current = historyRef.current;
    const next = redoHistory<LegacyCutsState>(current);

    if (next === current) return;

    setHistory(next);
    dragBaseRef.current = null;
    if (!isSameNumberingState(current.present.numbering, next.present.numbering)) {
      requestNumberingSync(next.present.numbering);
    }
  }, [requestNumberingSync]);

  const resetCuts = useCallback(() => {
    setHistory(createHistoryState(createLegacyCutsState([], numberingState)));
    setSelectedCutId(null);
    dragBaseRef.current = null;
  }, [numberingState]);

  const replaceCutsState = useCallback((nextCuts: Cut[], nextNumbering: NumberingState) => {
    setHistory(createHistoryState(createLegacyCutsState(nextCuts, nextNumbering)));
    setSelectedCutId(null);
    dragBaseRef.current = null;
    if (!isSameNumberingState(numberingState, nextNumbering)) {
      requestNumberingSync(nextNumbering);
    }
  }, [numberingState, requestNumberingSync]);

  const addCut = useCallback((newCut: Cut, nextNumbering?: NumberingState) => {
    pushPresent((current) => ({
      cuts: [...current.cuts, newCut],
      numbering: nextNumbering ?? current.numbering,
    }));
  }, [pushPresent]);

  const updateCutPosition = useCallback((id: string, x: number, y: number) => {
    const current = historyRef.current.present;
    if (!dragBaseRef.current) {
      dragBaseRef.current = current;
    }

    replacePresent((state) => ({
      ...state,
      cuts: state.cuts.map((cut) => (cut.id === id ? { ...cut, x, y } : cut)),
    }));
  }, [replacePresent]);

  const handleCutDragEnd = useCallback(() => {
    const dragBase = dragBaseRef.current;
    dragBaseRef.current = null;
    if (!dragBase) return;

    const current = historyRef.current.present;
    if (current === dragBase) return;

    setHistory((prev) =>
      pushHistoryState(
        {
          past: prev.past,
          present: dragBase,
          future: prev.future,
        },
        current,
        HISTORY_LIMIT
      )
    );
  }, []);

  const deleteCut = useCallback((id: string) => {
    pushPresent((current) => ({
      ...current,
      cuts: current.cuts.filter((cut) => cut.id !== id),
    }));
    if (selectedCutId === id) {
      setSelectedCutId(null);
    }
  }, [pushPresent, selectedCutId]);

  const setNumberingStateWithHistory = useCallback((nextNumbering: NumberingState) => {
    if (isSameNumberingState(historyRef.current.present.numbering, nextNumbering)) {
      return;
    }

    pushPresent((current) => ({
      ...current,
      numbering: nextNumbering,
    }));
  }, [pushPresent]);

  const renumberFromCut = useCallback((
    startCutId: string,
    startNumbering: NumberingState,
    minDigits: number,
    autoIncrement: boolean
  ) => {
    const current = historyRef.current.present;
    const result = renumberLegacyCuts(
      current.cuts,
      startCutId,
      startNumbering,
      minDigits,
      autoIncrement
    );
    if (!result.found) return;

    pushPresent(() => ({
      cuts: result.cuts,
      numbering: result.nextNumbering,
    }));
  }, [pushPresent]);

  return {
    cuts: history.present.cuts,
    selectedCutId,
    historyIndex: history.past.length - 1,
    historyLength: history.past.length + history.future.length,
    setSelectedCutId,
    addCut,
    updateCutPosition,
    handleCutDragEnd,
    deleteCut,
    setNumberingStateWithHistory,
    renumberFromCut,
    undo,
    redo,
    resetCuts,
    replaceCutsState,
  };
};
