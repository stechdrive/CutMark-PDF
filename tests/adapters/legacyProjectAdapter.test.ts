import { describe, expect, it } from 'vitest';
import { createAppSettings, createCut, createTemplate } from '../../test/factories';
import {
  createAssetHintsFromCurrentDocument,
  createLegacyStateFromProjectDocument,
  createProjectDocumentFromLegacySnapshot,
} from '../../adapters/legacyProjectAdapter';

describe('adapters/legacyProjectAdapter', () => {
  it('creates logical pages from legacy cuts while preserving blank pages and asset hints', () => {
    const project = createProjectDocumentFromLegacySnapshot({
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

  it('restores legacy editor state from a project document', () => {
    const project = createProjectDocumentFromLegacySnapshot({
      cuts: [
        createCut({ id: 'cut-1', pageIndex: 0, label: '010' }),
        createCut({ id: 'cut-2', pageIndex: 1, label: '011' }),
      ],
      settings: createAppSettings({
        nextNumber: 12,
        minDigits: 4,
        useWhiteBackground: true,
      }),
      template: createTemplate({ id: 'custom', name: 'Custom' }),
      pageCount: 2,
      projectName: 'Episode 02',
    });

    const legacy = createLegacyStateFromProjectDocument(project);

    expect(legacy.projectName).toBe('Episode 02');
    expect(legacy.logicalPageCount).toBe(2);
    expect(legacy.cuts.map((cut) => cut.pageIndex)).toEqual([0, 1]);
    expect(legacy.settings.nextNumber).toBe(12);
    expect(legacy.settings.minDigits).toBe(4);
    expect(legacy.template.name).toBe('Custom');
  });

  it('derives current asset hints from PDF and image sessions', () => {
    const pdfHints = createAssetHintsFromCurrentDocument({
      docType: 'pdf',
      pdfFile: new File(['pdf'], 'board.pdf', { type: 'application/pdf' }),
      imageFiles: [],
      pageCount: 2,
    });

    expect(pdfHints).toEqual([
      { sourceKind: 'pdf-page', sourceLabel: 'board.pdf', pageNumber: 1 },
      { sourceKind: 'pdf-page', sourceLabel: 'board.pdf', pageNumber: 2 },
    ]);

    const imageHints = createAssetHintsFromCurrentDocument({
      docType: 'images',
      pdfFile: null,
      imageFiles: [
        new File(['1'], '001.png', { type: 'image/png' }),
        new File(['2'], '002.png', { type: 'image/png' }),
      ],
      pageCount: 2,
    });

    expect(imageHints).toEqual([
      { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
    ]);
  });
});
