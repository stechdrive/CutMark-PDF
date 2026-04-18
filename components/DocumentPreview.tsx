
import React, { useRef, useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { Upload, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { TemplateOverlay } from './TemplateOverlay';
import { CutMarker } from './CutMarker';
import { AppSettings, Cut, Template, DocType } from '../types';
import {
  calculateFitScale,
  getPlacementFromClick,
  getClickSnapTarget,
} from '../utils/documentPreviewMath';

const WHEEL_PAGE_THRESHOLD = 60;
const WHEEL_RESET_MS = 160;
const POINTER_TAP_SLOP_PX = 8;

interface DocumentPreviewProps {
  docType: DocType | null;
  pdfFile: File | null;
  currentImageUrl: string | null;
  
  numPages: number;
  setNumPages: (num: number) => void;
  currentPage: number;
  setCurrentPage: (num: number) => void;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  isDragging: boolean;
  dragHandlers: {
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  };
  onFileDropped: (e: React.DragEvent<HTMLDivElement>) => void;
  
  // Cut Operations
  cuts: Cut[];
  selectedCutId: string | null;
  setSelectedCutId: (id: string | null) => void;
  deleteCut: (id: string) => void;
  updateCutPosition: (id: string, x: number, y: number) => void;
  handleCutDragEnd: () => void;
  
  // Template & Mode
  mode: 'edit' | 'template';
  template: Template;
  setTemplate: React.Dispatch<React.SetStateAction<Template>>;
  onTemplateInteractionStart?: () => void;
  onTemplateInteractionEnd?: () => void;
  settings: AppSettings;
  projectNotice?: {
    title: string;
    message: string;
  } | null;
  
  // Events
  onContentClick: (x: number, y: number) => void;
  onPdfLoadSuccess?: (numPages: number) => void;
  onPdfLoadError?: (error: unknown) => void;
  onPdfSourceError?: (error: unknown) => void;
  onPdfPageLoadSuccess?: (page: { originalWidth: number; originalHeight: number }) => void;
  onPdfPageError?: (error: unknown) => void;
  onImageLoadError?: (src: string | null) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  docType,
  pdfFile,
  currentImageUrl,
  numPages,
  setNumPages,
  currentPage,
  setCurrentPage,
  scale,
  setScale,
  isDragging,
  dragHandlers,
  onFileDropped,
  cuts,
  selectedCutId,
  setSelectedCutId,
  deleteCut,
  updateCutPosition,
  handleCutDragEnd,
  mode,
  template,
  setTemplate,
  onTemplateInteractionStart,
  onTemplateInteractionEnd,
  settings,
  projectNotice,
  onContentClick,
  onPdfLoadSuccess,
  onPdfLoadError,
  onPdfSourceError,
  onPdfPageLoadSuccess,
  onPdfPageError,
  onImageLoadError,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null); // Scrollable container
  const containerRef = useRef<HTMLDivElement>(null); // Content wrapper
  const autoFitDone = useRef<boolean>(false); // Track if we've fitted the current doc
  const wheelDeltaRef = useRef(0);
  const wheelResetTimeoutRef = useRef<number | null>(null);
  const middlePanRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const placementPointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [snapTarget, setSnapTarget] = useState<{ y: number; rowIndex: number } | null>(null);
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);
  const showSnapCandidate = settings.enableClickSnapToRows && snapTarget !== null;

  // Image sizing state
  const [imgSize, setImgSize] = useState<{ key: string; width: number; height: number } | null>(null);
  const activeImgSize =
    imgSize && currentImageUrl && imgSize.key === currentImageUrl
      ? { width: imgSize.width, height: imgSize.height }
      : null;

  // Reset auto-fit flag when document changes
  useEffect(() => {
    autoFitDone.current = false;
  }, [pdfFile, docType]); // Don't reset on page change, only file change

  // Additional reset for image files specifically when the folder (list) changes logic might be needed,
  // but docType/pdfFile is a good proxy. For images, we might want to refit on every new image?
  // Current requirement: "Initial display". Let's stick to file load.
  // Actually for images, if sizes differ drastically, fitting every page is better UX.
  // Let's reset fit on page change for Images ONLY.
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

  const changePageBy = (direction: -1 | 1) => {
    if (numPages < 2) return;
    const nextPage = Math.max(1, Math.min(numPages, currentPage + direction));
    if (nextPage !== currentPage) {
      setCurrentPage(nextPage);
    }
  };

  const handleViewportWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!docType || numPages < 2 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
      return;
    }

    e.preventDefault();
    wheelDeltaRef.current += e.deltaY;

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

  const handleViewportMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 1 || !viewportRef.current) return;

    e.preventDefault();
    middlePanRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    };
    setIsMiddlePanning(true);
  };

  const handleViewportAuxClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  };


  const getRelativePointerPosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      return { rect, x, y };
    }

    return null;
  };

  const updateSnapTarget = (clientX: number, clientY: number) => {
    if (mode === 'template' || !settings.enableClickSnapToRows) {
      setSnapTarget(null);
      return;
    }

    const relativePosition = getRelativePointerPosition(clientX, clientY);
    if (!relativePosition || template.rowPositions.length === 0) {
      setSnapTarget(null);
      return;
    }

    const nextSnapTarget = getClickSnapTarget({
      x: relativePosition.x,
      y: relativePosition.y,
      contentWidthPx: relativePosition.rect.width,
      template,
      enableClickSnapToRows: settings.enableClickSnapToRows,
    });

    setSnapTarget(
      nextSnapTarget
        ? {
            y: nextSnapTarget.y,
            rowIndex: nextSnapTarget.rowIndex,
          }
        : null
    );
  };

  const handlePagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode === 'template') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    placementPointerRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };

    if (e.pointerType !== 'mouse') {
      updateSnapTarget(e.clientX, e.clientY);
    }
  };

  const handlePagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updateSnapTarget(e.clientX, e.clientY);

    const activePointer = placementPointerRef.current;
    if (!activePointer || activePointer.pointerId !== e.pointerId) {
      return;
    }

    if (
      Math.hypot(e.clientX - activePointer.startX, e.clientY - activePointer.startY) >
      POINTER_TAP_SLOP_PX
    ) {
      activePointer.moved = true;
    }
  };

  const handlePagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode === 'template') return;

    const activePointer = placementPointerRef.current;
    if (!activePointer || activePointer.pointerId !== e.pointerId) {
      return;
    }

    placementPointerRef.current = null;
    if (activePointer.moved) {
      return;
    }

    const relativePosition = getRelativePointerPosition(e.clientX, e.clientY);
    if (!relativePosition) {
      return;
    }

    const placement = getPlacementFromClick({
      x: relativePosition.x,
      y: relativePosition.y,
      contentWidthPx: relativePosition.rect.width,
      contentHeightPx: relativePosition.rect.height,
      template,
      enableClickSnapToRows: settings.enableClickSnapToRows,
      freePlacementOffsetYPx: (settings.fontSize + settings.backgroundPadding * 2) / 2,
    });
    onContentClick(placement.x, placement.y);
  };

  const clearPointerState = () => {
    placementPointerRef.current = null;
  };

  const handlePagePointerCancel = () => {
    clearPointerState();
    setSnapTarget(null);
  };

  const handlePointerLeave = () => {
    setSnapTarget(null);
  };
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
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
  };

  const handlePdfPageLoad = (page: { originalWidth: number, originalHeight: number }) => {
    if (!autoFitDone.current && viewportRef.current) {
        // NOTE: We render PDF at a fixed width of 595px (A4 width approx) in the DOM
        // The Scale applies to this 595px element.
        // We need to calculate how to fit the "595px based element" into the viewport.
        
        const baseWidth = 595;
        // Calculate the base height based on aspect ratio
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
  };

  return (
    <div
      ref={viewportRef}
      className={`flex-1 relative overflow-auto flex flex-col items-center p-4 transition-colors ${
        isDragging
          ? 'bg-blue-100 border-4 border-blue-400 border-dashed'
          : isMiddlePanning
            ? 'bg-gray-200 cursor-grabbing'
            : 'bg-gray-200'
      }`}
      onDragEnter={dragHandlers.onDragEnter}
      onDragOver={dragHandlers.onDragOver}
      onDragLeave={dragHandlers.onDragLeave}
      onDrop={onFileDropped}
      onWheel={handleViewportWheel}
      onMouseDown={handleViewportMouseDown}
      onAuxClick={handleViewportAuxClick}
      onClick={() => setSelectedCutId(null)}
    >
      {!docType ? (
        <div
          className={`m-auto text-center ${
            isDragging ? 'text-blue-500' : 'text-gray-400'
          }`}
        >
          <Upload
            size={64}
            className={`mx-auto mb-4 ${
              isDragging ? 'opacity-100 scale-110' : 'opacity-50'
            } transition-all`}
          />
          <p className="text-xl">
            {isDragging
              ? 'ここにドロップして開く'
              : (
                <>
                  ファイルや画像フォルダをドラッグ＆ドロップ<br />
                  または「読み込み」から PDF / 連番画像 / プロジェクトJSON を選んでください
                </>
              )}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            プロジェクトJSONも、PDF や連番画像とまとめてドロップできます
          </p>
          <p className="mt-4 text-xs text-gray-500">
            データはブラウザ内だけで処理されサーバーには送信されません
          </p>
        </div>
      ) : (
        <>
          {projectNotice && (
            <div className="pointer-events-none absolute top-4 left-1/2 z-30 w-full max-w-xl -translate-x-1/2 px-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-center shadow-lg backdrop-blur">
                <div className="text-sm font-semibold text-amber-900">{projectNotice.title}</div>
                <div className="mt-1 text-xs leading-5 text-amber-800">{projectNotice.message}</div>
              </div>
            </div>
          )}

          {/* Document Wrapper */}
          <div
            className="relative shadow-lg transition-transform duration-200 ease-out border border-gray-300 bg-white"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              // Add a minimum margin to allow scrolling if scaled up
              marginBottom: '100px' 
            }}
          >
            {docType === 'pdf' && pdfFile && (
                <Document
                file={pdfFile}
                onLoadSuccess={({ numPages }) => {
                  setNumPages(numPages);
                  onPdfLoadSuccess?.(numPages);
                }}
                onLoadError={(error) => onPdfLoadError?.(error)}
                onSourceError={(error) => onPdfSourceError?.(error)}
                loading={
                    <div className="w-[595px] h-[842px] flex items-center justify-center bg-white text-gray-400">
                    Loading PDF...
                    </div>
                }
                >
                <div
                    ref={containerRef}
                    className="relative pdf-page-container cursor-crosshair"
                    onPointerDown={handlePagePointerDown}
                    onPointerMove={handlePagePointerMove}
                    onPointerUp={handlePagePointerUp}
                    onPointerCancel={handlePagePointerCancel}
                    onPointerLeave={handlePointerLeave}
                >
                    <Page
                    pageNumber={currentPage}
                    width={595} // Base width, scale handled by parent
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadSuccess={handlePdfPageLoad}
                    onLoadError={(error) => onPdfPageError?.(error)}
                    />
                    {/* Overlays */}
                    {mode === 'template' ? (
                        <TemplateOverlay
                          template={template}
                          onChange={setTemplate}
                          onInteractionStart={onTemplateInteractionStart}
                          onInteractionEnd={onTemplateInteractionEnd}
                        />
                    ) : (
                        <>
                          {showSnapCandidate && snapTarget && (
                            <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
                              <div
                                className="absolute top-0 bottom-0 w-10 -translate-x-1/2 rounded-full border border-sky-400/50 bg-sky-300/15"
                                style={{ left: `${template.xPosition * 100}%` }}
                              />
                              <div
                                className="absolute left-0 right-0 h-0.5 bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
                                style={{ top: `${snapTarget.y * 100}%` }}
                              />
                              <div
                                className="absolute top-2 -translate-x-1/2 rounded-full bg-sky-600/95 px-2 py-0.5 text-[10px] font-medium text-white shadow"
                                style={{ left: `${template.xPosition * 100}%` }}
                              >
                                自動スナップ
                              </div>
                            </div>
                          )}
                          {cuts.map((cut) => (
                          <CutMarker
                              key={cut.id}
                              cut={cut}
                              settings={settings}
                              isSelected={selectedCutId === cut.id}
                              onSelect={setSelectedCutId}
                              onDelete={deleteCut}
                              onUpdatePosition={updateCutPosition}
                              onDragEnd={handleCutDragEnd}
                              containerRef={containerRef}
                          />
                          ))}
                        </>
                    )}
                </div>
                </Document>
            )}

            {docType === 'images' && currentImageUrl && (
                <div 
                    className="relative pdf-page-container bg-white cursor-crosshair"
                    ref={containerRef}
                    style={{
                        width: activeImgSize ? activeImgSize.width : 'auto',
                        height: activeImgSize ? activeImgSize.height : 'auto',
                        // Optional: Limit max display size if needed, but scaling handles it
                    }}
                    onPointerDown={handlePagePointerDown}
                    onPointerMove={handlePagePointerMove}
                    onPointerUp={handlePagePointerUp}
                    onPointerCancel={handlePagePointerCancel}
                    onPointerLeave={handlePointerLeave}
                >
                    <img 
                        src={currentImageUrl}
                        alt="Current page"
                        className="block select-none pointer-events-none" // prevent drag of image itself
                        draggable={false}
                        onLoad={handleImageLoad}
                        onError={() => onImageLoadError?.(currentImageUrl)}
                    />
                    {/* Overlays (Only show if image is loaded to have correct dimensions) */}
                    {activeImgSize && (
                        <>
                            {showSnapCandidate && snapTarget && (
                                <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
                                    <div
                                        className="absolute top-0 bottom-0 w-10 -translate-x-1/2 rounded-full border border-sky-400/50 bg-sky-300/15"
                                        style={{ left: `${template.xPosition * 100}%` }}
                                    />
                                    <div
                                        className="absolute left-0 right-0 h-0.5 bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
                                        style={{ top: `${snapTarget.y * 100}%` }}
                                    />
                                    <div
                                        className="absolute top-2 -translate-x-1/2 rounded-full bg-sky-600/95 px-2 py-0.5 text-[10px] font-medium text-white shadow"
                                        style={{ left: `${template.xPosition * 100}%` }}
                                    >
                                        自動スナップ
                                    </div>
                                </div>
                            )}
                            {mode === 'template' ? (
                                <TemplateOverlay
                                  template={template}
                                  onChange={setTemplate}
                                  onInteractionStart={onTemplateInteractionStart}
                                  onInteractionEnd={onTemplateInteractionEnd}
                                />
                            ) : (
                                cuts.map((cut) => (
                                <CutMarker
                                    key={cut.id}
                                    cut={cut}
                                    settings={settings}
                                    isSelected={selectedCutId === cut.id}
                                    onSelect={setSelectedCutId}
                                    onDelete={deleteCut}
                                    onUpdatePosition={updateCutPosition}
                                    onDragEnd={handleCutDragEnd}
                                    containerRef={containerRef}
                                />
                                ))
                            )}
                        </>
                    )}
                </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-40 border border-gray-200">
            <button
              onClick={() => setScale((s) => Math.max(0.1, s - 0.1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ZoomOut size={20} />
            </button>
            <span className="flex items-center justify-center w-12 font-mono text-sm">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ZoomIn size={20} />
            </button>
          </div>

          {/* Pagination */}
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40">
            <div className="bg-slate-800 text-white rounded-full shadow-xl px-4 py-2 flex items-center gap-4">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-30"
              >
                <ChevronLeft />
              </button>
              <span className="font-medium whitespace-nowrap">
                Page {currentPage} / {numPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= numPages}
                className="p-1 hover:bg-slate-700 rounded-full disabled:opacity-30"
              >
                <ChevronRight />
              </button>
            </div>
            <span className="text-[10px] font-medium text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-gray-200 shadow-sm backdrop-blur">
              ホイールでページ移動 / 中ドラッグでパン
            </span>
          </div>
        </>
      )}
    </div>
  );
};
