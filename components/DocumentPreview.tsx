
import React, { useRef, useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { Upload, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { TemplateOverlay } from './TemplateOverlay';
import { CutMarker } from './CutMarker';
import { AppSettings, Cut, Template, DocType } from '../types';

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
  settings: AppSettings;
  
  // Events
  onContentClick: (x: number, y: number) => void;
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
  settings,
  onContentClick,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null); // Scrollable container
  const containerRef = useRef<HTMLDivElement>(null); // Content wrapper
  const autoFitDone = useRef<boolean>(false); // Track if we've fitted the current doc

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


  const handlePageClick = (e: React.MouseEvent) => {
    if (mode === 'template') return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Safety check for bounds
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      onContentClick(x, y);
    }
  };

  const calculateFitScale = (contentWidth: number, contentHeight: number) => {
    if (!viewportRef.current) return;
    
    const { clientWidth, clientHeight } = viewportRef.current;
    const padding = 40; // Pixels
    const availWidth = Math.max(100, clientWidth - padding);
    const availHeight = Math.max(100, clientHeight - padding);

    const scaleX = availWidth / contentWidth;
    const scaleY = availHeight / contentHeight;
    
    // Fit entire content
    let newScale = Math.min(scaleX, scaleY);
    
    // Don't zoom in too much automatically (cap at 1.5x)
    // But allow zooming out as much as needed
    newScale = Math.min(newScale, 1.5);
    
    // Round to nice number
    return Math.floor(newScale * 100) / 100;
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (currentImageUrl) {
      setImgSize({ key: currentImageUrl, width: naturalWidth, height: naturalHeight });
    }

    if (!autoFitDone.current && viewportRef.current) {
        const newScale = calculateFitScale(naturalWidth, naturalHeight);
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

        const newScale = calculateFitScale(baseWidth, baseHeight);
        if (newScale) setScale(newScale);
        autoFitDone.current = true;
    }
  };

  return (
    <div
      ref={viewportRef}
      className={`flex-1 relative overflow-auto flex flex-col items-center p-4 transition-colors ${
        isDragging
          ? 'bg-blue-100 border-4 border-blue-400 border-dashed'
          : 'bg-gray-200'
      }`}
      onDragEnter={dragHandlers.onDragEnter}
      onDragOver={dragHandlers.onDragOver}
      onDragLeave={dragHandlers.onDragLeave}
      onDrop={onFileDropped}
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
                  ファイル/フォルダをドラッグ＆ドロップ<br />
                  または「PDFを開く」「フォルダを開く」から読み込んでください
                </>
              )}
          </p>
          <p className="mt-4 text-xs text-gray-500">
            データはブラウザ内だけで処理されサーバーには送信されません
          </p>
        </div>
      ) : (
        <>
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
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={
                    <div className="w-[595px] h-[842px] flex items-center justify-center bg-white text-gray-400">
                    Loading PDF...
                    </div>
                }
                >
                <div
                    ref={containerRef}
                    className="relative pdf-page-container cursor-crosshair"
                    onClick={handlePageClick}
                >
                    <Page
                    pageNumber={currentPage}
                    width={595} // Base width, scale handled by parent
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadSuccess={handlePdfPageLoad}
                    />
                    {/* Overlays */}
                    {mode === 'template' ? (
                        <TemplateOverlay template={template} onChange={setTemplate} />
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
                </div>
                </Document>
            )}

            {docType === 'images' && currentImageUrl && (
                <div 
                    className="relative pdf-page-container cursor-crosshair bg-white"
                    ref={containerRef}
                    style={{
                        width: activeImgSize ? activeImgSize.width : 'auto',
                        height: activeImgSize ? activeImgSize.height : 'auto',
                        // Optional: Limit max display size if needed, but scaling handles it
                    }}
                    onClick={handlePageClick}
                >
                    <img 
                        src={currentImageUrl}
                        alt="Current page"
                        className="block select-none pointer-events-none" // prevent drag of image itself
                        draggable={false}
                        onLoad={handleImageLoad}
                    />
                    {/* Overlays (Only show if image is loaded to have correct dimensions) */}
                    {activeImgSize && (
                        <>
                            {mode === 'template' ? (
                                <TemplateOverlay template={template} onChange={setTemplate} />
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

          {/* Floating Zoom Controls */}
          <div className="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-40 border border-gray-200">
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
              ← → / Enter でページ移動
            </span>
          </div>
        </>
      )}
    </div>
  );
};
