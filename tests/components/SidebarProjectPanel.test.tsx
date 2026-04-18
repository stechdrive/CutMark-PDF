import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
        bindings={{
          'page-1': 0,
          'page-2': 1,
          'page-3': 2,
        }}
        assignedCount={3}
        currentAssets={[
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '009_revised.png', pageNumber: 2 },
          { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
        ]}
        canApplyProject={true}
        canResetBindings={true}
        onBindingChange={vi.fn()}
        onInsertLogicalPageAfter={vi.fn()}
        onRemoveLogicalPage={vi.fn()}
        onMoveLogicalPage={vi.fn()}
        onResetBindings={vi.fn()}
        onApplyProject={vi.fn()}
      />
    );

    expect(screen.getByText('読込中プロジェクト')).toBeInTheDocument();
    expect(screen.getByText('catalog-revision')).toBeInTheDocument();
    expect(screen.getByText('ページ数一致')).toBeInTheDocument();
    expect(screen.getByText('差分のあるページ')).toBeInTheDocument();
    expect(screen.getAllByText('保存時: 002.png').length).toBeGreaterThan(0);
    expect(screen.getAllByText('割当中: 009_revised.png').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '現在の素材へ割当どおりに適用' })).toBeEnabled();
    expect(screen.getByRole('combobox', { name: '論理ページ 2 の割当' })).toBeInTheDocument();
  });

  it('lets the user change a logical page assignment and reset suggestions', async () => {
    const user = userEvent.setup();
    const onBindingChange = vi.fn();
    const onInsertLogicalPageAfter = vi.fn();
    const onRemoveLogicalPage = vi.fn();
    const onMoveLogicalPage = vi.fn();
    const onResetBindings = vi.fn();

    render(
      <SidebarProjectPanel
        projectName="catalog-revision"
        savedAt="2026-04-18T01:23:45.000Z"
        comparison={createComparisonSummary()}
        bindings={{
          'page-1': 0,
          'page-2': 1,
          'page-3': 2,
        }}
        assignedCount={3}
        currentAssets={[
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '009_revised.png', pageNumber: 2 },
          { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
        ]}
        canApplyProject={true}
        canResetBindings={true}
        onBindingChange={onBindingChange}
        onInsertLogicalPageAfter={onInsertLogicalPageAfter}
        onRemoveLogicalPage={onRemoveLogicalPage}
        onMoveLogicalPage={onMoveLogicalPage}
        onResetBindings={onResetBindings}
        onApplyProject={vi.fn()}
      />
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: '論理ページ 2 の割当' }),
      '0'
    );
    await user.click(screen.getByRole('button', { name: '自動候補に戻す' }));

    expect(onBindingChange).toHaveBeenCalledWith('page-2', 0);
    expect(onResetBindings).toHaveBeenCalled();
  });

  it('exposes logical page move, insert, and remove controls', async () => {
    const user = userEvent.setup();
    const onInsertLogicalPageAfter = vi.fn();
    const onRemoveLogicalPage = vi.fn();
    const onMoveLogicalPage = vi.fn();

    render(
      <SidebarProjectPanel
        projectName="catalog-revision"
        savedAt="2026-04-18T01:23:45.000Z"
        comparison={createComparisonSummary()}
        bindings={{
          'page-1': 0,
          'page-2': 1,
          'page-3': 2,
        }}
        assignedCount={3}
        currentAssets={[
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '009_revised.png', pageNumber: 2 },
          { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
        ]}
        canApplyProject={true}
        canResetBindings={true}
        onBindingChange={vi.fn()}
        onInsertLogicalPageAfter={onInsertLogicalPageAfter}
        onRemoveLogicalPage={onRemoveLogicalPage}
        onMoveLogicalPage={onMoveLogicalPage}
        onResetBindings={vi.fn()}
        onApplyProject={vi.fn()}
      />
    );

    const moveButtons = screen.getAllByRole('button', { name: '前へ移動' });
    const insertButtons = screen.getAllByRole('button', { name: '後ろに空ページを追加' });
    const removeButtons = screen.getAllByRole('button', { name: 'この論理ページを削除' });

    await user.click(moveButtons[1]);
    await user.click(insertButtons[1]);
    await user.click(removeButtons[1]);

    expect(onMoveLogicalPage).toHaveBeenCalledWith('page-2', -1);
    expect(onInsertLogicalPageAfter).toHaveBeenCalledWith('page-2');
    expect(onRemoveLogicalPage).toHaveBeenCalledWith('page-2');
  });

  it('disables apply until every logical page is assigned', () => {
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
        bindings={{ 'page-1': null }}
        assignedCount={0}
        currentAssets={[]}
        canApplyProject={false}
        canResetBindings={false}
        onBindingChange={vi.fn()}
        onInsertLogicalPageAfter={vi.fn()}
        onRemoveLogicalPage={vi.fn()}
        onMoveLogicalPage={vi.fn()}
        onResetBindings={vi.fn()}
        onApplyProject={onApplyProject}
      />
    );

    expect(screen.getByText('素材未読込')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '現在の素材へ割当どおりに適用' })).toBeDisabled();
    expect(onApplyProject).not.toHaveBeenCalled();
  });
});
