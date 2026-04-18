import { describe, expect, it } from 'vitest';
import {
  canExportBoundProject,
  countUnresolvedBindings,
  getBoundAssetForLogicalPage,
  getLogicalPageIndex,
  getSelectedBinding,
  getSelectedBoundAsset,
  getSelectedCut,
  getSelectedLogicalPage,
  getUnboundLogicalPages,
} from '../../application/selectors';
import {
  AssetSession,
  createEditorState,
  createLogicalPage,
  createPageBinding,
  createProjectDocument,
} from '../../domain/project';
import { createAppSettings, createTemplate } from '../../test/factories';

const project = createProjectDocument({
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
});

const assetSession: AssetSession = {
  batchId: 'batch-1',
  assets: [
    {
      id: 'asset-1',
      sourceKind: 'image',
      sourceLabel: 'page-1.png',
      width: 1000,
      height: 2000,
    },
    {
      id: 'asset-2',
      sourceKind: 'image',
      sourceLabel: 'page-2.png',
      width: 1000,
      height: 2000,
    },
  ],
};

describe('application/selectors', () => {
  it('returns selected logical page, cut, and binding', () => {
    const state = createEditorState(project, {
      bindings: {
        'page-1': createPageBinding('page-1', 'asset-1', 'matched'),
        'page-2': createPageBinding('page-2', null, 'unbound'),
      },
      selection: {
        logicalPageId: 'page-1',
        cutId: 'cut-1',
      },
    });

    expect(getLogicalPageIndex(state, 'page-2')).toBe(1);
    expect(getSelectedLogicalPage(state)?.id).toBe('page-1');
    expect(getSelectedCut(state)?.id).toBe('cut-1');
    expect(getSelectedBinding(state)?.assetId).toBe('asset-1');
    expect(getSelectedBoundAsset(state, assetSession)?.id).toBe('asset-1');
    expect(getBoundAssetForLogicalPage(state, assetSession, 'page-1')?.id).toBe('asset-1');
  });

  it('counts unresolved bindings and export readiness', () => {
    const state = createEditorState(project, {
      bindings: {
        'page-1': createPageBinding('page-1', 'asset-1', 'matched'),
        'page-2': createPageBinding('page-2', null, 'unbound'),
      },
    });

    expect(countUnresolvedBindings(state)).toBe(1);
    expect(getUnboundLogicalPages(state).map((page) => page.id)).toEqual(['page-2']);
    expect(canExportBoundProject(state, assetSession)).toBe(false);

    const fullyBound = createEditorState(project, {
      bindings: {
        'page-1': createPageBinding('page-1', 'asset-1', 'matched'),
        'page-2': createPageBinding('page-2', 'asset-2', 'matched'),
      },
    });

    expect(canExportBoundProject(fullyBound, assetSession)).toBe(true);
  });
});
