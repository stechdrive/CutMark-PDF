import { describe, expect, it } from 'vitest';
import {
  createProjectConteOrganizerSummary,
  insertBlankLogicalPageAtConte,
  moveLogicalPageToConte,
  removeLogicalPageFromConte,
} from '../../application/projectOrganizer';
import {
  createEditorState,
  createPageBinding,
  createProjectDocument,
} from '../../domain/project';
import { createAppSettings, createTemplate } from '../../test/factories';

const settings = createAppSettings();
const template = createTemplate();

const createState = () => {
  const project = createProjectDocument({
    settings,
    template,
    logicalPages: [
      {
        id: 'page-1',
        cuts: [],
        expectedAssetHint: { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      },
      {
        id: 'page-2',
        cuts: [],
        expectedAssetHint: { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
      },
      {
        id: 'page-3',
        cuts: [],
        expectedAssetHint: { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
      },
      {
        id: 'page-4',
        cuts: [],
        expectedAssetHint: { sourceKind: 'image', sourceLabel: '004.png', pageNumber: 4 },
      },
    ],
  });

  return createEditorState(project, {
    bindings: {
      'page-1': createPageBinding('page-1', 'asset-0'),
      'page-2': createPageBinding('page-2', 'asset-1'),
      'page-3': createPageBinding('page-3', 'asset-2'),
      'page-4': createPageBinding('page-4'),
    },
  });
};

describe('application/projectOrganizer', () => {
  it('builds a conte-first summary with unplaced logical pages', () => {
    const summary = createProjectConteOrganizerSummary(
      createState().project.logicalPages,
      {
        'page-1': 0,
        'page-2': 1,
        'page-3': 2,
        'page-4': null,
      },
      [
        { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
        { sourceKind: 'image', sourceLabel: '009_revised.png', pageNumber: 2 },
        { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
      ],
      'page-4'
    );

    expect(summary.slots.map((slot) => slot.logicalPageId)).toEqual(['page-1', 'page-2', 'page-3']);
    expect(summary.slots.map((slot) => slot.status)).toEqual(['matched', 'needs_review', 'matched']);
    expect(summary.unplacedPages.map((page) => page.logicalPageId)).toEqual(['page-4']);
    expect(summary.unplacedPages[0].isSelected).toBe(true);
  });

  it('inserts a blank logical page into the target conte slot and shifts later pages', () => {
    const nextState = insertBlankLogicalPageAtConte(createState(), 3, 1);

    expect(nextState.project.logicalPages.map((page) => page.id)).toEqual([
      'page-1',
      expect.any(String),
      'page-2',
      'page-3',
      'page-4',
    ]);
    const insertedPageId = nextState.selection.logicalPageId;
    expect(insertedPageId).not.toBeNull();
    expect(nextState.bindings['page-1'].assetId).toBe('asset-0');
    expect(insertedPageId ? nextState.bindings[insertedPageId].assetId : null).toBe('asset-1');
    expect(nextState.bindings['page-2'].assetId).toBe('asset-2');
    expect(nextState.bindings['page-3'].assetId).toBeNull();
  });

  it('removes a logical page, collapses later slots, and pulls an unplaced page forward', () => {
    const nextState = removeLogicalPageFromConte(createState(), 3, 'page-2');

    expect(nextState.project.logicalPages.map((page) => page.id)).toEqual([
      'page-1',
      'page-3',
      'page-4',
    ]);
    expect(nextState.bindings['page-1'].assetId).toBe('asset-0');
    expect(nextState.bindings['page-3'].assetId).toBe('asset-1');
    expect(nextState.bindings['page-4'].assetId).toBe('asset-2');
  });

  it('moves a logical page to a conte slot with insert semantics', () => {
    const nextState = moveLogicalPageToConte(createState(), 3, 'page-3', 0);

    expect(nextState.project.logicalPages.map((page) => page.id)).toEqual([
      'page-3',
      'page-1',
      'page-2',
      'page-4',
    ]);
    expect(nextState.bindings['page-3'].assetId).toBe('asset-0');
    expect(nextState.bindings['page-1'].assetId).toBe('asset-1');
    expect(nextState.bindings['page-2'].assetId).toBe('asset-2');
    expect(nextState.bindings['page-4'].assetId).toBeNull();
    expect(nextState.selection.logicalPageId).toBe('page-3');
  });
});
