import { AssetHint, LogicalPageId, ProjectDocument } from '../domain/project';

export type ProjectAssetComparisonStatus =
  | 'matched'
  | 'needs_review'
  | 'missing_asset';

export interface ProjectAssetComparisonRow {
  logicalPageId: LogicalPageId;
  pageNumber: number;
  expectedAsset: AssetHint | null;
  currentAsset: AssetHint | null;
  status: ProjectAssetComparisonStatus;
}

export interface ProjectAssetComparisonSummary {
  logicalPageCount: number;
  currentAssetCount: number;
  matchedPageCount: number;
  needsReviewCount: number;
  missingAssetCount: number;
  extraAssetCount: number;
  canApplyByPageCount: boolean;
  rows: ProjectAssetComparisonRow[];
}

const assetHintMatches = (
  expectedAsset: AssetHint | null | undefined,
  currentAsset: AssetHint | null | undefined
) => {
  if (!expectedAsset || !currentAsset) return false;
  if (expectedAsset.sourceKind !== currentAsset.sourceKind) return false;
  if (
    expectedAsset.sourceLabel &&
    currentAsset.sourceLabel &&
    expectedAsset.sourceLabel !== currentAsset.sourceLabel
  ) {
    return false;
  }
  if (
    expectedAsset.pageNumber != null &&
    currentAsset.pageNumber != null &&
    expectedAsset.pageNumber !== currentAsset.pageNumber
  ) {
    return false;
  }
  return true;
};

export const summarizeProjectAssetComparison = (
  project: ProjectDocument,
  currentAssets: Array<AssetHint | null | undefined>
): ProjectAssetComparisonSummary => {
  const rows = project.logicalPages.map((page, index) => {
    const expectedAsset = page.expectedAssetHint ?? null;
    const currentAsset = currentAssets[index] ?? null;

    let status: ProjectAssetComparisonStatus;
    if (!currentAsset) {
      status = 'missing_asset';
    } else if (assetHintMatches(expectedAsset, currentAsset)) {
      status = 'matched';
    } else {
      status = 'needs_review';
    }

    return {
      logicalPageId: page.id,
      pageNumber: index + 1,
      expectedAsset,
      currentAsset,
      status,
    };
  });

  const matchedPageCount = rows.filter((row) => row.status === 'matched').length;
  const needsReviewCount = rows.filter((row) => row.status === 'needs_review').length;
  const missingAssetCount = rows.filter((row) => row.status === 'missing_asset').length;
  const currentAssetCount = currentAssets.filter(Boolean).length;

  return {
    logicalPageCount: project.logicalPages.length,
    currentAssetCount,
    matchedPageCount,
    needsReviewCount,
    missingAssetCount,
    extraAssetCount: Math.max(currentAssetCount - project.logicalPages.length, 0),
    canApplyByPageCount:
      project.logicalPages.length > 0 &&
      currentAssetCount === project.logicalPages.length,
    rows,
  };
};
