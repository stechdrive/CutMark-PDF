import { useState, useRef, useCallback, useEffect } from 'react';
import { Cut } from '../types';

export const useCuts = () => {
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [history, setHistory] = useState<Cut[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);

  // Use ref to track cuts for drag operations to avoid stale closures in event listeners
  const cutsRef = useRef(cuts);
  useEffect(() => {
    cutsRef.current = cuts;
  }, [cuts]);

  const pushHistory = useCallback((newCuts: Cut[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newCuts);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCuts(newCuts);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCuts(history[newIndex]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setCuts([]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCuts(history[newIndex]);
    }
  }, [history, historyIndex]);

  const resetCuts = useCallback(() => {
    setCuts([]);
    setHistory([]);
    setHistoryIndex(-1);
    setSelectedCutId(null);
  }, []);

  const addCut = useCallback((newCut: Cut) => {
    pushHistory([...cuts, newCut]);
  }, [cuts, pushHistory]);

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
    undo,
    redo,
    resetCuts
  };
};
