import { AppSettings, Cut, DocType, Template } from '../types';
import { AssetHint, ProjectDocument } from '../domain/project';
import {
  createCutsFromProjectDocument,
  createProjectDocumentFromCuts,
} from '../application/projectProjection';

interface LegacySnapshotOptions {
  cuts: Cut[];
  settings: AppSettings;
  template: Template;
  pageCount?: number;
  assetHints?: Array<AssetHint | null | undefined>;
  projectName?: string;
  savedAt?: string;
}

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

export const createProjectDocumentFromLegacySnapshot = ({
  cuts,
  settings,
  template,
  pageCount,
  assetHints = [],
  projectName,
  savedAt,
}: LegacySnapshotOptions): ProjectDocument =>
  createProjectDocumentFromCuts({
    cuts,
    settings,
    template,
    pageCount,
    assetHints,
    projectName,
    savedAt,
  });

export const createLegacyCutsFromProjectDocument = createCutsFromProjectDocument;

export const createAppSettingsFromProjectDocument = (
  project: ProjectDocument
): AppSettings => ({
  fontSize: project.style.fontSize,
  useWhiteBackground: project.style.useWhiteBackground,
  backgroundPadding: project.style.backgroundPadding,
  nextNumber: project.numbering.nextNumber,
  branchChar: project.numbering.branchChar,
  autoIncrement: project.numbering.autoIncrement,
  minDigits: project.numbering.minDigits,
  textOutlineWidth: project.style.textOutlineWidth,
  enableClickSnapToRows: project.style.enableClickSnapToRows,
});

export const createTemplateFromProjectDocument = (
  project: ProjectDocument
): Template => ({
  id: project.template.id,
  name: project.template.name,
  rowCount: project.template.rowCount,
  xPosition: project.template.xPosition,
  rowPositions: [...project.template.rowPositions],
});
