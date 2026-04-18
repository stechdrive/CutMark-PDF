import { useMemo } from 'react';
import {
  createAssetHintsFromCurrentDocument,
  deriveCurrentProjectName,
} from '../application/currentDocumentProjection';
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

  const currentProjectName = useMemo(
    () =>
      deriveCurrentProjectName({
        docType,
        pdfFile,
        imageFiles,
      }),
    [docType, imageFiles, pdfFile]
  );

  return {
    currentAssetHints,
    currentProjectName,
  };
};
