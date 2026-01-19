
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';

import { Cut, NumberingState } from './types';
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

// Worker setup: GH-Pages でもローカルのワーカーを利用する
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

type DebugLog = {
  at: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
};

type DebugLogData = unknown | (() => unknown);

const MAX_DEBUG_LOGS = 200;
const IMAGE_FILE_LOG_LIMIT = 30;
const DEFAULT_IMAGE_FONT_SIZE = 28;
const IMAGE_A4_WIDTH_AT_150_DPI = 1240.5; // 8.27inch * 150dpi
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 72;

const toFileInfo = (file: File | null) => {
  if (!file) return null;
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toISOString(),
  };
};

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
};

const safeJsonStringify = (value: unknown) => {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (key, val) => {
      if (val instanceof Error) {
        return normalizeError(val);
      }
      if (val instanceof File) {
        return toFileInfo(val);
      }
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    },
    2
  );
};

export default function App() {
  const debugEnabled = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  }, []);

  // --- Hooks ---
  const {
    settings, setSettings, getNextLabel, getNextNumberingState
  } = useAppSettings();

  const setNumberingState = useCallback((next: NumberingState) => {
    setSettings(prev => ({
      ...prev,
      nextNumber: next.nextNumber,
      branchChar: next.branchChar,
    }));
  }, [setSettings]);

  const numberingState = useMemo(() => ({
    nextNumber: settings.nextNumber,
    branchChar: settings.branchChar,
  }), [settings.nextNumber, settings.branchChar]);

  const {
    cuts, selectedCutId, historyIndex, historyLength,
    setSelectedCutId, addCut, updateCutPosition, handleCutDragEnd, 
    deleteCut, setNumberingStateWithHistory, undo, redo, resetCuts
  } = useCuts({ numberingState, setNumberingState });

  const {
    docType, pdfFile, imageFiles, currentImageUrl,
    numPages, currentPage, scale, isDragging,
    loadPdf, loadImages,
    setNumPages, setCurrentPage, setScale, dragHandlers
  } = useDocumentViewer(resetCuts); // Pass resetCuts as callback

  const {
    templates, template, setTemplate, changeTemplate,
    saveTemplateByName, deleteTemplate, distributeRows
  } = useTemplates();

  // --- UI State ---
  const [mode, setMode] = useState<'edit' | 'template'>('edit');
  const [isExporting, setIsExporting] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [debugCopyStatus, setDebugCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const debugTextRef = useRef<HTMLTextAreaElement>(null);
  const pdfFontSizeAppliedRef = useRef(false);
  const pdfAutoFontSizeRef = useRef<number | null>(null);

  const logDebug = useCallback((level: DebugLog['level'], message: string, data?: DebugLogData) => {
    if (!debugEnabled) return;
    const payload = typeof data === 'function' ? data() : data;
    setDebugLogs(prev => {
      const next = [
        ...prev,
        {
          at: new Date().toISOString(),
          level,
          message,
          data: payload,
        },
      ];
      if (next.length > MAX_DEBUG_LOGS) {
        return next.slice(next.length - MAX_DEBUG_LOGS);
      }
      return next;
    });
  }, [debugEnabled]);

  useEffect(() => {
    if (!debugEnabled) return;
    const handleError = (event: ErrorEvent) => {
      logDebug('error', 'window.error', () => ({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: normalizeError(event.error),
      }));
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      logDebug('error', 'unhandledrejection', () => ({
        reason: normalizeError(event.reason),
      }));
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [debugEnabled, logDebug]);

  useEffect(() => {
    if (debugOpen) {
      setDebugCopyStatus('idle');
    }
  }, [debugOpen]);

  useEffect(() => {
    pdfFontSizeAppliedRef.current = false;
  }, [pdfFile]);

  useEffect(() => {
    if (docType !== 'images') return;
    if (pdfAutoFontSizeRef.current !== null && settings.fontSize === pdfAutoFontSizeRef.current) {
      setSettings(prev => ({
        ...prev,
        fontSize: DEFAULT_IMAGE_FONT_SIZE,
      }));
    }
    pdfAutoFontSizeRef.current = null;
  }, [docType, settings.fontSize, setSettings]);

  useEffect(() => {
    if (!debugEnabled) {
      setDebugOpen(false);
    }
  }, [debugEnabled]);

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
    
    const nextNumbering = getNextNumberingState();
    addCut(newCut, nextNumbering);
  };

  // Row Snap (Keyboard 1-9 or Button)
  const handleRowSnap = (rowIndex: number) => {
    if (rowIndex >= template.rowPositions.length) return;
    const y = template.rowPositions[rowIndex];
    const x = template.xPosition;
    createCutAt(x, y);
  };

  const applyPdfDefaultFontSize = useCallback((page: { originalWidth: number }) => {
    if (docType !== 'pdf') return;
    if (pdfFontSizeAppliedRef.current) return;
    if (settings.fontSize !== DEFAULT_IMAGE_FONT_SIZE) return;

    const ratio = DEFAULT_IMAGE_FONT_SIZE / IMAGE_A4_WIDTH_AT_150_DPI;
    const proposed = Math.round(page.originalWidth * ratio);
    const nextFontSize = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, proposed));

    pdfFontSizeAppliedRef.current = true;
    pdfAutoFontSizeRef.current = nextFontSize;
    if (nextFontSize !== settings.fontSize) {
      setSettings(prev => ({
        ...prev,
        fontSize: nextFontSize,
      }));
    }
  }, [docType, settings.fontSize, setSettings]);

  // PDF Load
  const onPdfLoaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        loadPdf(file);
        logDebug('info', 'PDF読み込み開始', () => ({ file: toFileInfo(file) }));
        // resetCuts called via callback
    } else {
        logDebug('warn', 'PDF読み込みキャンセル');
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
        logDebug('info', 'フォルダ読み込み開始', () => ({
          totalFiles: files.length,
          validFiles: validFiles.length,
          sampleNames: validFiles.slice(0, IMAGE_FILE_LOG_LIMIT).map(file => file.name),
          truncated: validFiles.length > IMAGE_FILE_LOG_LIMIT,
        }));
        loadImages(validFiles);
        // resetCuts called via callback
    } else {
        alert("有効な画像(JPG/PNG)がフォルダ直下に見つかりませんでした。");
        logDebug('warn', 'フォルダ読み込み失敗', () => ({
          totalFiles: files.length,
        }));
    }
  };
  
  // Reset logic when file dropped
  const onFileDropped = (e: React.DragEvent<HTMLDivElement>) => {
    logDebug('info', 'ファイルドロップ', () => ({
      types: Array.from(e.dataTransfer?.types ?? []),
      itemCount: e.dataTransfer?.items?.length ?? 0,
    }));
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
            filename = `marked_${pdfFile.name}`;
            logDebug('info', 'PDF書き出し開始', () => ({ mode: 'pdf', filename }));
            const arrayBuffer = await pdfFile.arrayBuffer();
            pdfBytes = await saveMarkedPdf(arrayBuffer, cuts, settings);
        } else if (docType === 'images' && imageFiles.length > 0) {
            filename = 'marked_images.pdf';
            logDebug('info', 'PDF書き出し開始', () => ({ mode: 'images', filename }));
            pdfBytes = await saveImagesAsPdf(imageFiles, cuts, settings);
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
        logDebug('info', 'PDF書き出し完了', () => ({ filename }));
    } catch (e) {
        console.error(e);
        alert('PDF書き出し中にエラーが発生しました');
        logDebug('error', 'PDF書き出し失敗', () => ({ error: normalizeError(e) }));
    } finally {
        setIsExporting(false);
    }
  };

  // Export Images
  const handleExportImages = async () => {
    if (docType !== 'images' || imageFiles.length === 0) {
        alert("画像の書き出しは連番画像モードでのみ利用可能です（PDFからの画像化は未対応）");
        logDebug('warn', '画像書き出し不可', () => ({ docType, imageCount: imageFiles.length }));
        return;
    }
    
    setIsExporting(true);
    try {
        logDebug('info', '画像書き出し開始', () => ({ imageCount: imageFiles.length }));
        await exportImagesAsZip(imageFiles, cuts, settings, (curr, total) => {
            // Optional: Update progress UI
            console.log(`Processing ${curr}/${total}`);
        });
        logDebug('info', '画像書き出し完了');
    } catch (e) {
        console.error(e);
        alert('画像書き出し中にエラーが発生しました');
        logDebug('error', '画像書き出し失敗', () => ({ error: normalizeError(e) }));
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

  const debugReport = useMemo(() => {
    if (!debugEnabled) {
      return 'Debug disabled';
    }
    const imageFileSummary = {
      count: imageFiles.length,
      totalBytes: imageFiles.reduce((sum, file) => sum + file.size, 0),
      sampleNames: imageFiles.slice(0, IMAGE_FILE_LOG_LIMIT).map(file => file.name),
      truncated: imageFiles.length > IMAGE_FILE_LOG_LIMIT,
    };

    const deviceMemory =
      'deviceMemory' in navigator
        ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
        : undefined;
    const pdfjsVersion = (pdfjs as { version?: string }).version;

    const reportSections = [
      'CutMark PDF Debug Report',
      `timestamp: ${new Date().toISOString()}`,
      '',
      '[App]',
      `version: ${__APP_VERSION__}`,
      `baseUrl: ${import.meta.env.BASE_URL}`,
      `location: ${window.location.href}`,
      '',
      '[Environment]',
      `userAgent: ${navigator.userAgent}`,
      `language: ${navigator.language}`,
      `platform: ${navigator.platform}`,
      `deviceMemory: ${deviceMemory ?? 'n/a'}`,
      `hardwareConcurrency: ${navigator.hardwareConcurrency ?? 'n/a'}`,
      `screen: ${window.screen.width}x${window.screen.height}`,
      `devicePixelRatio: ${window.devicePixelRatio}`,
      '',
      '[Document]',
      `docType: ${docType ?? 'none'}`,
      `mode: ${mode}`,
      `isExporting: ${isExporting}`,
      `currentPage: ${currentPage} / ${numPages}`,
      `scale: ${scale}`,
      `cuts: total=${cuts.length}, currentPage=${currentCuts.length}`,
      `selectedCutId: ${selectedCutId ?? 'none'}`,
      '',
      '[PDF File]',
      safeJsonStringify(toFileInfo(pdfFile)),
      '',
      '[Image Files]',
      safeJsonStringify(imageFileSummary),
      '',
      '[Settings]',
      safeJsonStringify(settings),
      '',
      '[Template]',
      safeJsonStringify(template),
      '',
      '[History]',
      safeJsonStringify({ historyIndex, historyLength }),
      '',
      '[PDF.js]',
      safeJsonStringify({
        version: pdfjsVersion ?? 'unknown',
        workerSrc: pdfjs.GlobalWorkerOptions.workerSrc ?? 'unknown',
      }),
      '',
      '[Logs]',
      safeJsonStringify(debugLogs),
    ];

    return reportSections.join('\n');
  }, [
    debugEnabled,
    debugLogs,
    docType,
    mode,
    isExporting,
    currentPage,
    numPages,
    scale,
    cuts.length,
    currentCuts.length,
    selectedCutId,
    pdfFile,
    imageFiles,
    settings,
    template,
    historyIndex,
    historyLength,
  ]);

  const handleCopyDebugReport = async () => {
    try {
      await navigator.clipboard.writeText(debugReport);
      setDebugCopyStatus('copied');
      return;
    } catch (error) {
      const fallbackTarget = debugTextRef.current;
      if (!fallbackTarget) {
        setDebugCopyStatus('failed');
        logDebug('error', 'デバッグログのコピー失敗', () => ({ error: normalizeError(error) }));
        return;
      }
      fallbackTarget.focus();
      fallbackTarget.select();
      try {
        const ok = document.execCommand('copy');
        setDebugCopyStatus(ok ? 'copied' : 'failed');
        if (!ok) {
          logDebug('error', 'デバッグログのコピー失敗', () => ({ error: normalizeError(error) }));
        }
      } catch (fallbackError) {
        setDebugCopyStatus('failed');
        logDebug('error', 'デバッグログのコピー失敗', () => ({
          error: normalizeError(fallbackError),
        }));
      }
    }
  };

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
        onOpenDebug={() => setDebugOpen(true)}
        showDebug={debugEnabled}
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
          onPdfLoadSuccess={(pages) => logDebug('info', 'PDF読み込み成功', () => ({ numPages: pages }))}
          onPdfLoadError={(error) => logDebug('error', 'PDF読み込み失敗', () => ({ error: normalizeError(error) }))}
          onPdfSourceError={(error) => logDebug('error', 'PDFソース読み込み失敗', () => ({ error: normalizeError(error) }))}
          onPdfPageLoadSuccess={applyPdfDefaultFontSize}
          onPdfPageError={(error) => logDebug('error', 'PDFページ読み込み失敗', () => ({ error: normalizeError(error) }))}
          onImageLoadError={(src) => logDebug('error', '画像読み込み失敗', () => ({ src }))}
        />

        <Sidebar
          mode={mode}
          setMode={setMode}
          pdfFile={pdfFile || (imageFiles.length > 0 ? imageFiles[0] : null)}
          templates={templates}
          template={template}
          setTemplate={setTemplate}
          changeTemplate={changeTemplate}
          saveTemplateByName={saveTemplateByName}
          deleteTemplate={deleteTemplate}
          distributeRows={distributeRows}
          onRowSnap={handleRowSnap}
          settings={settings}
          setSettings={setSettings}
          setNumberingState={setNumberingStateWithHistory}
        />
        
      </div>

      {debugOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="font-bold text-sm text-gray-800">デバッグログ</div>
              <button
                onClick={() => setDebugOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                閉じる
              </button>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                ref={debugTextRef}
                readOnly
                value={debugReport}
                className="w-full h-80 p-3 text-xs font-mono border border-gray-200 rounded bg-gray-50 text-gray-700"
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  このログをコピーして共有してください
                </div>
                <div className="flex items-center gap-2">
                  {debugCopyStatus === 'copied' && (
                    <span className="text-xs text-green-600">コピーしました</span>
                  )}
                  {debugCopyStatus === 'failed' && (
                    <span className="text-xs text-red-600">コピーできませんでした</span>
                  )}
                  <button
                    onClick={handleCopyDebugReport}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
                  >
                    コピー
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
