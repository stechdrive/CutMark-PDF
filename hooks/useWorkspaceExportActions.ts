import { useCallback } from 'react';
import { saveMarkedPdf, saveImagesAsPdf } from '../services/pdfService';
import { exportImagesAsZip } from '../services/imageExportService';
import { AppSettings, Cut, DocType } from '../types';
import { normalizeError } from '../utils/debugData';

type DebugLogData = unknown | (() => unknown);

interface UseWorkspaceExportActionsOptions {
  docType: DocType | null;
  pdfFile: File | null;
  imageFiles: File[];
  effectiveExportCuts: Cut[];
  effectiveExportSettings: AppSettings;
  isLoadedProjectActive: boolean;
  canApplyLoadedProject: boolean;
  exportProjectFile: () => void;
  includeProjectFileOnExport: boolean;
  setIsExporting: (next: boolean) => void;
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const useWorkspaceExportActions = ({
  docType,
  pdfFile,
  imageFiles,
  effectiveExportCuts,
  effectiveExportSettings,
  isLoadedProjectActive,
  canApplyLoadedProject,
  exportProjectFile,
  includeProjectFileOnExport,
  setIsExporting,
  logDebug,
}: UseWorkspaceExportActionsOptions) => {
  const handleExportPdf = useCallback(async () => {
    if (isLoadedProjectActive && !canApplyLoadedProject) {
      alert('カット番号ページの割付を完了してから書き出してください');
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

      downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), filename);

      if (includeProjectFileOnExport) {
        exportProjectFile();
        logDebug('info', 'プロジェクトファイル同梱書き出し', () => ({ alongside: filename }));
      }

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
    exportProjectFile,
    imageFiles,
    includeProjectFileOnExport,
    isLoadedProjectActive,
    logDebug,
    pdfFile,
    setIsExporting,
  ]);

  const handleExportImages = useCallback(async () => {
    if (docType !== 'images' || imageFiles.length === 0) {
      alert('画像の書き出しは連番画像モードでのみ利用可能です（PDFからの画像化は未対応）');
      logDebug('warn', '画像書き出し不可', () => ({ docType, imageCount: imageFiles.length }));
      return;
    }

    if (isLoadedProjectActive && !canApplyLoadedProject) {
      alert('カット番号ページの割付を完了してから書き出してください');
      return;
    }

    setIsExporting(true);
    try {
      logDebug('info', '画像書き出し開始', () => ({ imageCount: imageFiles.length }));
      const didExport = await exportImagesAsZip(imageFiles, effectiveExportCuts, effectiveExportSettings, (current, total) => {
        console.log(`Processing ${current}/${total}`);
      });

      if (didExport === false) {
        logDebug('info', '画像書き出しキャンセル');
        return;
      }

      if (includeProjectFileOnExport) {
        exportProjectFile();
        logDebug('info', 'プロジェクトファイル同梱書き出し', () => ({ alongside: 'zip' }));
      }

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
    exportProjectFile,
    imageFiles,
    includeProjectFileOnExport,
    isLoadedProjectActive,
    logDebug,
    setIsExporting,
  ]);

  return {
    handleExportPdf,
    handleExportImages,
  };
};
