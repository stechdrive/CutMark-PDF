import { AssetHint, LogicalPageId, ProjectDocument } from '../domain/project';

export type ProjectAssetBindings = Record<LogicalPageId, number | null>;

const hintsStrictlyMatch = (
  expectedAsset: AssetHint | null | undefined,
  currentAsset: AssetHint | null | undefined
) => {
  if (!expectedAsset || !currentAsset) return false;
  if (expectedAsset.sourceKind !== currentAsset.sourceKind) return false;
  if (expectedAsset.sourceLabel !== currentAsset.sourceLabel) return false;
  if (
    expectedAsset.pageNumber != null &&
    currentAsset.pageNumber != null &&
    expectedAsset.pageNumber !== currentAsset.pageNumber
  ) {
    return false;
  }
  return true;
};

export const createSuggestedProjectAssetBindings = (
  project: ProjectDocument,
  currentAssets: Array<AssetHint | null | undefined>
): ProjectAssetBindings => {
  const bindings = Object.fromEntries(
    project.logicalPages.map((page) => [page.id, null])
  ) as ProjectAssetBindings;
  const usedAssetIndexes = new Set<number>();

  project.logicalPages.forEach((page) => {
    const matchIndex = currentAssets.findIndex(
      (asset, index) =>
        !usedAssetIndexes.has(index) &&
        hintsStrictlyMatch(page.expectedAssetHint ?? null, asset ?? null)
    );

    if (matchIndex >= 0) {
      bindings[page.id] = matchIndex;
      usedAssetIndexes.add(matchIndex);
    }
  });

  project.logicalPages.forEach((page, index) => {
    if (bindings[page.id] != null) return;
    if (index < currentAssets.length && !usedAssetIndexes.has(index)) {
      bindings[page.id] = index;
      usedAssetIndexes.add(index);
    }
  });

  project.logicalPages.forEach((page) => {
    if (bindings[page.id] != null) return;

    const nextIndex = currentAssets.findIndex(
      (asset, index) => asset && !usedAssetIndexes.has(index)
    );
    if (nextIndex >= 0) {
      bindings[page.id] = nextIndex;
      usedAssetIndexes.add(nextIndex);
    }
  });

  return bindings;
};

export const reassignProjectAssetBinding = (
  bindings: ProjectAssetBindings,
  logicalPageId: LogicalPageId,
  nextAssetIndex: number | null
): ProjectAssetBindings => {
  const nextBindings = { ...bindings };

  if (nextAssetIndex != null) {
    Object.keys(nextBindings).forEach((pageId) => {
      if (pageId !== logicalPageId && nextBindings[pageId] === nextAssetIndex) {
        nextBindings[pageId] = null;
      }
    });
  }

  nextBindings[logicalPageId] = nextAssetIndex;
  return nextBindings;
};

export const countAssignedProjectAssetBindings = (
  project: ProjectDocument,
  bindings: ProjectAssetBindings
) =>
  project.logicalPages.reduce(
    (count, page) => count + (bindings[page.id] != null ? 1 : 0),
    0
  );

export const hasCompleteProjectAssetBindings = (
  project: ProjectDocument,
  bindings: ProjectAssetBindings
) =>
  project.logicalPages.every((page) => bindings[page.id] != null);
