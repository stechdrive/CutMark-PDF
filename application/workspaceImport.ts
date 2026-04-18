import { createAssetHintsFromCurrentDocument } from './currentDocumentProjection';
import type { ProjectImportContext } from '../hooks/useProjectLifecycle';

const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

export class WorkspaceImportValidationError extends Error {}

export interface WorkspaceImportSelection {
  projectFiles: File[];
  pdfFiles: File[];
  imageFiles: File[];
  unsupportedFiles: File[];
}

export interface WorkspaceImportPlan {
  projectFile: File | null;
  assetType: 'none' | 'pdf' | 'images';
  pdfFile: File | null;
  imageFiles: File[];
  unsupportedFiles: File[];
}

const isProjectFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return (
    file.type === 'application/json' ||
    lowerName.endsWith('.cutmark') ||
    lowerName.endsWith('.json')
  );
};

const isPdfFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return file.type === 'application/pdf' || lowerName.endsWith('.pdf');
};

const isImageFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return VALID_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
};

export const sortImageFilesNaturally = (files: File[]) =>
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
      '読み込めるファイルが見つかりませんでした。PDF、プロジェクトファイル、JPG/PNG を選んでください。'
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

export const createProjectImportContextFromPlan = async (
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
    return {
      docType: 'pdf',
      numPages: 0,
      currentAssetHints: [],
      autoApplyWhenReady: true,
    };
  }

  return undefined;
};
