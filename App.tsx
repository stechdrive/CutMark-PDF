import React, { useState, useMemo } from 'react';
import { pdfjs } from 'react-pdf';

import { Cut } from './types';
import { saveMarkedPdf } from './services/pdfService';

// Hooks
import { usePdfViewer } from './hooks/usePdfViewer';
import { useCuts } from './hooks/useCuts';
import { useTemplates } from './hooks/useTemplates';
import { useAppSettings } from './hooks/useAppSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PdfPreview } from './components/PdfPreview';

// Worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function App() {
  // --- Hooks ---
  const {
    pdfFile, numPages, currentPage, scale, isDragging,
    setNumPages, setCurrentPage, setScale, handleFileChange, dragHandlers
  } = usePdfViewer();

  const {
    cuts, selectedCutId, historyIndex, historyLength,
    setSelectedCutId, addCut, updateCutPosition, handleCutDragEnd, 
    deleteCut, undo, redo, resetCuts
  } = useCuts();

  const {
    templates, template, setTemplate, changeTemplate,
    saveCurrentTemplate, saveAsNewTemplate, updateTemplateName, deleteTemplate, distributeRows
  } = useTemplates();

  const {
    settings, setSettings, getNextLabel, incrementCounter
  } = useAppSettings();

  // --- UI State ---
  const [mode, setMode] = useState<'edit' | 'template'>('edit');

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

  // Reset logic when file changes
  const onFileLoaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e);
    resetCuts();
  };
  
  // Reset logic when file dropped
  const onFileDropped = (e: React.DragEvent<HTMLDivElement>) => {
    dragHandlers.onDrop(e);
    if (e.dataTransfer.files?.[0]?.type === 'application/pdf') {
       resetCuts();
    }
  };

  // Export
  const handleExport = async () => {
    if (!pdfFile) return;
    const arrayBuffer = await pdfFile.arrayBuffer();
    const modifiedPdfBytes = await saveMarkedPdf(arrayBuffer, cuts, settings);
    
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marked_${pdfFile.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        pdfFile={pdfFile}
        onFileChange={onFileLoaded}
        onExport={handleExport}
        mode={mode}
        setMode={setMode}
        canUndo={historyIndex > -1}
        canRedo={historyIndex < historyLength - 1}
        onUndo={undo}
        onRedo={redo}
      />

      <div className="flex flex-1 overflow-hidden">
        
        <PdfPreview
          pdfFile={pdfFile}
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
          onPdfClick={createCutAt}
        />

        <Sidebar
          mode={mode}
          setMode={setMode}
          pdfFile={pdfFile}
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