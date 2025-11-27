import { useEffect } from 'react';

interface ShortcutHandlers {
  onUndo: () => void;
  onRedo: () => void;
  onPageNext: () => void;
  onPagePrev: () => void;
  onRowSnap: (index: number) => void;
}

export const useKeyboardShortcuts = ({
  onUndo,
  onRedo,
  onPageNext,
  onPagePrev,
  onRowSnap
}: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input focused
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement || 
          e.target instanceof HTMLSelectElement) return;

      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        onRowSnap(index);
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) onRedo();
        else onUndo();
        e.preventDefault();
      }

      if (e.key === 'ArrowRight') onPageNext();
      if (e.key === 'ArrowLeft') onPagePrev();
      
      // Enter key for next page
      if (e.key === 'Enter') {
        e.preventDefault();
        onPageNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onPageNext, onPagePrev, onRowSnap]);
};