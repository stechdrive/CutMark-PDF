
import React, { useState, useMemo } from 'react';
import { pdfjs } from 'react-pdf';

import { Cut } from './types';
import { saveMarkedPdf, saveImagesAsPdf } from './services/pdfService';
import { exportImagesAsZip } from './services/imageExportService';

// Hooks
import { useDocumentViewer } from './hooks/useDocumentViewer';
import { useCuts } from './hooks/useCuts';
import { useTemplates } from './hooks/useTemplates';
import { useAppSettings } from './hooks/useAppSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DocumentPreview } from './components/DocumentPreview';

// Worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function App() {
  const {
    cuts, selectedCutId, historyIndex, historyLength,
    setSelectedCutId, addCut, updateCutPosition, handleCutDragEnd, 
    deleteCut, undo, redo, resetCuts
  } = useCuts();

  // --- Hooks ---
  const {
    docType, pdfFile, imageFiles, currentImageUrl,
    numPages, currentPage, scale, isDragging,
    loadPdf, loadImages,
    setNumPages, setCurrentPage, setScale, dragHandlers
  } = useDocumentViewer(resetCuts); // Pass resetCuts as callback

  const {
    templates, template, setTemplate, changeTemplate,
    saveCurrentTemplate, saveAsNewTemplate, updateTemplateName, deleteTemplate, distributeRows
  } = useTemplates();

  const {
    settings, setSettings, getNextLabel, incrementCounter
  } = useAppSettings();

  // --- UI State ---
  const [mode, setMode] = useState<'edit' | 'template'>('edit');
  const [isExporting, setIsExporting] = useState(false);

  // --- Logic Orchestration ---
  
  // Create a new cut at a specific position
  const createCutAt = (x: number, y: number) => {
    const newCut: Cut = {
      id: crypto.randomUUID(),
      pageIndex: currentPage - 1,
      x,
      y,
      label: getNextLabel(),
      isBranch: !!settings.branchChar,
    };
    
    addCut(newCut);
    incrementCounter();
  };

  // Row Snap (Keyboard 1-9 or Button)
  const handleRowSnap = (rowIndex: number) => {
    if (rowIndex >= template.rowPositions.length) return;
    const y = template.rowPositions[rowIndex];
    const x = template.xPosition;
    createCutAt(x, y);
  };

  // PDF Load
  const onPdfLoaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        loadPdf(file);
        // resetCuts called via callback
    }
  };

  // Folder Load
  const onFolderLoaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Filter valid image files in root (no recursive)
    const validFiles: File[] = [];
    const validExts = ['.jpg', '.jpeg', '.png'];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lowerName = file.name.toLowerCase();
        
        // Basic check: is it an image?
        const isImage = validExts.some(ext => lowerName.endsWith(ext));
        
        // Check depth (avoid subdirectories)
        // webkitRelativePath example: "folder/file.jpg" (ok) vs "folder/sub/file.jpg" (skip)
        const parts = file.webkitRelativePath.split('/');
        // When picking a folder, webkitRelativePath is usually set. 
        // If file input "multiple" is used for individual files, it might be empty.
        // We only care if we really want to restrict subdirectory recursion for Folder pick.
        const isRoot = parts.length <= 2; 

        if (isImage && isRoot) {
            validFiles.push(file);
        }
    }

    if (validFiles.length > 0) {
        loadImages(validFiles);
        // resetCuts called via callback
    } else {
        alert("有効な画像(JPG/PNG)がフォルダ直下に見つかりませんでした。");
    }
  };
  
  // Reset logic when file dropped
  const onFileDropped = (e: React.DragEvent<HTMLDivElement>) => {
    dragHandlers.onDrop(e);
    // onLoadComplete callback in hook handles resetCuts
  };

  // Export PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
        let pdfBytes: Uint8Array;
        let filename = 'marked.pdf';

        if (docType === 'pdf' && pdfFile) {
            const arrayBuffer = await pdfFile.arrayBuffer();
            pdfBytes = await saveMarkedPdf(arrayBuffer, cuts, settings);
            filename = `marked_${pdfFile.name}`;
        } else if (docType === 'images' && imageFiles.length > 0) {
            pdfBytes = await saveImagesAsPdf(imageFiles, cuts, settings);
            filename = 'marked_images.pdf';
        } else {
            return;
        }
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error(e);
        alert('PDF書き出し中にエラーが発生しました');
    } finally {
        setIsExporting(false);
    }
  };

  // Export Images
  const handleExportImages = async () => {
    if (docType !== 'images' || imageFiles.length === 0) {
        alert("画像の書き出しは連番画像モードでのみ利用可能です（PDFからの画像化は未対応）");
        return;
    }
    
    setIsExporting(true);
    try {
        await exportImagesAsZip(imageFiles, cuts, settings, (curr, total) => {
            // Optional: Update progress UI
            console.log(`Processing ${curr}/${total}`);
        });
    } catch (e) {
        console.error(e);
        alert('画像書き出し中にエラーが発生しました');
    } finally {
        setIsExporting(false);
    }
  };

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onPageNext: () => setCurrentPage(p => p + 1),
    onPagePrev: () => setCurrentPage(p => p - 1),
    onRowSnap: handleRowSnap
  });

  // Filter cuts for current page
  const currentCuts = useMemo(() => 
    cuts.filter(c => c.pageIndex === currentPage - 1), 
  [cuts, currentPage]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 font-sans overflow-hidden">
      
      <Header
        docType={docType}
        onPdfFileChange={onPdfLoaded}
        onFolderChange={onFolderLoaded}
        onExportPdf={handleExportPdf}
        onExportImages={handleExportImages}
        isExporting={isExporting}
        mode={mode}
        setMode={setMode}
        canUndo={historyIndex > -1}
        canRedo={historyIndex < historyLength - 1}
        onUndo={undo}
        onRedo={redo}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {isExporting && (
            <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center text-white flex-col gap-2">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
                <div className="font-bold">書き出し処理中...</div>
                <div className="text-sm opacity-80">大量の画像の場合、時間がかかることがあります</div>
            </div>
        )}
        
        <DocumentPreview
          docType={docType}
          pdfFile={pdfFile}
          currentImageUrl={currentImageUrl}
          numPages={numPages}
          setNumPages={setNumPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          scale={scale}
          setScale={setScale}
          isDragging={isDragging}
          dragHandlers={dragHandlers}
          onFileDropped={onFileDropped}
          
          cuts={currentCuts}
          selectedCutId={selectedCutId}
          setSelectedCutId={setSelectedCutId}
          deleteCut={deleteCut}
          updateCutPosition={updateCutPosition}
          handleCutDragEnd={handleCutDragEnd}
          
          mode={mode}
          template={template}
          setTemplate={setTemplate}
          settings={settings}
          onContentClick={createCutAt}
        />

        <Sidebar
          mode={mode}
          setMode={setMode}
          pdfFile={pdfFile || (imageFiles.length > 0 ? imageFiles[0] : null)}
          templates={templates}
          template={template}
          setTemplate={setTemplate}
          changeTemplate={changeTemplate}
          saveCurrentTemplate={saveCurrentTemplate}
          saveAsNewTemplate={saveAsNewTemplate}
          updateTemplateName={updateTemplateName}
          deleteTemplate={deleteTemplate}
          distributeRows={distributeRows}
          onRowSnap={handleRowSnap}
          settings={settings}
          setSettings={setSettings}
        />
        
      </div>
    </div>
  );
}
