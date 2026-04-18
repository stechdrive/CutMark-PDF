import { ChangeEvent, DragEvent, useCallback, useState } from 'react';
import { saveMarkedPdf, saveImagesAsPdf } from '../services/pdfService';
import { exportImagesAsZip } from '../services/imageExportService';
import { AppSettings, Cut, DocType } from '../types';
import { normalizeError, toFileInfo } from '../utils/debugData';

type DebugLogData = unknown | (() => unknown);

const IMAGE_FILE_LOG_LIMIT = 30;
const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

interface UseWorkspaceFileActionsOptions {
  docType: DocType | null;
  pdfFile: File | null;
  imageFiles: File[];
  effectiveExportCuts: Cut[];
  effectiveExportSettings: AppSettings;
  isLoadedProjectActive: boolean;
  canApplyLoadedProject: boolean;
  loadPdf: (file: File) => void;
  loadImages: (files: File[]) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

const isValidRootImageFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  const isImage = VALID_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const parts = file.webkitRelativePath.split('/');
  const isRoot = parts.length <= 2;
  return isImage && isRoot;
};

export const filterRootImageFiles = (files: FileList | File[]) => {
  const validFiles: File[] = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    if (file && isValidRootImageFile(file)) {
      validFiles.push(file);
    }
  }
  return validFiles;
};

export const useWorkspaceFileActions = ({
  docType,
  pdfFile,
  imageFiles,
  effectiveExportCuts,
  effectiveExportSettings,
  isLoadedProjectActive,
  canApplyLoadedProject,
  loadPdf,
  loadImages,
  onDrop,
  logDebug,
}: UseWorkspaceFileActionsOptions) => {
  const [isExporting, setIsExporting] = useState(false);

  const onPdfLoaded = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadPdf(file);
      logDebug('info', 'PDF読み込み開始', () => ({ file: toFileInfo(file) }));
      return;
    }

    logDebug('warn', 'PDF読み込みキャンセル');
  }, [loadPdf, logDebug]);

  const onFolderLoaded = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = filterRootImageFiles(files);

    if (validFiles.length > 0) {
      logDebug('info', 'フォルダ読み込み開始', () => ({
        totalFiles: files.length,
        validFiles: validFiles.length,
        sampleNames: validFiles.slice(0, IMAGE_FILE_LOG_LIMIT).map((file) => file.name),
        truncated: validFiles.length > IMAGE_FILE_LOG_LIMIT,
      }));
      loadImages(validFiles);
      return;
    }

    alert('有効な画像(JPG/PNG)がフォルダ直下に見つかりませんでした。');
    logDebug('warn', 'フォルダ読み込み失敗', () => ({
      totalFiles: files.length,
    }));
  }, [loadImages, logDebug]);

  const onFileDropped = useCallback((e: DragEvent<HTMLDivElement>) => {
    logDebug('info', 'ファイルドロップ', () => ({
      types: Array.from(e.dataTransfer?.types ?? []),
      itemCount: e.dataTransfer?.items?.length ?? 0,
    }));
    onDrop(e);
  }, [logDebug, onDrop]);

  const handleExportPdf = useCallback(async () => {
    if (isLoadedProjectActive && !canApplyLoadedProject) {
      alert('論理ページの割当を完了してから書き出してください');
      return;
    }

    setIsExporting(true);
    try {
      let pdfBytes: Uint8Array;
      let filename = 'marked.pdf';

      if (docType === 'pdf' && pdfFile) {
        filename = `marked_${pdfFile.name}`;
        logDebug('info', 'PDF書き出し開始', () => ({ mode: 'pdf', filename }));
        const arrayBuffer = await pdfFile.arrayBuffer();
        pdfBytes = await saveMarkedPdf(arrayBuffer, effectiveExportCuts, effectiveExportSettings);
      } else if (docType === 'images' && imageFiles.length > 0) {
        filename = 'marked_images.pdf';
        logDebug('info', 'PDF書き出し開始', () => ({ mode: 'images', filename }));
        pdfBytes = await saveImagesAsPdf(imageFiles, effectiveExportCuts, effectiveExportSettings);
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
    } catch (error) {
      console.error(error);
      alert('PDF書き出し中にエラーが発生しました');
      logDebug('error', 'PDF書き出し失敗', () => ({ error: normalizeError(error) }));
    } finally {
      setIsExporting(false);
    }
  }, [
    canApplyLoadedProject,
    docType,
    effectiveExportCuts,
    effectiveExportSettings,
    imageFiles,
    isLoadedProjectActive,
    logDebug,
    pdfFile,
  ]);

  const handleExportImages = useCallback(async () => {
    if (docType !== 'images' || imageFiles.length === 0) {
      alert('画像の書き出しは連番画像モードでのみ利用可能です（PDFからの画像化は未対応）');
      logDebug('warn', '画像書き出し不可', () => ({ docType, imageCount: imageFiles.length }));
      return;
    }

    if (isLoadedProjectActive && !canApplyLoadedProject) {
      alert('論理ページの割当を完了してから書き出してください');
      return;
    }

    setIsExporting(true);
    try {
      logDebug('info', '画像書き出し開始', () => ({ imageCount: imageFiles.length }));
      await exportImagesAsZip(imageFiles, effectiveExportCuts, effectiveExportSettings, (current, total) => {
        console.log(`Processing ${current}/${total}`);
      });
      logDebug('info', '画像書き出し完了');
    } catch (error) {
      console.error(error);
      alert('画像書き出し中にエラーが発生しました');
      logDebug('error', '画像書き出し失敗', () => ({ error: normalizeError(error) }));
    } finally {
      setIsExporting(false);
    }
  }, [
    canApplyLoadedProject,
    docType,
    effectiveExportCuts,
    effectiveExportSettings,
    imageFiles,
    isLoadedProjectActive,
    logDebug,
  ]);

  return {
    isExporting,
    onPdfLoaded,
    onFolderLoaded,
    onFileDropped,
    handleExportPdf,
    handleExportImages,
  };
};
