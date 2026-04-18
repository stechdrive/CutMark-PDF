import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLegacyProjectProjection } from '../../hooks/useLegacyProjectProjection';
import { createAppSettings, createCut, createTemplate } from '../../test/factories';

describe('useLegacyProjectProjection', () => {
  it('projects legacy cuts into logical pages, sequential bindings, and preview selection', () => {
    const { result } = renderHook(() =>
      useLegacyProjectProjection({
        docType: 'images',
        cuts: [
          createCut({ id: 'cut-1', pageIndex: 0, label: '001' }),
          createCut({ id: 'cut-2', pageIndex: 1, label: '002' }),
        ],
        settings: createAppSettings(),
        template: createTemplate(),
        numPages: 2,
        currentPage: 2,
        currentAssetHints: [
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
        ],
        currentProjectName: 'batch-a',
      })
    );

    expect(result.current.project?.meta.name).toBe('batch-a');
    expect(result.current.project?.logicalPages).toHaveLength(2);
    expect(result.current.project?.logicalPages[0].cuts[0]).toMatchObject({
      id: 'cut-1',
      label: '001',
    });
    expect(result.current.bindings).toEqual({
      'page-1': 0,
      'page-2': 1,
    });
    expect(result.current.previewLogicalPage?.id).toBe('page-2');
  });
});
