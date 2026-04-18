import { AssetHint } from '../domain/project';
import { DocType } from '../types';

interface CurrentDocumentHintOptions {
  docType: DocType | null;
  pdfFile: File | null;
  imageFiles: File[];
  pageCount: number;
}

export const createAssetHintsFromCurrentDocument = ({
  docType,
  pdfFile,
  imageFiles,
  pageCount,
}: CurrentDocumentHintOptions): AssetHint[] => {
  if (docType === 'pdf' && pdfFile) {
    return Array.from({ length: pageCount }, (_, index) => ({
      sourceKind: 'pdf-page',
      sourceLabel: pdfFile.name,
      pageNumber: index + 1,
    }));
  }

  if (docType === 'images') {
    return Array.from({ length: pageCount }, (_, index) => {
      const image = imageFiles[index];
      return image
        ? {
            sourceKind: 'image',
            sourceLabel: image.name,
            pageNumber: index + 1,
          }
        : {
            sourceKind: 'image',
            sourceLabel: `image-${index + 1}`,
            pageNumber: index + 1,
          };
    });
  }

  return Array.from({ length: pageCount }, () => ({
    sourceKind: 'image',
    sourceLabel: '',
  }));
};

export const deriveCurrentProjectName = ({
  docType,
  pdfFile,
  imageFiles,
}: Omit<CurrentDocumentHintOptions, 'pageCount'>) => {
  const stripExtension = (name?: string) => name?.replace(/\.[^.]+$/, '') || name;

  if (docType === 'pdf') {
    return stripExtension(pdfFile?.name);
  }
  if (docType === 'images') {
    const folderName = imageFiles[0]?.webkitRelativePath?.split('/')[0];
    if (folderName) return folderName;

    const firstFileName = imageFiles[0]?.name;
    return stripExtension(firstFileName);
  }
  return undefined;
};
