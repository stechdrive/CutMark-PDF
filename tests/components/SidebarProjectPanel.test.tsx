import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarProjectPanel } from '../../components/SidebarProjectPanel';
import { ProjectAssetComparisonSummary } from '../../application/projectComparison';

const createComparisonSummary = (
  overrides: Partial<ProjectAssetComparisonSummary> = {}
): ProjectAssetComparisonSummary => ({
  logicalPageCount: 3,
  currentAssetCount: 3,
  matchedPageCount: 2,
  needsReviewCount: 1,
  missingAssetCount: 0,
  extraAssetCount: 0,
  canApplyByPageCount: true,
  rows: [
    {
      logicalPageId: 'page-1',
      pageNumber: 1,
      expectedAsset: { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      currentAsset: { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      status: 'matched',
    },
    {
      logicalPageId: 'page-2',
      pageNumber: 2,
      expectedAsset: { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
      currentAsset: { sourceKind: 'image', sourceLabel: '009_revised.png', pageNumber: 2 },
      status: 'needs_review',
    },
    {
      logicalPageId: 'page-3',
      pageNumber: 3,
      expectedAsset: { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
      currentAsset: { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
      status: 'matched',
    },
  ],
  ...overrides,
});

describe('SidebarProjectPanel', () => {
  it('shows loaded project summary and unresolved pages', () => {
    render(
      <SidebarProjectPanel
        projectName="catalog-revision"
        savedAt="2026-04-18T01:23:45.000Z"
        comparison={createComparisonSummary()}
        canApplyProject={true}
        onApplyProject={vi.fn()}
      />
    );

    expect(screen.getByText('読込中プロジェクト')).toBeInTheDocument();
    expect(screen.getByText('catalog-revision')).toBeInTheDocument();
    expect(screen.getByText('ページ数一致')).toBeInTheDocument();
    expect(screen.getByText('差分のあるページ')).toBeInTheDocument();
    expect(screen.getByText('保存時: 002.png')).toBeInTheDocument();
    expect(screen.getByText('現在: 009_revised.png')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '現在の素材へページ順で適用' })).toBeInTheDocument();
  });

  it('hides the apply action until assets are loaded', () => {
    const onApplyProject = vi.fn();

    render(
      <SidebarProjectPanel
        projectName="catalog-revision"
        savedAt="2026-04-18T01:23:45.000Z"
        comparison={createComparisonSummary({
          currentAssetCount: 0,
          matchedPageCount: 0,
          needsReviewCount: 0,
          missingAssetCount: 3,
          canApplyByPageCount: false,
          rows: [
            {
              logicalPageId: 'page-1',
              pageNumber: 1,
              expectedAsset: { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
              currentAsset: null,
              status: 'missing_asset',
            },
          ],
        })}
        canApplyProject={false}
        onApplyProject={onApplyProject}
      />
    );

    expect(screen.getByText('素材未読込')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '現在の素材へページ順で適用' })).not.toBeInTheDocument();
    expect(onApplyProject).not.toHaveBeenCalled();
  });
});
