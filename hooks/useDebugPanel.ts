import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DebugLog } from './useDebugLogger';
import { AppSettings, DocType, Template } from '../types';
import { normalizeError, safeJsonStringify, toFileInfo } from '../utils/debugData';

type DebugLogData = unknown | (() => unknown);
const IMAGE_FILE_LOG_LIMIT = 30;

interface UseDebugPanelOptions {
  debugEnabled: boolean;
  debugLogs: DebugLog[];
  logDebug: (level: DebugLog['level'], message: string, data?: DebugLogData) => void;
  docType: DocType | null;
  mode: 'edit' | 'template';
  isExporting: boolean;
  currentPage: number;
  numPages: number;
  scale: number;
  activeProjectCutCount: number;
  previewCutCount: number;
  selectedCutId: string | null;
  pdfFile: File | null;
  imageFiles: File[];
  effectiveSettings: AppSettings;
  effectiveTemplate: Template;
  isLoadedProjectActive: boolean;
  canUndoHistory: boolean;
  canRedoHistory: boolean;
  activeHistoryIndex: number;
  activeHistoryLength: number;
  selectedLogicalPageId: string | null;
  pdfjsVersion?: string;
  pdfWorkerSrc?: string;
}

export const useDebugPanel = ({
  debugEnabled,
  debugLogs,
  logDebug,
  docType,
  mode,
  isExporting,
  currentPage,
  numPages,
  scale,
  activeProjectCutCount,
  previewCutCount,
  selectedCutId,
  pdfFile,
  imageFiles,
  effectiveSettings,
  effectiveTemplate,
  isLoadedProjectActive,
  canUndoHistory,
  canRedoHistory,
  activeHistoryIndex,
  activeHistoryLength,
  selectedLogicalPageId,
  pdfjsVersion,
  pdfWorkerSrc,
}: UseDebugPanelOptions) => {
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugCopyStatus, setDebugCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const debugTextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (debugOpen) {
      setDebugCopyStatus('idle');
    }
  }, [debugOpen]);

  useEffect(() => {
    if (!debugEnabled) {
      setDebugOpen(false);
    }
  }, [debugEnabled]);

  const debugReport = useMemo(() => {
    if (!debugEnabled) {
      return 'Debug disabled';
    }

    const imageFileSummary = {
      count: imageFiles.length,
      totalBytes: imageFiles.reduce((sum, file) => sum + file.size, 0),
      sampleNames: imageFiles.slice(0, IMAGE_FILE_LOG_LIMIT).map((file) => file.name),
      truncated: imageFiles.length > IMAGE_FILE_LOG_LIMIT,
    };
    const deviceMemory =
      'deviceMemory' in navigator
        ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
        : undefined;
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
      `cuts: total=${activeProjectCutCount}, currentPage=${previewCutCount}`,
      `selectedCutId: ${selectedCutId ?? 'none'}`,
      '',
      '[PDF File]',
      safeJsonStringify(toFileInfo(pdfFile)),
      '',
      '[Image Files]',
      safeJsonStringify(imageFileSummary),
      '',
      '[Settings]',
      safeJsonStringify(effectiveSettings),
      '',
      '[Template]',
      safeJsonStringify(effectiveTemplate),
      '',
      '[History]',
      isLoadedProjectActive
        ? safeJsonStringify({
            kind: 'project',
            canUndo: canUndoHistory,
            canRedo: canRedoHistory,
            historyIndex: activeHistoryIndex,
            historyLength: activeHistoryLength,
            selectedLogicalPageId,
          })
        : safeJsonStringify({
            historyIndex: activeHistoryIndex,
            historyLength: activeHistoryLength,
          }),
      '',
      '[PDF.js]',
      safeJsonStringify({
        version: pdfjsVersion ?? 'unknown',
        workerSrc: pdfWorkerSrc ?? 'unknown',
      }),
      '',
      '[Logs]',
      safeJsonStringify(debugLogs),
    ];

    return reportSections.join('\n');
  }, [
    activeHistoryIndex,
    activeHistoryLength,
    activeProjectCutCount,
    canRedoHistory,
    canUndoHistory,
    currentPage,
    debugEnabled,
    debugLogs,
    docType,
    effectiveSettings,
    effectiveTemplate,
    imageFiles,
    isExporting,
    isLoadedProjectActive,
    mode,
    numPages,
    pdfFile,
    previewCutCount,
    scale,
    selectedCutId,
    selectedLogicalPageId,
    pdfjsVersion,
    pdfWorkerSrc,
  ]);

  const handleCopyDebugReport = useCallback(async () => {
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
  }, [debugReport, logDebug]);

  const openDebug = useCallback(() => {
    if (!debugEnabled) return;
    setDebugOpen(true);
  }, [debugEnabled]);

  const closeDebug = useCallback(() => {
    setDebugOpen(false);
  }, []);

  return {
    debugEnabled,
    debugOpen,
    debugCopyStatus,
    debugTextRef,
    debugReport,
    openDebug,
    closeDebug,
    handleCopyDebugReport,
  };
};
