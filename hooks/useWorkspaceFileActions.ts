import { ChangeEvent, DragEvent, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { createAssetHintsFromCurrentDocument } from '../application/currentDocumentProjection';
import { saveMarkedPdf, saveImagesAsPdf } from '../services/pdfService';
import { exportImagesAsZip } from '../services/imageExportService';
import { AppSettings, Cut, DocType } from '../types';
import { normalizeError, toFileInfo } from '../utils/debugData';
import type { ProjectImportContext } from './useProjectLifecycle';

type DebugLogData = unknown | (() => unknown);

const IMAGE_FILE_LOG_LIMIT = 30;
const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

class WorkspaceImportValidationError extends Error {}

type FileSystemEntry = {
  isFile: boolean;
  isDirectory: boolean;
};

type FileSystemFileEntry = FileSystemEntry & {
  isFile: true;
  file: (success: (file: File) => void, error?: () => void) => void;
};

type FileSystemDirectoryEntry = FileSystemEntry & {
  isDirectory: true;
  createReader: () => FileSystemDirectoryReader;
};

type FileSystemDirectoryReader = {
  readEntries: (success: (entries: FileSystemEntry[]) => void, error?: () => void) => void;
};

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntry | null;
};

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
  loadProjectFile: (file: File, importContext?: ProjectImportContext) => Promise<void>;
  exportProjectFile: () => void;
  includeProjectFileOnExport: boolean;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  setIsExporting: (next: boolean) => void;
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

interface WorkspaceImportSelection {
  projectFiles: File[];
  pdfFiles: File[];
  imageFiles: File[];
  unsupportedFiles: File[];
}

interface WorkspaceImportPlan {
  projectFile: File | null;
  assetType: 'none' | 'pdf' | 'images';
  pdfFile: File | null;
  imageFiles: File[];
  unsupportedFiles: File[];
}

const isFileEntry = (entry: FileSystemEntry): entry is FileSystemFileEntry => entry.isFile;
const isDirectoryEntry = (entry: FileSystemEntry): entry is FileSystemDirectoryEntry =>
  entry.isDirectory;

const isProjectFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return file.type === 'application/json' || lowerName.endsWith('.json');
};

const isPdfFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return file.type === 'application/pdf' || lowerName.endsWith('.pdf');
};

const isImageFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return VALID_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
};

const sortImageFilesNaturally = (files: File[]) =>
  [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

export const classifyImportFiles = (files: FileList | File[]): WorkspaceImportSelection => {
  const selection: WorkspaceImportSelection = {
    projectFiles: [],
    pdfFiles: [],
    imageFiles: [],
    unsupportedFiles: [],
  };

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    if (!file) continue;

    if (isProjectFile(file)) {
      selection.projectFiles.push(file);
      continue;
    }

    if (isPdfFile(file)) {
      selection.pdfFiles.push(file);
      continue;
    }

    if (isImageFile(file)) {
      selection.imageFiles.push(file);
      continue;
    }

    selection.unsupportedFiles.push(file);
  }

  return selection;
};

export const createWorkspaceImportPlan = ({
  projectFiles,
  pdfFiles,
  imageFiles,
  unsupportedFiles,
}: WorkspaceImportSelection): WorkspaceImportPlan => {
  const supportedFileCount = projectFiles.length + pdfFiles.length + imageFiles.length;
  if (supportedFileCount === 0) {
    throw new WorkspaceImportValidationError(
      '読み込めるファイルが見つかりませんでした。PDF、プロジェクトJSON、JPG/PNG を選んでください。'
    );
  }

  if (projectFiles.length > 1) {
    throw new WorkspaceImportValidationError('プロジェクトファイルは1つだけ選んでください。');
  }

  if (pdfFiles.length > 1) {
    throw new WorkspaceImportValidationError('PDFは1つだけ選んでください。');
  }

  if (pdfFiles.length > 0 && imageFiles.length > 0) {
    throw new WorkspaceImportValidationError(
      '素材は PDF 1つ か 連番画像(JPG/PNG) のどちらか一方だけを選んでください。'
    );
  }

  if (pdfFiles.length === 1) {
    return {
      projectFile: projectFiles[0] ?? null,
      assetType: 'pdf',
      pdfFile: pdfFiles[0],
      imageFiles: [],
      unsupportedFiles,
    };
  }

  if (imageFiles.length > 0) {
    return {
      projectFile: projectFiles[0] ?? null,
      assetType: 'images',
      pdfFile: null,
      imageFiles: sortImageFilesNaturally(imageFiles),
      unsupportedFiles,
    };
  }

  return {
    projectFile: projectFiles[0] ?? null,
    assetType: 'none',
    pdfFile: null,
    imageFiles: [],
    unsupportedFiles,
  };
};

const createProjectImportContext = async (
  plan: WorkspaceImportPlan
): Promise<ProjectImportContext | undefined> => {
  if (plan.assetType === 'images') {
    return {
      docType: 'images',
      numPages: plan.imageFiles.length,
      currentAssetHints: createAssetHintsFromCurrentDocument({
        docType: 'images',
        pdfFile: null,
        imageFiles: plan.imageFiles,
        pageCount: plan.imageFiles.length,
      }),
    };
  }

  if (plan.assetType === 'pdf' && plan.pdfFile) {
    const pdfBytes = await plan.pdfFile.arrayBuffer();
    const pdfDocument = await PDFDocument.load(pdfBytes);
    const numPages = pdfDocument.getPageCount();

    return {
      docType: 'pdf',
      numPages,
      currentAssetHints: createAssetHintsFromCurrentDocument({
        docType: 'pdf',
        pdfFile: plan.pdfFile,
        imageFiles: [],
        pageCount: numPages,
      }),
    };
  }

  return undefined;
};

const readDroppedDirectoryEntries = async (reader: FileSystemDirectoryReader) => {
  const allEntries: FileSystemEntry[] = [];

  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => {
      reader.readEntries((entries) => resolve(entries), () => resolve([]));
    });

    if (batch.length === 0) {
      break;
    }

    allEntries.push(...batch);
  }

  return allEntries;
};

const collectDroppedFiles = async (items: DataTransferItemList): Promise<File[]> => {
  const entries: FileSystemEntry[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index] as DataTransferItemWithEntry;
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      entries.push(entry);
    }
  }

  if (entries.length === 0) {
    const files: File[] = [];
    for (let index = 0; index < items.length; index++) {
      const file = items[index].getAsFile();
      if (file) {
        files.push(file);
      }
    }
    return files;
  }

  const files: File[] = [];

  const readEntry = async (entry: FileSystemEntry): Promise<void> => {
    if (isFileEntry(entry)) {
      await new Promise<void>((resolve) => {
        entry.file((file) => {
          files.push(file);
          resolve();
        }, () => resolve());
      });
      return;
    }

    if (isDirectoryEntry(entry)) {
      const childEntries = await readDroppedDirectoryEntries(entry.createReader());
      for (const childEntry of childEntries) {
        if (!isFileEntry(childEntry)) {
          continue;
        }

        await new Promise<void>((resolve) => {
          childEntry.file((file) => {
            files.push(file);
            resolve();
          }, () => resolve());
        });
      }
    }
  };

  await Promise.all(entries.map((entry) => readEntry(entry)));
  return files;
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
  loadProjectFile,
  exportProjectFile,
  includeProjectFileOnExport,
  onDrop,
  setIsExporting,
  logDebug,
}: UseWorkspaceFileActionsOptions) => {
  const importFiles = useCallback(async (selectedFiles: FileList | File[]) => {
    try {
      if (!selectedFiles || selectedFiles.length === 0) {
        logDebug('warn', '読み込みキャンセル');
        return;
      }

      const plan = createWorkspaceImportPlan(classifyImportFiles(selectedFiles));
      let importContext: ProjectImportContext | undefined;

      if (plan.projectFile && plan.assetType !== 'none') {
        try {
          importContext = await createProjectImportContext(plan);
        } catch (error) {
          if (plan.assetType === 'pdf' && plan.pdfFile) {
            loadPdf(plan.pdfFile);
          } else if (plan.assetType === 'images' && plan.imageFiles.length > 0) {
            loadImages(plan.imageFiles);
          }

          alert('素材は読み込みましたが、プロジェクトとの同時読込準備に失敗しました。プロジェクトはあとから読み込んでください。');
          logDebug('error', '同時読込の事前解析失敗', () => ({
            error: normalizeError(error),
            projectFile: toFileInfo(plan.projectFile),
            pdfFile: toFileInfo(plan.pdfFile),
            imageCount: plan.imageFiles.length,
          }));
          return;
        }
      }

      logDebug('info', '読み込み開始', () => ({
        projectFile: toFileInfo(plan.projectFile),
        pdfFile: toFileInfo(plan.pdfFile),
        imageCount: plan.imageFiles.length,
        sampleImages: plan.imageFiles.slice(0, IMAGE_FILE_LOG_LIMIT).map((file) => file.name),
        truncated: plan.imageFiles.length > IMAGE_FILE_LOG_LIMIT,
        ignoredFiles: plan.unsupportedFiles.map((file) => file.name),
      }));

      if (plan.assetType === 'pdf' && plan.pdfFile) {
        loadPdf(plan.pdfFile);
      } else if (plan.assetType === 'images' && plan.imageFiles.length > 0) {
        loadImages(plan.imageFiles);
      }

      if (plan.projectFile) {
        await loadProjectFile(plan.projectFile, importContext);
      }

      if (plan.unsupportedFiles.length > 0) {
        logDebug('warn', '未対応ファイルを無視', () => ({
          files: plan.unsupportedFiles.map((file) => file.name),
        }));
      }
    } catch (error) {
      const isValidationError = error instanceof WorkspaceImportValidationError;
      const files = Array.from(selectedFiles);
      alert(isValidationError ? error.message : '読み込み中にエラーが発生しました');
      logDebug(isValidationError ? 'warn' : 'error', '読み込み失敗', () => ({
        error: normalizeError(error),
        files: files.map((file) => toFileInfo(file)),
      }));
    }
  }, [loadImages, loadPdf, loadProjectFile, logDebug]);

  const onImportFilesSelected = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files) {
        logDebug('warn', '読み込みキャンセル');
        return;
      }

      await importFiles(e.target.files);
    } finally {
      e.target.value = '';
    }
  }, [importFiles, logDebug]);

  const onFileDropped = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    logDebug('info', 'ファイルドロップ', () => ({
      types: Array.from(e.dataTransfer?.types ?? []),
      itemCount: e.dataTransfer?.items?.length ?? 0,
    }));

    onDrop(e);

    const droppedFiles = e.dataTransfer?.items?.length
      ? await collectDroppedFiles(e.dataTransfer.items)
      : Array.from(e.dataTransfer?.files ?? []);

    await importFiles(droppedFiles);
  }, [importFiles, logDebug, onDrop]);

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
      alert('論理ページの割当を完了してから書き出してください');
      return;
    }

    setIsExporting(true);
    try {
      logDebug('info', '画像書き出し開始', () => ({ imageCount: imageFiles.length }));
      await exportImagesAsZip(imageFiles, effectiveExportCuts, effectiveExportSettings, (current, total) => {
        console.log(`Processing ${current}/${total}`);
      });

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
    onImportFilesSelected,
    onFileDropped,
    handleExportPdf,
    handleExportImages,
  };
};
