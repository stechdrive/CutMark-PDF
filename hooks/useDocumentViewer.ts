
import { useState, useRef, useCallback, useEffect } from 'react';
import { DocType } from '../types';
import { getExifOrientation, renderImageWithOrientation } from '../services/imageProcessing';

type FileSystemEntry = {
  isFile: boolean;
  isDirectory: boolean;
};

type FileSystemFileEntry = FileSystemEntry & {
  isFile: true;
  file: (success: (file: File) => void, error?: () => void) => void;
};

type FileSystemDirectoryEntry = FileSystemEntry & {
  isDirectory: true;
  createReader: () => FileSystemDirectoryReader;
};

type FileSystemDirectoryReader = {
  readEntries: (success: (entries: FileSystemEntry[]) => void, error?: () => void) => void;
};

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntry | null;
};

const isFileEntry = (entry: FileSystemEntry): entry is FileSystemFileEntry => entry.isFile;
const isDirectoryEntry = (entry: FileSystemEntry): entry is FileSystemDirectoryEntry =>
  entry.isDirectory;

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

        const buffer = await file.arrayBuffer();
        const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
        const fileType = isPng ? 'png' : 'jpeg';
        const orientation = getExifOrientation(buffer, fileType);

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

  // Helper to scan files from DataTransferItems
  const scanFiles = async (items: DataTransferItemList): Promise<{ pdf: File | null, images: File[] }> => {
    const entries: FileSystemEntry[] = [];
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i] as DataTransferItemWithEntry;
        // webkitGetAsEntry は非標準だが主要ブラウザで利用可能
        const entry = item.webkitGetAsEntry?.();
        if (entry) entries.push(entry);
    }

    const imageList: File[] = [];
    let pdfItem: File | null = null;
    const validExts = ['.jpg', '.jpeg', '.png'];

    const readEntry = async (entry: FileSystemEntry) => {
        if (isFileEntry(entry)) {
            return new Promise<void>((resolve) => {
                // entry.file() gets the File object
                entry.file((file: File) => {
                    const lowerName = file.name.toLowerCase();
                    if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
                        pdfItem = file;
                    } else if (validExts.some(ext => lowerName.endsWith(ext))) {
                        imageList.push(file);
                    }
                    resolve();
                }, () => resolve()); // Error handler resolves anyway
            });
        } else if (isDirectoryEntry(entry)) {
            // Create a reader to read entries in the directory
            const dirReader = entry.createReader();
            return new Promise<void>((resolve) => {
                // readEntries returns an array of entries
                dirReader.readEntries(async (subEntries: FileSystemEntry[]) => {
                    // Only scan first level children, no recursion as per requirements
                    // "フォルダ内の連番静止画JPG/PNG（子フォルダの再帰なし）"
                    for (const sub of subEntries) {
                         if (isFileEntry(sub)) {
                             await new Promise<void>((res) => {
                                 sub.file((file: File) => {
                                     const lowerName = file.name.toLowerCase();
                                     if (validExts.some(ext => lowerName.endsWith(ext))) {
                                         imageList.push(file);
                                     }
                                     res();
                                 }, () => res());
                             });
                         }
                    }
                    resolve();
                }, () => resolve());
            });
        }
    };

    // If multiple items dropped (e.g. multiple images selected), we process all.
    // If a single folder is dropped, we process its content.
    // If FileSystem API is not available (entries empty), fallback logic could be added here if needed,
    // but drag-and-drop usually supports this in modern browsers.
    if (entries.length > 0) {
        await Promise.all(entries.map(readEntry));
    } else {
        // Fallback for browsers not supporting webkitGetAsEntry (very rare nowadays for DnD)
        // Just treat them as flat files
        for (let i = 0; i < items.length; i++) {
            const file = items[i].getAsFile();
            if (file) {
                 const lowerName = file.name.toLowerCase();
                 if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
                     pdfItem = file;
                 } else if (validExts.some(ext => lowerName.endsWith(ext))) {
                     imageList.push(file);
                 }
            }
        }
    }
    
    return { pdf: pdfItem, images: imageList };
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const { pdf, images } = await scanFiles(items);

    if (pdf) {
        loadPdf(pdf);
    } else if (images.length > 0) {
        loadImages(images);
    }
  }, [loadPdf, loadImages]);

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
