import React, { useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { Upload, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { TemplateOverlay } from './TemplateOverlay';
import { CutMarker } from './CutMarker';
import { AppSettings, Cut, Template } from '../types';

interface PdfPreviewProps {
  pdfFile: File | null;
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
  onPdfClick: (x: number, y: number) => void;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  pdfFile,
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
  onPdfClick,
}) => {
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const handlePageClick = (e: React.MouseEvent) => {
    if (mode === 'template') return;
    if (!pdfContainerRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Safety check for bounds
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      onPdfClick(x, y);
    }
  };

  return (
    <div
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
      {!pdfFile ? (
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
                  PDFファイルをドラッグ＆ドロップ<br />
                  または「PDFを開く」から読み込んでください
                </>
              )}
          </p>
          <p className="mt-4 text-xs text-gray-500">
            読み込んだPDFはこのブラウザ内だけで処理されサーバーには送信されません
          </p>
        </div>
      ) : (
        <>
          {/* PDF Wrapper */}
          <div
            className="relative shadow-lg transition-transform duration-200 ease-out border border-gray-300 bg-white"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
            }}
          >
            <Document
              file={pdfFile}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className="w-[595px] h-[842px] flex items-center justify-center bg-white text-gray-400">
                  Loading...
                </div>
              }
            >
              <div
                ref={pdfContainerRef}
                className="relative pdf-page-container cursor-crosshair"
                onClick={handlePageClick}
              >
                <Page
                  pageNumber={currentPage}
                  width={595} // A4 width in points roughly, react-pdf handles scaling
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />

                {/* Overlay Logic */}
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
                      containerRef={pdfContainerRef}
                    />
                  ))
                )}
              </div>
            </Document>
          </div>

          {/* Floating Zoom Controls */}
          <div className="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg p-2 flex gap-2 z-40 border border-gray-200">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
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
