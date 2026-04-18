import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, MouseEvent, SetStateAction, SyntheticEvent } from 'react';
import { calculateFitScale } from '../utils/documentPreviewMath';
import { DocType } from '../types';

const WHEEL_PAGE_THRESHOLD = 60;
const WHEEL_RESET_MS = 160;

interface UseDocumentPreviewViewportOptions {
  docType: DocType | null;
  pdfFile: File | null;
  currentImageUrl: string | null;
  currentPage: number;
  numPages: number;
  setCurrentPage: (num: number) => void;
  setScale: Dispatch<SetStateAction<number>>;
  onPdfPageLoadSuccess?: (page: { originalWidth: number; originalHeight: number }) => void;
}

export const useDocumentPreviewViewport = ({
  docType,
  pdfFile,
  currentImageUrl,
  currentPage,
  numPages,
  setCurrentPage,
  setScale,
  onPdfPageLoadSuccess,
}: UseDocumentPreviewViewportOptions) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoFitDone = useRef<boolean>(false);
  const wheelDeltaRef = useRef(0);
  const wheelResetTimeoutRef = useRef<number | null>(null);
  const middlePanRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);
  const [imgSize, setImgSize] = useState<{ key: string; width: number; height: number } | null>(null);

  const activeImgSize =
    imgSize && currentImageUrl && imgSize.key === currentImageUrl
      ? { width: imgSize.width, height: imgSize.height }
      : null;

  useEffect(() => {
    autoFitDone.current = false;
  }, [pdfFile, docType]);

  useEffect(() => {
    if (docType === 'images') {
      autoFitDone.current = false;
    }
  }, [currentPage, docType]);

  useEffect(() => {
    return () => {
      if (wheelResetTimeoutRef.current != null) {
        window.clearTimeout(wheelResetTimeoutRef.current);
      }
    };
  }, []);

  const changePageBy = useCallback((direction: -1 | 1) => {
    if (numPages < 2) return;
    const nextPage = Math.max(1, Math.min(numPages, currentPage + direction));
    if (nextPage !== currentPage) {
      setCurrentPage(nextPage);
    }
  }, [currentPage, numPages, setCurrentPage]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const handleWheel = (event: WheelEvent) => {
      if (!docType || numPages < 2 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      wheelDeltaRef.current += event.deltaY;

      if (wheelResetTimeoutRef.current != null) {
        window.clearTimeout(wheelResetTimeoutRef.current);
      }

      wheelResetTimeoutRef.current = window.setTimeout(() => {
        wheelDeltaRef.current = 0;
        wheelResetTimeoutRef.current = null;
      }, WHEEL_RESET_MS);

      if (Math.abs(wheelDeltaRef.current) < WHEEL_PAGE_THRESHOLD) {
        return;
      }

      const direction = wheelDeltaRef.current > 0 ? 1 : -1;
      wheelDeltaRef.current = 0;
      changePageBy(direction);
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, [changePageBy, docType, numPages]);

  useEffect(() => {
    if (!isMiddlePanning) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!viewportRef.current || !middlePanRef.current) return;
      const deltaX = event.clientX - middlePanRef.current.startX;
      const deltaY = event.clientY - middlePanRef.current.startY;
      viewportRef.current.scrollLeft = middlePanRef.current.scrollLeft - deltaX;
      viewportRef.current.scrollTop = middlePanRef.current.scrollTop - deltaY;
    };

    const stopMiddlePan = () => {
      middlePanRef.current = null;
      setIsMiddlePanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopMiddlePan);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopMiddlePan);
    };
  }, [isMiddlePanning]);

  const handleViewportMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 1 || !viewportRef.current) return;

    e.preventDefault();
    middlePanRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    };
    setIsMiddlePanning(true);
  }, []);

  const handleViewportAuxClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  }, []);

  const handleImageLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (currentImageUrl) {
      setImgSize({ key: currentImageUrl, width: naturalWidth, height: naturalHeight });
    }

    if (!autoFitDone.current && viewportRef.current) {
      const newScale = calculateFitScale({
        contentWidth: naturalWidth,
        contentHeight: naturalHeight,
        viewportWidth: viewportRef.current.clientWidth,
        viewportHeight: viewportRef.current.clientHeight,
      });
      if (newScale) setScale(newScale);
      autoFitDone.current = true;
    }
  }, [currentImageUrl, setScale]);

  const handlePdfPageLoad = useCallback((page: { originalWidth: number; originalHeight: number }) => {
    if (!autoFitDone.current && viewportRef.current) {
      const baseWidth = 595;
      const ratio = page.originalWidth / page.originalHeight;
      const baseHeight = baseWidth / ratio;

      const newScale = calculateFitScale({
        contentWidth: baseWidth,
        contentHeight: baseHeight,
        viewportWidth: viewportRef.current.clientWidth,
        viewportHeight: viewportRef.current.clientHeight,
      });
      if (newScale) setScale(newScale);
      autoFitDone.current = true;
    }

    onPdfPageLoadSuccess?.(page);
  }, [onPdfPageLoadSuccess, setScale]);

  return {
    viewportRef,
    containerRef,
    activeImgSize,
    isMiddlePanning,
    handleViewportMouseDown,
    handleViewportAuxClick,
    handleImageLoad,
    handlePdfPageLoad,
  };
};
