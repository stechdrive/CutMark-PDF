
import { useState, useRef, useCallback, useEffect, type DragEvent } from 'react';
import { DocType } from '../types';
import { renderImageWithOrientation } from '../services/imageProcessing';
import { getImageFileMetadata } from '../services/imageMetadata';

export const useDocumentViewer = (onLoadComplete?: () => void) => {
  const [docType, setDocType] = useState<DocType | null>(null);
  
  // PDF State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  // Images State
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  
  // Shared State
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragCounter = useRef(0);

  // Manage Image URL lifecycle
  useEffect(() => {
    let isCancelled = false;
    let urlToRevoke: string | null = null;

    const loadImage = async () => {
      try {
        if (docType !== 'images' || imageFiles.length === 0 || currentPage < 1) {
          setCurrentImageUrl(null);
          return;
        }

        const file = imageFiles[currentPage - 1];
        if (!file) {
          setCurrentImageUrl(null);
          return;
        }

        const metadata = await getImageFileMetadata(file);
        if (!metadata.fileType) {
          setCurrentImageUrl(null);
          return;
        }

        const fileType = metadata.fileType;
        const orientation = metadata.orientation;

        let url: string;
        if (orientation && orientation !== 1) {
          try {
            const rendered = await renderImageWithOrientation(file, orientation, fileType);
            url = URL.createObjectURL(rendered.blob);
          } catch {
            url = URL.createObjectURL(file);
          }
        } else {
          url = URL.createObjectURL(file);
        }

        if (isCancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        urlToRevoke = url;
        setCurrentImageUrl(url);
      } catch {
        if (!isCancelled) setCurrentImageUrl(null);
      }
    };

    loadImage();

    return () => {
      isCancelled = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [docType, imageFiles, currentPage]);

  const loadPdf = useCallback((file: File) => {
    setPdfFile(file);
    setImageFiles([]);
    setDocType('pdf');
    setCurrentPage(1);
    if (onLoadComplete) onLoadComplete();
  }, [onLoadComplete]);

  const loadImages = useCallback((files: File[]) => {
    // Sort files naturally
    const sorted = [...files].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    
    setImageFiles(sorted);
    setPdfFile(null);
    setDocType('images');
    setNumPages(sorted.length);
    setCurrentPage(1);
    if (onLoadComplete) onLoadComplete();
  }, [onLoadComplete]);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
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
    docType,
    pdfFile,
    imageFiles,
    currentImageUrl,
    numPages,
    currentPage,
    scale,
    isDragging,
    loadPdf,
    loadImages,
    setNumPages,
    setCurrentPage: setPage,
    setScale,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop
    }
  };
};
