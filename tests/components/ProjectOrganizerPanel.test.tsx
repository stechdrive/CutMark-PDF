import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectOrganizerPanel } from '../../components/ProjectOrganizerPanel';

const createOrganizer = () => ({
  logicalPageCount: 3,
  contePageCount: 3,
  assignedCount: 2,
  matchedCount: 1,
  needsReviewCount: 1,
  unassignedConteCount: 1,
  unplacedLogicalPageCount: 1,
  slots: [
    {
      assetIndex: 0,
      contePageNumber: 1,
      asset: { sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 },
      logicalPageId: 'page-1',
      logicalPageNumber: 1,
      logicalPage: {
        id: 'page-1',
        cuts: [{ id: 'cut-1', x: 0.1, y: 0.2, label: '001', isBranch: false }],
        expectedAssetHint: null,
      },
      expectedAsset: { sourceKind: 'image' as const, sourceLabel: '001.png', pageNumber: 1 },
      status: 'matched' as const,
      cutCount: 1,
      isSelected: false,
    },
    {
      assetIndex: 1,
      contePageNumber: 2,
      asset: { sourceKind: 'image' as const, sourceLabel: '009_revised.png', pageNumber: 2 },
      logicalPageId: 'page-2',
      logicalPageNumber: 2,
      logicalPage: {
        id: 'page-2',
        cuts: [
          { id: 'cut-2', x: 0.2, y: 0.3, label: '012', isBranch: false },
          { id: 'cut-3', x: 0.4, y: 0.5, label: '012A', isBranch: true },
          { id: 'cut-4', x: 0.5, y: 0.6, label: '013', isBranch: false },
          { id: 'cut-5', x: 0.6, y: 0.7, label: '013A', isBranch: true },
          { id: 'cut-6', x: 0.7, y: 0.8, label: '014', isBranch: false },
        ],
        expectedAssetHint: null,
      },
      expectedAsset: { sourceKind: 'image' as const, sourceLabel: '002.png', pageNumber: 2 },
      status: 'needs_review' as const,
      cutCount: 5,
      isSelected: true,
    },
    {
      assetIndex: 2,
      contePageNumber: 3,
      asset: { sourceKind: 'image' as const, sourceLabel: '003.png', pageNumber: 3 },
      logicalPageId: null,
      logicalPageNumber: null,
      logicalPage: null,
      expectedAsset: null,
      status: 'unassigned' as const,
      cutCount: 0,
      isSelected: false,
    },
  ],
  unplacedPages: [
    {
      logicalPageId: 'page-3',
      logicalPageNumber: 3,
      logicalPage: { id: 'page-3', cuts: [], expectedAssetHint: null },
      expectedAsset: { sourceKind: 'image' as const, sourceLabel: '004.png', pageNumber: 4 },
      cutCount: 0,
      isSelected: false,
    },
  ],
});

describe('ProjectOrganizerPanel', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders conte-first organizer cards and the unplaced tray', () => {
    render(
      <ProjectOrganizerPanel
        projectName="catalog-revision"
        savedAt="2026-04-18T01:23:45.000Z"
        selectedLogicalPageId="page-2"
        currentContePage={2}
        organizer={createOrganizer()}
        canApplyProject={false}
        canResetBindings={true}
        onSelectLogicalPage={vi.fn()}
        onSelectContePage={vi.fn()}
        onInsertBlankPageAtAsset={vi.fn()}
        onRemoveLogicalPageFromConte={vi.fn()}
        onUnassignLogicalPage={vi.fn()}
        onMoveLogicalPageToAsset={vi.fn()}
        onResetBindings={vi.fn()}
        onApplyProject={vi.fn()}
      />
    );

    expect(screen.getByText('コンテ順のページ整理')).toBeInTheDocument();
    expect(screen.getByText('012・012A・013・013A・014')).toBeInTheDocument();
    expect(screen.getByText('採番無し / 前回: 004.png')).toBeInTheDocument();
    expect(screen.getByText('Page 2')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === '現在: 009_revised.png')
    ).toBeInTheDocument();
    expect(screen.getByText('未配置のカット番号ページ')).toBeInTheDocument();
    expect(screen.getByText('未割付 1')).toBeInTheDocument();
    expect(screen.getByText('Page 2').closest('.rounded-xl')).toHaveClass('ring-1');
    expect(screen.getByText('Page 1').closest('.rounded-xl')).not.toHaveClass('ring-1');
    expect(screen.getByRole('button', { name: '適用' })).toBeDisabled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('routes insert, delete, reset, apply, and drag-drop actions', async () => {
    const user = userEvent.setup();
    const onSelectLogicalPage = vi.fn();
    const onSelectContePage = vi.fn();
    const onInsertBlankPageAtAsset = vi.fn();
    const onRemoveLogicalPageFromConte = vi.fn();
    const onUnassignLogicalPage = vi.fn();
    const onMoveLogicalPageToAsset = vi.fn();
    const onResetBindings = vi.fn();
    const onApplyProject = vi.fn();

    render(
      <ProjectOrganizerPanel
        projectName="catalog-revision"
        savedAt="2026-04-18T01:23:45.000Z"
        selectedLogicalPageId="page-2"
        currentContePage={2}
        organizer={createOrganizer()}
        canApplyProject={true}
        canResetBindings={true}
        onSelectLogicalPage={onSelectLogicalPage}
        onSelectContePage={onSelectContePage}
        onInsertBlankPageAtAsset={onInsertBlankPageAtAsset}
        onRemoveLogicalPageFromConte={onRemoveLogicalPageFromConte}
        onUnassignLogicalPage={onUnassignLogicalPage}
        onMoveLogicalPageToAsset={onMoveLogicalPageToAsset}
        onResetBindings={onResetBindings}
        onApplyProject={onApplyProject}
      />
    );

    const cardHolder = screen.getByText('Page 1').closest('.rounded-xl');
    if (!cardHolder) {
      throw new Error('Organizer card holder not found');
    }

    await user.click(cardHolder);
    await user.click(screen.getByRole('button', { name: /012・012A・013・013A・014/ }));
    await user.click(screen.getByRole('button', { name: '現在: 009_revised.png 前回: 002.png' }));
    await user.click(screen.getByRole('button', { name: '現在: 003.png' }));
    await user.click(screen.getByRole('button', { name: 'Page 2 に空欄を挿入' }));
    await user.click(screen.getByRole('button', { name: 'カット番号ページの削除方法を選ぶ Page 2' }));
    await user.click(screen.getByRole('button', { name: '未割付にする' }));
    await user.click(screen.getByRole('button', { name: '未配置のカット番号ページを削除 3' }));
    await user.click(screen.getByRole('button', { name: /自動割付/i }));
    await user.click(screen.getByRole('button', { name: '適用' }));

    const dragChip = screen.getByText('001').closest('[draggable="true"]');
    const dropCard = screen.getByText('Page 3').closest('.rounded-xl');

    if (!dragChip || !dropCard) {
      throw new Error('Organizer drag target not found');
    }

    fireEvent.dragStart(dragChip, {
      dataTransfer: {
        effectAllowed: 'move',
        setData: vi.fn(),
      },
    });
    fireEvent.dragOver(dropCard, {
      preventDefault: vi.fn(),
      dataTransfer: {
        dropEffect: 'move',
      },
    });
    fireEvent.drop(dropCard, {
      preventDefault: vi.fn(),
    });

    expect(onSelectContePage).toHaveBeenCalledWith(0, 'page-1');
    expect(onSelectLogicalPage).toHaveBeenCalledWith('page-2');
    expect(onSelectContePage).toHaveBeenCalledWith(1, 'page-2');
    expect(onSelectContePage).toHaveBeenCalledWith(2, null);
    expect(onInsertBlankPageAtAsset).toHaveBeenCalledWith(1);
    expect(onUnassignLogicalPage).toHaveBeenCalledWith('page-2');
    expect(onRemoveLogicalPageFromConte).toHaveBeenCalledWith('page-3');
    expect(onResetBindings).toHaveBeenCalledTimes(1);
    expect(onApplyProject).toHaveBeenCalledTimes(1);
    expect(onMoveLogicalPageToAsset).toHaveBeenCalledWith('page-1', 2);
  });

  it('lets the user pick ripple delete from the assigned card menu', async () => {
    const user = userEvent.setup();
    const onRemoveLogicalPageFromConte = vi.fn();

    render(
      <ProjectOrganizerPanel
        projectName="catalog-revision"
        savedAt="2026-04-18T01:23:45.000Z"
        selectedLogicalPageId="page-2"
        currentContePage={2}
        organizer={createOrganizer()}
        canApplyProject={true}
        canResetBindings={true}
        onSelectLogicalPage={vi.fn()}
        onSelectContePage={vi.fn()}
        onInsertBlankPageAtAsset={vi.fn()}
        onRemoveLogicalPageFromConte={onRemoveLogicalPageFromConte}
        onUnassignLogicalPage={vi.fn()}
        onMoveLogicalPageToAsset={vi.fn()}
        onResetBindings={vi.fn()}
        onApplyProject={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'カット番号ページの削除方法を選ぶ Page 2' }));
    await user.click(screen.getByRole('button', { name: '削除して後ろを詰める' }));

    expect(onRemoveLogicalPageFromConte).toHaveBeenCalledWith('page-2');
  });
});
