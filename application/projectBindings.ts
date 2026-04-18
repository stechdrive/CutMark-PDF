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

export const createSequentialProjectAssetBindings = (
  project: ProjectDocument,
  assetCount: number
): ProjectAssetBindings =>
  Object.fromEntries(
    project.logicalPages.map((page, index) => [page.id, index < assetCount ? index : null])
  ) as ProjectAssetBindings;

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

export const synchronizeProjectAssetBindings = (
  project: ProjectDocument,
  currentAssets: Array<AssetHint | null | undefined>,
  previousBindings: ProjectAssetBindings
): ProjectAssetBindings => {
  const nextBindings = Object.fromEntries(
    project.logicalPages.map((page) => [page.id, null])
  ) as ProjectAssetBindings;
  const usedAssetIndexes = new Set<number>();

  project.logicalPages.forEach((page) => {
    const previousAssetIndex = previousBindings[page.id];
    if (
      previousAssetIndex != null &&
      previousAssetIndex >= 0 &&
      previousAssetIndex < currentAssets.length &&
      currentAssets[previousAssetIndex] &&
      !usedAssetIndexes.has(previousAssetIndex)
    ) {
      nextBindings[page.id] = previousAssetIndex;
      usedAssetIndexes.add(previousAssetIndex);
    }
  });

  const suggestedBindings = createSuggestedProjectAssetBindings(project, currentAssets);
  project.logicalPages.forEach((page) => {
    if (nextBindings[page.id] != null) return;
    const suggestedAssetIndex = suggestedBindings[page.id];
    if (
      suggestedAssetIndex != null &&
      suggestedAssetIndex >= 0 &&
      suggestedAssetIndex < currentAssets.length &&
      currentAssets[suggestedAssetIndex] &&
      !usedAssetIndexes.has(suggestedAssetIndex)
    ) {
      nextBindings[page.id] = suggestedAssetIndex;
      usedAssetIndexes.add(suggestedAssetIndex);
    }
  });

  project.logicalPages.forEach((page) => {
    if (nextBindings[page.id] != null) return;
    const fallbackAssetIndex = currentAssets.findIndex(
      (asset, index) => asset && !usedAssetIndexes.has(index)
    );
    if (fallbackAssetIndex >= 0) {
      nextBindings[page.id] = fallbackAssetIndex;
      usedAssetIndexes.add(fallbackAssetIndex);
    }
  });

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

export const applyBoundAssetHintsToProject = (
  project: ProjectDocument,
  bindings: ProjectAssetBindings,
  currentAssets: Array<AssetHint | null | undefined>
) => ({
  ...project,
  meta: { ...project.meta },
  numbering: { ...project.numbering },
  style: { ...project.style },
  template: {
    ...project.template,
    rowPositions: [...project.template.rowPositions],
  },
  logicalPages: project.logicalPages.map((page) => {
    const assetIndex = bindings[page.id];
    const boundAsset =
      assetIndex != null && assetIndex >= 0 ? currentAssets[assetIndex] ?? null : null;

    return {
      ...page,
      cuts: page.cuts.map((cut) => ({ ...cut })),
      expectedAssetHint: boundAsset
        ? { ...boundAsset }
        : page.expectedAssetHint
          ? { ...page.expectedAssetHint }
          : null,
    };
  }),
});
