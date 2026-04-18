import type { DragEvent } from 'react';
import { useWorkspaceImportActions } from './useWorkspaceImportActions';
import { useWorkspaceExportActions } from './useWorkspaceExportActions';
import { AppSettings, Cut, DocType } from '../types';
import type { ProjectImportContext } from './useProjectLifecycle';
export {
  classifyImportFiles,
  createWorkspaceImportPlan,
} from '../application/workspaceImport';

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
type DebugLogData = unknown | (() => unknown);

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
  const { onImportFilesSelected, onFileDropped } = useWorkspaceImportActions({
    loadPdf,
    loadImages,
    loadProjectFile,
    onDrop,
    logDebug,
  });

  const { handleExportPdf, handleExportImages } = useWorkspaceExportActions({
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
  });

  return {
    onImportFilesSelected,
    onFileDropped,
    handleExportPdf,
    handleExportImages,
  };
};
