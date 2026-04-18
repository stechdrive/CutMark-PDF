import { useMemo } from 'react';
import { createAssetHintsFromCurrentDocument } from '../adapters/legacyProjectAdapter';
import { AssetHint } from '../domain/project';
import { DocType } from '../types';

interface UseCurrentDocumentMetadataOptions {
  docType: DocType | null;
  pdfFile: File | null;
  imageFiles: File[];
  numPages: number;
}

interface CurrentDocumentMetadata {
  currentAssetHints: AssetHint[];
  currentProjectName?: string;
}

export const useCurrentDocumentMetadata = ({
  docType,
  pdfFile,
  imageFiles,
  numPages,
}: UseCurrentDocumentMetadataOptions): CurrentDocumentMetadata => {
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

  const currentProjectName = useMemo(() => {
    if (docType === 'pdf') {
      return pdfFile?.name;
    }
    if (docType === 'images') {
      return imageFiles[0]?.webkitRelativePath.split('/')[0] || imageFiles[0]?.name;
    }
    return undefined;
  }, [docType, imageFiles, pdfFile]);

  return {
    currentAssetHints,
    currentProjectName,
  };
};
