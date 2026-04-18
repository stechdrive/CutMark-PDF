import { AppSettings, Cut, DocType, NumberingState, Template } from '../types';
import {
  AssetHint,
  createProjectDocument,
  ProjectDocument,
} from '../domain/project';

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

export interface LegacyProjectState {
  cuts: Cut[];
  settings: AppSettings;
  template: Template;
  logicalPageCount: number;
  projectName: string;
  numberingState: NumberingState;
}

const deriveProjectName = (
  projectName: string | undefined,
  assetHints: Array<AssetHint | null | undefined>
) => {
  if (projectName?.trim()) return projectName.trim();

  const firstHint = assetHints.find((hint) => hint && hint.sourceLabel)?.sourceLabel;
  if (!firstHint) return 'CutMark Project';

  return firstHint.replace(/\.[^.]+$/, '');
};

const getHighestPageIndex = (cuts: Cut[]) =>
  cuts.reduce((max, cut) => Math.max(max, cut.pageIndex), -1);

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
}: LegacySnapshotOptions): ProjectDocument => {
  const inferredPageCount = Math.max(
    pageCount ?? 0,
    assetHints.length,
    getHighestPageIndex(cuts) + 1,
    1
  );

  return createProjectDocument({
    settings,
    template,
    name: deriveProjectName(projectName, assetHints),
    savedAt,
    logicalPages: Array.from({ length: inferredPageCount }, (_, index) => ({
      id: `page-${index + 1}`,
      cuts: cuts
        .filter((cut) => cut.pageIndex === index)
        .map((cut) => ({
          id: cut.id,
          x: cut.x,
          y: cut.y,
          label: cut.label,
          isBranch: cut.isBranch,
        })),
      expectedAssetHint: assetHints[index] ?? null,
    })),
  });
};

export const createLegacyStateFromProjectDocument = (
  project: ProjectDocument
): LegacyProjectState => ({
  cuts: project.logicalPages.flatMap((page, pageIndex) =>
    page.cuts.map((cut) => ({
      id: cut.id,
      pageIndex,
      x: cut.x,
      y: cut.y,
      label: cut.label,
      isBranch: cut.isBranch,
    }))
  ),
  settings: {
    fontSize: project.style.fontSize,
    useWhiteBackground: project.style.useWhiteBackground,
    backgroundPadding: project.style.backgroundPadding,
    nextNumber: project.numbering.nextNumber,
    branchChar: project.numbering.branchChar,
    autoIncrement: project.numbering.autoIncrement,
    minDigits: project.numbering.minDigits,
    textOutlineWidth: project.style.textOutlineWidth,
    enableClickSnapToRows: project.style.enableClickSnapToRows,
  },
  template: {
    id: project.template.id,
    name: project.template.name,
    rowCount: project.template.rowCount,
    xPosition: project.template.xPosition,
    rowPositions: [...project.template.rowPositions],
  },
  logicalPageCount: project.logicalPages.length,
  projectName: project.meta.name,
  numberingState: {
    nextNumber: project.numbering.nextNumber,
    branchChar: project.numbering.branchChar,
  },
});

export const createLegacyStateFromBoundProjectDocument = (
  project: ProjectDocument,
  bindings: Record<string, number | null>
): LegacyProjectState => ({
  cuts: project.logicalPages
    .flatMap((page) => {
      const pageIndex = bindings[page.id];
      if (pageIndex == null || pageIndex < 0) return [];
      return page.cuts.map((cut) => ({
        id: cut.id,
        pageIndex,
        x: cut.x,
        y: cut.y,
        label: cut.label,
        isBranch: cut.isBranch,
      }));
    })
    .sort((left, right) => {
      if (left.pageIndex !== right.pageIndex) {
        return left.pageIndex - right.pageIndex;
      }
      if (left.y !== right.y) {
        return left.y - right.y;
      }
      return left.x - right.x;
    }),
  settings: {
    fontSize: project.style.fontSize,
    useWhiteBackground: project.style.useWhiteBackground,
    backgroundPadding: project.style.backgroundPadding,
    nextNumber: project.numbering.nextNumber,
    branchChar: project.numbering.branchChar,
    autoIncrement: project.numbering.autoIncrement,
    minDigits: project.numbering.minDigits,
    textOutlineWidth: project.style.textOutlineWidth,
    enableClickSnapToRows: project.style.enableClickSnapToRows,
  },
  template: {
    id: project.template.id,
    name: project.template.name,
    rowCount: project.template.rowCount,
    xPosition: project.template.xPosition,
    rowPositions: [...project.template.rowPositions],
  },
  logicalPageCount: project.logicalPages.length,
  projectName: project.meta.name,
  numberingState: {
    nextNumber: project.numbering.nextNumber,
    branchChar: project.numbering.branchChar,
  },
});
