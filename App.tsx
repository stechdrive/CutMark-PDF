
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { pdfjs } from 'react-pdf';

import { Cut, NumberingState } from './types';
import { saveMarkedPdf, saveImagesAsPdf } from './services/pdfService';
import { exportImagesAsZip } from './services/imageExportService';
import {
  createAssetHintsFromCurrentDocument,
  createLegacyStateFromBoundProjectDocument,
  createLegacyStateFromProjectDocument,
  createProjectDocumentFromLegacySnapshot,
} from './adapters/legacyProjectAdapter';
import {
  downloadProjectDocument,
  loadProjectDocumentFromFile,
} from './repositories/projectRepository';
import {
  ProjectDocument,
  toNumberingPolicy,
  toStyleSettings,
  toTemplateSnapshot,
} from './domain/project';
import {
  applyBoundAssetHintsToProject,
  createSuggestedProjectAssetBindings,
  ProjectAssetBindings,
} from './application/projectBindings';
import { summarizeProjectAssetComparison } from './application/projectComparison';
import {
  advanceNumberingState,
  buildNumberLabel,
} from './domain/numbering';

// Hooks
import { useDocumentViewer } from './hooks/useDocumentViewer';
import { useCuts } from './hooks/useCuts';
import { useTemplates } from './hooks/useTemplates';
import { useAppSettings } from './hooks/useAppSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProjectEditor } from './hooks/useProjectEditor';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SidebarProjectPanel } from './components/SidebarProjectPanel';
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

const toCutLike = (pageIndex: number, cut: ProjectDocument['logicalPages'][number]['cuts'][number]): Cut => ({
  id: cut.id,
  pageIndex,
  x: cut.x,
  y: cut.y,
  label: cut.label,
  isBranch: cut.isBranch,
});

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
    deleteCut, setNumberingStateWithHistory, renumberFromCut, undo, redo, resetCuts, replaceCutsState
  } = useCuts({ numberingState, setNumberingState });

  const {
    docType, pdfFile, imageFiles, currentImageUrl,
    numPages, currentPage, scale, isDragging,
    loadPdf, loadImages,
    setNumPages, setCurrentPage, setScale, dragHandlers
  } = useDocumentViewer(resetCuts); // Pass resetCuts as callback

  const {
    templates, template, setTemplate, changeTemplate,
    saveTemplateByName, deleteTemplate, distributeRows, upsertTemplate
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

  const currentAssetHints = useMemo(() => {
    if (!docType) return [];

    const pageCount = docType === 'images' ? imageFiles.length : numPages;
    if (pageCount < 1) return [];

    return createAssetHintsFromCurrentDocument({
      docType,
      pdfFile,
      imageFiles,
      pageCount,
    });
  }, [docType, imageFiles, numPages, pdfFile]);

  const projectEditor = useProjectEditor(currentAssetHints);
  const loadedProject = projectEditor.project;
  const projectBindings = projectEditor.bindings;
  const canUndoProjectDraft = projectEditor.canUndo;
  const canRedoProjectDraft = projectEditor.canRedo;
  const selectedLogicalPage = projectEditor.selectedLogicalPage;
  const selectedLogicalPageId = projectEditor.selectedLogicalPageId;
  const selectedLogicalPageNumber = projectEditor.selectedLogicalPageNumber;
  const selectedLogicalPageAssetIndex = projectEditor.selectedAssetIndex;

  const projectComparison = useMemo(() => {
    if (!loadedProject) return null;
    return summarizeProjectAssetComparison(loadedProject, currentAssetHints);
  }, [currentAssetHints, loadedProject]);

  useEffect(() => {
    if (!selectedLogicalPageId) return;
    const assetIndex = projectBindings[selectedLogicalPageId];
    if (assetIndex == null) return;
    if (assetIndex + 1 !== currentPage) {
      setCurrentPage(assetIndex + 1);
    }
  }, [currentPage, projectBindings, selectedLogicalPageId, setCurrentPage]);
  const assignedProjectBindingCount = projectEditor.assignedCount;
  const canApplyLoadedProject = !!docType && projectEditor.canApply;
  const {
    loadProject: loadProjectIntoEditor,
    replaceProject: replaceEditorProject,
    selectLogicalPage: selectLogicalProjectPage,
    selectCut: selectProjectCut,
    assignAsset: assignProjectAsset,
    resetBindings: resetProjectBindings,
    insertPageAfter: insertProjectPageAfter,
    removePage: removeProjectPage,
    movePage: moveProjectPage,
    addCutToSelectedPage,
    updateCutPosition: updateProjectCutPosition,
    commitCutDrag,
    deleteCut: deleteProjectCut,
    renumberFromCut: renumberProjectFromCut,
    undo: undoProjectDraft,
    redo: redoProjectDraft,
  } = projectEditor;
  const canUndoHistory = loadedProject ? canUndoProjectDraft : historyIndex > -1;
  const canRedoHistory = loadedProject ? canRedoProjectDraft : historyIndex < historyLength - 1;
  const handleUndoAction = loadedProject ? undoProjectDraft : undo;
  const handleRedoAction = loadedProject ? redoProjectDraft : redo;

  const effectiveSettings = settings;
  const effectiveTemplate = template;
  const effectiveSelectedCutId = loadedProject ? projectEditor.selectedCutId : selectedCutId;
  const previewCuts = useMemo(
    () =>
      loadedProject && selectedLogicalPage
        ? selectedLogicalPage.cuts.map((cut) => toCutLike(currentPage - 1, cut))
        : cuts.filter((cut) => cut.pageIndex === currentPage - 1),
    [currentPage, cuts, loadedProject, selectedLogicalPage]
  );

  const projectStatusMessage = useMemo(() => {
    if (!loadedProject) return null;
    if (!selectedLogicalPage) {
      return '論理ページを選ぶと、割当先の素材ページへプレビューを合わせます。';
    }
    if (selectedLogicalPageAssetIndex == null) {
      return `論理P${selectedLogicalPageNumber ?? '?'} は未割当です。割当を決めると対応する素材ページを表示します。`;
    }
    return `論理P${selectedLogicalPageNumber ?? '?'} を現在P${selectedLogicalPageAssetIndex + 1} に割り当てています。`;
  }, [
    loadedProject,
    selectedLogicalPage,
    selectedLogicalPageAssetIndex,
    selectedLogicalPageNumber,
  ]);

  const materializeProjectDraft = useCallback((
    project: ProjectDocument,
    bindings: ProjectAssetBindings
  ) => {
    const projectWithBoundHints = applyBoundAssetHintsToProject(
      project,
      bindings,
      currentAssetHints
    );

    return {
      ...projectWithBoundHints,
      meta: {
        ...projectWithBoundHints.meta,
        savedAt: new Date().toISOString(),
      },
      numbering: toNumberingPolicy(settings),
      style: toStyleSettings(settings),
      template: toTemplateSnapshot(template),
    };
  }, [currentAssetHints, settings, template]);

  // --- Logic Orchestration ---
  
  // Create a new cut at a specific position
  const createCutAt = (x: number, y: number) => {
    if (loadedProject && selectedLogicalPageId) {
      const newCutId = crypto.randomUUID();
      const currentNumbering = {
        nextNumber: settings.nextNumber,
        branchChar: settings.branchChar,
      };
      const nextNumbering = advanceNumberingState(
        currentNumbering,
        settings.autoIncrement
      );

      addCutToSelectedPage({
        id: newCutId,
        x,
        y,
        label: buildNumberLabel(currentNumbering, settings.minDigits),
        isBranch: !!settings.branchChar,
      });
      setNumberingState(nextNumbering);
      return;
    }

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
    if (rowIndex >= effectiveTemplate.rowPositions.length) return;
    const y = effectiveTemplate.rowPositions[rowIndex];
    const x = effectiveTemplate.xPosition;
    createCutAt(x, y);
  };

  const handleRenumberFromSelected = useCallback((cutId: string) => {
    if (loadedProject) {
      const nextNumbering = renumberProjectFromCut(cutId, {
        nextNumber: settings.nextNumber,
        branchChar: settings.branchChar,
        minDigits: settings.minDigits,
        autoIncrement: settings.autoIncrement,
      });
      if (!nextNumbering) return;
      setNumberingState(nextNumbering);
      return;
    }

    renumberFromCut(
      cutId,
      {
        nextNumber: settings.nextNumber,
        branchChar: settings.branchChar,
      },
      settings.minDigits,
      settings.autoIncrement
    );
  }, [
    loadedProject,
    renumberFromCut,
    renumberProjectFromCut,
    setNumberingState,
    settings.autoIncrement,
    settings.branchChar,
    settings.minDigits,
    settings.nextNumber,
  ]);

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

  const applyLoadedProjectToCurrentDocument = useCallback((
    project: ProjectDocument,
    sourceFile: ReturnType<typeof toFileInfo> | null = null,
    bindings?: ProjectAssetBindings
  ) => {
    const projectForApply =
      bindings ? materializeProjectDraft(project, bindings) : project;
    const legacy = bindings
      ? createLegacyStateFromBoundProjectDocument(projectForApply, bindings)
      : createLegacyStateFromProjectDocument(projectForApply);
    setSettings(legacy.settings);
    upsertTemplate(legacy.template);
    replaceCutsState(legacy.cuts, legacy.numberingState);
    setCurrentPage(1);
    setMode('edit');

    logDebug('info', 'プロジェクト適用完了', () => ({
      projectName: legacy.projectName,
      logicalPages: legacy.logicalPageCount,
      cutCount: legacy.cuts.length,
      assignedPages: bindings
        ? Object.values(bindings).filter((pageIndex) => pageIndex != null).length
        : legacy.logicalPageCount,
      sourceFile,
    }));
  }, [logDebug, materializeProjectDraft, replaceCutsState, setCurrentPage, setSettings, upsertTemplate]);

  const handleProjectBindingChange = useCallback((logicalPageId: string, nextAssetIndex: number | null) => {
    assignProjectAsset(logicalPageId, nextAssetIndex);
  }, [assignProjectAsset]);

  const handleResetProjectBindings = useCallback(() => {
    if (!loadedProject) return;
    resetProjectBindings();
  }, [loadedProject, resetProjectBindings]);

  const handleSelectLogicalPage = useCallback((logicalPageId: string) => {
    selectLogicalProjectPage(logicalPageId);
  }, [selectLogicalProjectPage]);

  const handleSelectPreviewCut = useCallback((cutId: string | null) => {
    if (loadedProject) {
      selectProjectCut(cutId);
      return;
    }
    setSelectedCutId(cutId);
  }, [loadedProject, selectProjectCut, setSelectedCutId]);

  const handleDeletePreviewCut = useCallback((cutId: string) => {
    if (loadedProject) {
      deleteProjectCut(cutId);
      return;
    }

    deleteCut(cutId);
  }, [deleteCut, deleteProjectCut, loadedProject]);

  const handlePreviewCutPositionChange = useCallback((cutId: string, x: number, y: number) => {
    if (loadedProject) {
      updateProjectCutPosition(cutId, x, y);
      return;
    }

    updateCutPosition(cutId, x, y);
  }, [loadedProject, updateCutPosition, updateProjectCutPosition]);

  const handlePreviewCutDragEnd = useCallback(() => {
    if (loadedProject) {
      commitCutDrag();
      return;
    }

    handleCutDragEnd();
  }, [commitCutDrag, handleCutDragEnd, loadedProject]);

  const handleInsertLogicalPageAfter = useCallback((logicalPageId: string) => {
    insertProjectPageAfter(logicalPageId);
  }, [insertProjectPageAfter]);

  const handleRemoveLogicalPage = useCallback((logicalPageId: string) => {
    removeProjectPage(logicalPageId);
  }, [removeProjectPage]);

  const handleMoveLogicalPage = useCallback((logicalPageId: string, direction: -1 | 1) => {
    moveProjectPage(logicalPageId, direction);
  }, [moveProjectPage]);

  const handleApplyLoadedProject = useCallback(() => {
    if (!loadedProject || !canApplyLoadedProject) {
      return;
    }

    applyLoadedProjectToCurrentDocument(loadedProject, null, projectBindings);
  }, [applyLoadedProjectToCurrentDocument, canApplyLoadedProject, loadedProject, projectBindings]);

  const handleSaveProject = useCallback(() => {
    if (!docType) {
      alert('先にPDFまたは画像を読み込んでください');
      return;
    }

    if (loadedProject) {
      const project = materializeProjectDraft(loadedProject, projectBindings);
      replaceEditorProject(project, projectBindings);
      downloadProjectDocument(project);
      logDebug('info', 'プロジェクト保存', () => ({
        projectName: project.meta.name,
        logicalPages: project.logicalPages.length,
        cutCount: project.logicalPages.reduce((count, page) => count + page.cuts.length, 0),
      }));
      return;
    }

    const pageCount = Math.max(numPages, 1);
    const assetHints = createAssetHintsFromCurrentDocument({
      docType,
      pdfFile,
      imageFiles,
      pageCount,
    });

    const project = createProjectDocumentFromLegacySnapshot({
      cuts,
      settings,
      template,
      pageCount,
      assetHints,
      projectName:
        docType === 'pdf'
          ? pdfFile?.name
          : imageFiles[0]?.webkitRelativePath.split('/')[0] || imageFiles[0]?.name,
    });

    loadProjectIntoEditor(project);
    downloadProjectDocument(project);
    logDebug('info', 'プロジェクト保存', () => ({
      projectName: project.meta.name,
      logicalPages: project.logicalPages.length,
      cutCount: cuts.length,
    }));
  }, [
    cuts,
    docType,
    imageFiles,
    loadedProject,
    logDebug,
    materializeProjectDraft,
    numPages,
    pdfFile,
    projectBindings,
    settings,
    template,
    loadProjectIntoEditor,
    replaceEditorProject,
  ]);

  const onProjectLoaded = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    try {
      if (!file) return;

      const project = await loadProjectDocumentFromFile(file);
      const fileInfo = toFileInfo(file);
      const suggestedBindings = createSuggestedProjectAssetBindings(project, currentAssetHints);
      const legacySnapshot = createLegacyStateFromProjectDocument(project);

      loadProjectIntoEditor(project);
      setSettings(legacySnapshot.settings);
      upsertTemplate(legacySnapshot.template);
      logDebug('info', 'プロジェクト読込完了', () => ({
        projectName: project.meta.name,
        logicalPages: project.logicalPages.length,
        file: fileInfo,
      }));

      if (!docType || numPages < 1) {
        alert('プロジェクトを読み込みました。次にPDFまたは画像を読み込むと比較できます。');
        return;
      }

      if (project.logicalPages.length !== numPages) {
        alert(
          `このプロジェクトは ${project.logicalPages.length} ページですが、現在の素材は ${numPages} ページです。\n` +
          '論理ページの割当と増減は右パネルで調整できます。'
        );
        logDebug('warn', 'プロジェクト読込保留', () => ({
          reason: 'page-count-mismatch',
          projectPages: project.logicalPages.length,
          currentPages: numPages,
          file: fileInfo,
        }));
        return;
      }

      applyLoadedProjectToCurrentDocument(project, fileInfo, suggestedBindings);
    } catch (error) {
      alert('プロジェクト読込中にエラーが発生しました');
      logDebug('error', 'プロジェクト読込失敗', () => ({
        error: normalizeError(error),
        file: toFileInfo(file ?? null),
      }));
    } finally {
      e.target.value = '';
    }
  }, [applyLoadedProjectToCurrentDocument, currentAssetHints, docType, loadProjectIntoEditor, logDebug, numPages, setSettings, upsertTemplate]);

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
    onUndo: handleUndoAction,
    onRedo: handleRedoAction,
    onPageNext: () => setCurrentPage(p => p + 1),
    onPagePrev: () => setCurrentPage(p => p - 1),
    onRowSnap: handleRowSnap
  });

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
      `cuts: total=${loadedProject ? loadedProject.logicalPages.reduce((count, page) => count + page.cuts.length, 0) : cuts.length}, currentPage=${previewCuts.length}`,
      `selectedCutId: ${effectiveSelectedCutId ?? 'none'}`,
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
      loadedProject
        ? safeJsonStringify({
            kind: 'project',
            canUndo: canUndoProjectDraft,
            canRedo: canRedoProjectDraft,
            selectedLogicalPageId,
          })
        : safeJsonStringify({ historyIndex, historyLength }),
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
    effectiveSelectedCutId,
    loadedProject,
    pdfFile,
    previewCuts.length,
    imageFiles,
    settings,
    template,
    historyIndex,
    historyLength,
    canRedoProjectDraft,
    canUndoProjectDraft,
    selectedLogicalPageId,
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
        onProjectFileChange={onProjectLoaded}
        onSaveProject={handleSaveProject}
        onExportPdf={handleExportPdf}
        onExportImages={handleExportImages}
        isExporting={isExporting}
        mode={mode}
        setMode={setMode}
        canUndo={canUndoHistory}
        canRedo={canRedoHistory}
        onUndo={handleUndoAction}
        onRedo={handleRedoAction}
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
          
          cuts={previewCuts}
          selectedCutId={effectiveSelectedCutId}
          setSelectedCutId={handleSelectPreviewCut}
          deleteCut={handleDeletePreviewCut}
          updateCutPosition={handlePreviewCutPositionChange}
          handleCutDragEnd={handlePreviewCutDragEnd}
          
          mode={mode}
          template={effectiveTemplate}
          setTemplate={setTemplate}
          settings={effectiveSettings}
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
          selectedCutId={effectiveSelectedCutId}
          projectPanel={
            loadedProject && projectComparison ? (
              <SidebarProjectPanel
                projectName={loadedProject.meta.name}
                savedAt={loadedProject.meta.savedAt}
                selectedLogicalPageId={selectedLogicalPageId}
                statusMessage={projectStatusMessage}
                comparison={projectComparison}
                bindings={projectBindings}
                assignedCount={assignedProjectBindingCount}
                currentAssets={currentAssetHints}
                canApplyProject={canApplyLoadedProject}
                canResetBindings={currentAssetHints.length > 0}
                canUndoDraft={canUndoProjectDraft}
                canRedoDraft={canRedoProjectDraft}
                onSelectLogicalPage={handleSelectLogicalPage}
                onBindingChange={handleProjectBindingChange}
                onInsertLogicalPageAfter={handleInsertLogicalPageAfter}
                onRemoveLogicalPage={handleRemoveLogicalPage}
                onMoveLogicalPage={handleMoveLogicalPage}
                onResetBindings={handleResetProjectBindings}
                onUndoDraft={undoProjectDraft}
                onRedoDraft={redoProjectDraft}
                onApplyProject={handleApplyLoadedProject}
              />
            ) : undefined
          }
          templates={templates}
          template={effectiveTemplate}
          setTemplate={setTemplate}
          changeTemplate={changeTemplate}
          saveTemplateByName={saveTemplateByName}
          deleteTemplate={deleteTemplate}
          distributeRows={distributeRows}
          onRowSnap={handleRowSnap}
          settings={effectiveSettings}
          setSettings={setSettings}
          setNumberingState={loadedProject ? setNumberingState : setNumberingStateWithHistory}
          onRenumberFromSelected={handleRenumberFromSelected}
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
