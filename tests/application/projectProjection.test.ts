import { describe, expect, it } from 'vitest';
import {
  createCutsFromProjectDocument,
  createProjectDocumentFromCuts,
} from '../../application/projectProjection';
import { createAppSettings, createCut, createTemplate } from '../../test/factories';

describe('application/projectProjection', () => {
  it('creates project documents from flat cuts while preserving blank pages and asset hints', () => {
    const project = createProjectDocumentFromCuts({
      cuts: [
        createCut({ id: 'cut-1', pageIndex: 0, label: '001' }),
        createCut({ id: 'cut-2', pageIndex: 2, label: '002' }),
      ],
      settings: createAppSettings(),
      template: createTemplate(),
      pageCount: 3,
      assetHints: [
        { sourceKind: 'image', sourceLabel: 'page-1.png', pageNumber: 1 },
        { sourceKind: 'image', sourceLabel: 'page-2.png', pageNumber: 2 },
        { sourceKind: 'image', sourceLabel: 'page-3.png', pageNumber: 3 },
      ],
      projectName: 'Episode 01',
      savedAt: '2026-04-18T00:00:00.000Z',
    });

    expect(project.meta).toEqual({
      name: 'Episode 01',
      savedAt: '2026-04-18T00:00:00.000Z',
    });
    expect(project.logicalPages).toHaveLength(3);
    expect(project.logicalPages[1].cuts).toEqual([]);
    expect(project.logicalPages[2].expectedAssetHint?.sourceLabel).toBe('page-3.png');
  });

  it('projects bound logical pages back into flat cuts ordered by page and position', () => {
    const project = createProjectDocumentFromCuts({
      cuts: [
        createCut({ id: 'cut-1', pageIndex: 0, label: '010', y: 0.2 }),
        createCut({ id: 'cut-2', pageIndex: 1, label: '011', y: 0.1 }),
      ],
      settings: createAppSettings(),
      template: createTemplate(),
      pageCount: 2,
      projectName: 'Episode 04',
    });

    const projectedCuts = createCutsFromProjectDocument(project, {
      'page-1': 1,
      'page-2': 0,
    });

    expect(projectedCuts.map((cut) => `${cut.id}:${cut.pageIndex}`)).toEqual([
      'cut-2:0',
      'cut-1:1',
    ]);
  });
});
