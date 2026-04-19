
import React from 'react';
import { Document, Page } from 'react-pdf';
import { TemplateOverlay } from './TemplateOverlay';
import { CutMarker } from './CutMarker';
import { DocumentPreviewHud } from './documentPreview/DocumentPreviewHud';
import { DocumentPreviewNotice } from './documentPreview/DocumentPreviewNotice';
import { DocumentPreviewSnapOverlay } from './documentPreview/DocumentPreviewSnapOverlay';
import { DocumentPreviewWelcome } from './documentPreview/DocumentPreviewWelcome';
import { useDocumentPlacementInteraction } from '../hooks/useDocumentPlacementInteraction';
import { useDocumentPreviewViewport } from '../hooks/useDocumentPreviewViewport';
import { AppSettings, Cut, Template, DocType } from '../types';

const pdfDocumentOptions = {
  cMapUrl: `${import.meta.env.BASE_URL}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${import.meta.env.BASE_URL}standard_fonts/`,
} as const;

interface DocumentPreviewProps {
  layoutMode?: 'desktop' | 'mobile';
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
  layoutMode = 'desktop',
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
  const isMobileLayout = layoutMode === 'mobile';
  const previewStyle = isMobileLayout
    ? {
        padding: 'var(--preview-padding)',
        paddingBottom: 'calc(var(--mobile-dock-h, 0px) + var(--preview-padding))',
      }
    : { padding: '1rem' };
  const {
    viewportRef,
    containerRef,
    activeImgSize,
    isMiddlePanning,
    handleViewportMouseDown,
    handleViewportAuxClick,
    handleImageLoad,
    handlePdfPageLoad,
  } = useDocumentPreviewViewport({
    docType,
    pdfFile,
    currentImageUrl,
    currentPage,
    numPages,
    setCurrentPage,
    setScale,
    onPdfPageLoadSuccess,
  });
  const {
    snapTarget,
    showSnapCandidate,
    handlePagePointerDown,
    handlePagePointerMove,
    handlePagePointerUp,
    handlePagePointerCancel,
    handlePointerLeave,
  } = useDocumentPlacementInteraction({
    mode,
    settings,
    template,
    onContentClick,
    containerRef,
  });

  return (
    <div
      ref={viewportRef}
      className={`flex-1 min-h-0 relative overflow-auto flex flex-col items-center transition-colors ${
        isDragging
          ? 'bg-blue-100 border-4 border-blue-400 border-dashed'
          : isMiddlePanning
            ? 'bg-gray-200 cursor-grabbing'
            : 'bg-gray-200'
      }`}
      style={previewStyle}
      onDragEnter={dragHandlers.onDragEnter}
      onDragOver={dragHandlers.onDragOver}
      onDragLeave={dragHandlers.onDragLeave}
      onDrop={onFileDropped}
      onMouseDown={handleViewportMouseDown}
      onAuxClick={handleViewportAuxClick}
      onClick={() => setSelectedCutId(null)}
    >
      {!docType ? (
        <DocumentPreviewWelcome isDragging={isDragging} />
      ) : (
        <>
          {projectNotice && (
            <DocumentPreviewNotice
              title={projectNotice.title}
              message={projectNotice.message}
            />
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
                options={pdfDocumentOptions}
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
                    renderAnnotationLayer={true}
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
                            <DocumentPreviewSnapOverlay
                              template={template}
                              snapTarget={snapTarget}
                            />
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
                                <DocumentPreviewSnapOverlay
                                  template={template}
                                  snapTarget={snapTarget}
                                />
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

          <DocumentPreviewHud
            isMobileLayout={isMobileLayout}
            scale={scale}
            setScale={setScale}
            currentPage={currentPage}
            numPages={numPages}
            setCurrentPage={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};
