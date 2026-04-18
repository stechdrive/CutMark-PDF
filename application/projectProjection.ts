import { AppSettings, Cut, Template } from '../types';
import {
  AssetHint,
  createProjectDocument,
  ProjectDocument,
} from '../domain/project';

interface CreateProjectDocumentFromCutsOptions {
  cuts: Cut[];
  settings: AppSettings;
  template: Template;
  pageCount?: number;
  assetHints?: Array<AssetHint | null | undefined>;
  projectName?: string;
  savedAt?: string;
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

export const createProjectDocumentFromCuts = ({
  cuts,
  settings,
  template,
  pageCount,
  assetHints = [],
  projectName,
  savedAt,
}: CreateProjectDocumentFromCutsOptions): ProjectDocument => {
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

export const createCutsFromProjectDocument = (
  project: ProjectDocument,
  bindings?: Record<string, number | null>
): Cut[] =>
  (bindings
    ? project.logicalPages
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
        })
    : project.logicalPages.flatMap((page, pageIndex) =>
        page.cuts.map((cut) => ({
          id: cut.id,
          pageIndex,
          x: cut.x,
          y: cut.y,
          label: cut.label,
          isBranch: cut.isBranch,
        }))
      ));
