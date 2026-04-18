import { ChangeEvent, DragEvent, useCallback } from 'react';
import {
  classifyImportFiles,
  createProjectImportContextFromPlan,
  createWorkspaceImportPlan,
  WorkspaceImportValidationError,
} from '../application/workspaceImport';
import { normalizeError, toFileInfo } from '../utils/debugData';
import type { ProjectImportContext } from './useProjectLifecycle';

type DebugLogData = unknown | (() => unknown);

const IMAGE_FILE_LOG_LIMIT = 30;

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

interface UseWorkspaceImportActionsOptions {
  loadPdf: (file: File) => void;
  loadImages: (files: File[]) => void;
  loadProjectFile: (file: File, importContext?: ProjectImportContext) => Promise<void>;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  logDebug: (level: 'info' | 'warn' | 'error', message: string, data?: DebugLogData) => void;
}

const isFileEntry = (entry: FileSystemEntry): entry is FileSystemFileEntry => entry.isFile;
const isDirectoryEntry = (entry: FileSystemEntry): entry is FileSystemDirectoryEntry =>
  entry.isDirectory;

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

export const useWorkspaceImportActions = ({
  loadPdf,
  loadImages,
  loadProjectFile,
  onDrop,
  logDebug,
}: UseWorkspaceImportActionsOptions) => {
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
          importContext = await createProjectImportContextFromPlan(plan);
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

  return {
    onImportFilesSelected,
    onFileDropped,
  };
};
