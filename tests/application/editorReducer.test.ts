import { describe, expect, it } from 'vitest';
import { editorReducer } from '../../application/editorReducer';
import {
  createEditorState,
  createLogicalPage,
  createProjectDocument,
} from '../../domain/project';
import { createAppSettings, createTemplate } from '../../test/factories';

const createState = () =>
  createEditorState(
    createProjectDocument({
      settings: createAppSettings(),
      template: createTemplate(),
      logicalPages: [
        createLogicalPage({
          id: 'page-1',
          cuts: [{ id: 'cut-1', x: 0.1, y: 0.1, label: '001', isBranch: false }],
        }),
        createLogicalPage({
          id: 'page-2',
          cuts: [{ id: 'cut-2', x: 0.2, y: 0.2, label: '002', isBranch: false }],
        }),
      ],
    })
  );

describe('application/editorReducer', () => {
  it('assigns and clears asset bindings for a logical page', () => {
    const assigned = editorReducer(createState(), {
      type: 'assignAssetToLogicalPage',
      logicalPageId: 'page-1',
      assetId: 'asset-1',
    });

    expect(assigned.bindings['page-1']).toMatchObject({
      logicalPageId: 'page-1',
      assetId: 'asset-1',
      status: 'matched',
    });

    const cleared = editorReducer(assigned, {
      type: 'assignAssetToLogicalPage',
      logicalPageId: 'page-1',
      assetId: null,
    });

    expect(cleared.bindings['page-1'].status).toBe('unbound');
  });

  it('inserts, moves, and removes logical pages', () => {
    const inserted = editorReducer(createState(), {
      type: 'insertLogicalPageAfter',
      afterLogicalPageId: 'page-1',
      logicalPage: createLogicalPage({ id: 'page-new' }),
    });

    expect(inserted.project.logicalPages.map((page) => page.id)).toEqual([
      'page-1',
      'page-new',
      'page-2',
    ]);

    const moved = editorReducer(inserted, {
      type: 'moveLogicalPage',
      logicalPageId: 'page-new',
      toIndex: 0,
    });

    expect(moved.project.logicalPages.map((page) => page.id)).toEqual([
      'page-new',
      'page-1',
      'page-2',
    ]);

    const removed = editorReducer(moved, {
      type: 'removeLogicalPage',
      logicalPageId: 'page-1',
    });

    expect(removed.project.logicalPages.map((page) => page.id)).toEqual([
      'page-new',
      'page-2',
    ]);
  });

  it('adds, moves, and deletes cuts inside logical pages', () => {
    const withCut = editorReducer(createState(), {
      type: 'addCutToLogicalPage',
      logicalPageId: 'page-1',
      cut: { id: 'cut-3', x: 0.4, y: 0.5, label: '003', isBranch: false },
    });

    expect(withCut.project.logicalPages[0].cuts).toHaveLength(2);

    const moved = editorReducer(withCut, {
      type: 'updateCutPosition',
      cutId: 'cut-3',
      x: 0.6,
      y: 0.7,
    });

    expect(
      moved.project.logicalPages[0].cuts.find((cut) => cut.id === 'cut-3')
    ).toMatchObject({ x: 0.6, y: 0.7 });

    const deleted = editorReducer(moved, {
      type: 'deleteCut',
      cutId: 'cut-3',
    });

    expect(
      deleted.project.logicalPages[0].cuts.find((cut) => cut.id === 'cut-3')
    ).toBeUndefined();
  });

  it('renumbers from a selected cut and updates the project numbering cursor', () => {
    const renumbered = editorReducer(createState(), {
      type: 'renumberFromCut',
      cutId: 'cut-1',
      startNumbering: { nextNumber: 10, branchChar: null },
    });

    expect(renumbered.project.logicalPages[0].cuts[0].label).toBe('010');
    expect(renumbered.project.logicalPages[1].cuts[0].label).toBe('011');
    expect(renumbered.project.numbering.nextNumber).toBe(12);
  });
});
