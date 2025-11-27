import { useState, useRef, useCallback } from 'react';

export const usePdfViewer = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setCurrentPage(1);
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setCurrentPage(1);
    }
  }, []);

  const setPage = useCallback((newPage: number | ((prev: number) => number)) => {
    if (typeof newPage === 'function') {
      setCurrentPage(prev => {
        const next = newPage(prev);
        return Math.max(1, Math.min(numPages || 1, next));
      });
    } else {
      setCurrentPage(Math.max(1, Math.min(numPages || 1, newPage)));
    }
  }, [numPages]);

  return {
    pdfFile,
    numPages,
    currentPage,
    scale,
    isDragging,
    setPdfFile,
    setNumPages,
    setCurrentPage: setPage,
    setScale,
    handleFileChange,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop
    }
  };
};