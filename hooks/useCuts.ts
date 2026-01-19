import { useState, useRef, useCallback, useEffect } from 'react';
import { Cut, NumberingState } from '../types';

const HISTORY_LIMIT = 100;

type HistoryEntry = {
  cuts: Cut[];
  numbering: NumberingState;
};

const formatNumberLabel = (number: number, minDigits: number) => {
  return number.toString().padStart(minDigits, '0');
};

const buildLabel = (numbering: NumberingState, minDigits: number) => {
  const numStr = formatNumberLabel(numbering.nextNumber, minDigits);
  if (numbering.branchChar) {
    return `${numStr}\n${numbering.branchChar}`;
  }
  return numStr;
};

const advanceNumbering = (numbering: NumberingState, autoIncrement: boolean): NumberingState => {
  if (!autoIncrement) return { ...numbering };

  if (numbering.branchChar) {
    const nextChar = String.fromCharCode(numbering.branchChar.charCodeAt(0) + 1);
    return {
      nextNumber: numbering.nextNumber,
      branchChar: nextChar,
    };
  }

  return {
    nextNumber: numbering.nextNumber + 1,
    branchChar: null,
  };
};

const sortCutsForRenumber = (a: Cut, b: Cut) => {
  if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
  if (a.y !== b.y) return a.y - b.y;
  if (a.x !== b.x) return a.x - b.x;
  return a.id.localeCompare(b.id);
};

interface UseCutsOptions {
  numberingState: NumberingState;
  setNumberingState: (next: NumberingState) => void;
}

export const useCuts = ({ numberingState, setNumberingState }: UseCutsOptions) => {
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);

  // Use ref to track cuts for drag operations to avoid stale closures in event listeners
  const cutsRef = useRef(cuts);
  useEffect(() => {
    cutsRef.current = cuts;
  }, [cuts]);

  const numberingRef = useRef(numberingState);
  useEffect(() => {
    numberingRef.current = numberingState;
  }, [numberingState]);

  const baseStateRef = useRef<HistoryEntry>({
    cuts: [],
    numbering: numberingState,
  });

  const pushHistory = useCallback((newCuts: Cut[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      cuts: newCuts,
      numbering: numberingRef.current,
    });
    const overflow = Math.max(0, newHistory.length - HISTORY_LIMIT);
    const trimmedHistory = overflow > 0 ? newHistory.slice(overflow) : newHistory;
    if (overflow > 0) {
      baseStateRef.current = newHistory[overflow - 1];
    }
    setHistory(trimmedHistory);
    setHistoryIndex(trimmedHistory.length - 1);
    setCuts(newCuts);
  }, [history, historyIndex]);

  const pushHistoryWithNumbering = useCallback((newCuts: Cut[], nextNumbering: NumberingState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      cuts: newCuts,
      numbering: nextNumbering,
    });
    const overflow = Math.max(0, newHistory.length - HISTORY_LIMIT);
    const trimmedHistory = overflow > 0 ? newHistory.slice(overflow) : newHistory;
    if (overflow > 0) {
      baseStateRef.current = newHistory[overflow - 1];
    }
    setHistory(trimmedHistory);
    setHistoryIndex(trimmedHistory.length - 1);
    setCuts(newCuts);
    setNumberingState(nextNumbering);
  }, [history, historyIndex, setNumberingState]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCuts(history[newIndex].cuts);
      setNumberingState(history[newIndex].numbering);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setCuts(baseStateRef.current.cuts);
      setNumberingState(baseStateRef.current.numbering);
    }
  }, [history, historyIndex, setNumberingState]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCuts(history[newIndex].cuts);
      setNumberingState(history[newIndex].numbering);
    }
  }, [history, historyIndex, setNumberingState]);

  const resetCuts = useCallback(() => {
    setCuts([]);
    setHistory([]);
    setHistoryIndex(-1);
    setSelectedCutId(null);
    baseStateRef.current = {
      cuts: [],
      numbering: numberingRef.current,
    };
  }, []);

  const addCut = useCallback((newCut: Cut, nextNumbering?: NumberingState) => {
    const newCuts = [...cutsRef.current, newCut];
    if (nextNumbering) {
      pushHistoryWithNumbering(newCuts, nextNumbering);
      return;
    }
    pushHistory(newCuts);
  }, [pushHistory, pushHistoryWithNumbering]);

  const updateCutPosition = useCallback((id: string, x: number, y: number) => {
    setCuts(prev => prev.map(c => c.id === id ? { ...c, x, y } : c));
  }, []);

  const handleCutDragEnd = useCallback(() => {
    pushHistory(cutsRef.current);
  }, [pushHistory]);

  const deleteCut = useCallback((id: string) => {
    const newCuts = cuts.filter(c => c.id !== id);
    pushHistory(newCuts);
    if (selectedCutId === id) setSelectedCutId(null);
  }, [cuts, selectedCutId, pushHistory]);

  const setNumberingStateWithHistory = useCallback((nextNumbering: NumberingState) => {
    const current = numberingRef.current;
    if (
      current.nextNumber === nextNumbering.nextNumber &&
      current.branchChar === nextNumbering.branchChar
    ) {
      return;
    }
    pushHistoryWithNumbering(cutsRef.current, nextNumbering);
  }, [pushHistoryWithNumbering]);

  const renumberFromCut = useCallback((
    startCutId: string,
    startNumbering: NumberingState,
    minDigits: number,
    autoIncrement: boolean
  ) => {
    const sortedCuts = [...cutsRef.current].sort(sortCutsForRenumber);
    const startIndex = sortedCuts.findIndex(cut => cut.id === startCutId);
    if (startIndex === -1) return;

    const updates = new Map<string, { label: string; isBranch: boolean }>();
    let currentNumbering = { ...startNumbering };

    for (let i = startIndex; i < sortedCuts.length; i++) {
      const cut = sortedCuts[i];
      updates.set(cut.id, {
        label: buildLabel(currentNumbering, minDigits),
        isBranch: !!currentNumbering.branchChar,
      });
      currentNumbering = advanceNumbering(currentNumbering, autoIncrement);
    }

    const newCuts = cutsRef.current.map(cut => {
      const update = updates.get(cut.id);
      if (!update) return cut;
      return {
        ...cut,
        label: update.label,
        isBranch: update.isBranch,
      };
    });

    pushHistoryWithNumbering(newCuts, currentNumbering);
  }, [pushHistoryWithNumbering]);

  return {
    cuts,
    selectedCutId,
    historyIndex,
    historyLength: history.length,
    setSelectedCutId,
    addCut,
    updateCutPosition,
    handleCutDragEnd,
    deleteCut,
    setNumberingStateWithHistory,
    renumberFromCut,
    undo,
    redo,
    resetCuts
  };
};
