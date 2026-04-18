import { renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useProjectWorkspace } from '../../hooks/useProjectWorkspace';
import { createAppSettings, createTemplate } from '../../test/factories';

const settings = createAppSettings();
const template = createTemplate();

describe('useProjectWorkspace', () => {
  it('syncs the preview page to the selected loaded project binding', async () => {
    const loadedProject = createProjectDocument({
      settings,
      template,
      logicalPages: [
        { id: 'page-1', cuts: [], expectedAssetHint: null },
        {
          id: 'page-2',
          cuts: [{ id: 'cut-2', x: 0.2, y: 0.3, label: '002', isBranch: false }],
          expectedAssetHint: null,
        },
      ],
    });

    const { result } = renderHook(() => {
      const [currentPage, setCurrentPage] = useState(1);
      const workspace = useProjectWorkspace({
        docType: 'images',
        currentPage,
        setCurrentPage,
        currentAssetHints: [
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
        ],
        effectiveSettings: settings,
        effectiveTemplate: template,
        fallbackSettings: settings,
        projectEditor: {
          project: loadedProject,
          bindings: {
            'page-1': 0,
            'page-2': 1,
          },
          canApply: true,
          assignedCount: 2,
          selectedLogicalPage: loadedProject.logicalPages[1],
          selectedLogicalPageId: 'page-2',
          selectedLogicalPageNumber: 2,
          selectedAssetIndex: 1,
        },
        legacyProjection: {
          project: null,
          bindings: {},
          previewLogicalPage: null,
        },
      });

      return {
        currentPage,
        ...workspace,
      };
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(2);
    });

    expect(result.current.canApplyLoadedProject).toBe(true);
    expect(result.current.projectStatusMessage).toContain('論理P2');
    expect(result.current.previewCuts).toEqual([
      expect.objectContaining({
        id: 'cut-2',
        pageIndex: 1,
        label: '002',
      }),
    ]);
  });

  it('falls back to the legacy projection when no loaded project is active', () => {
    const legacyProject = createProjectDocument({
      settings,
      template,
      logicalPages: [
        {
          id: 'page-1',
          cuts: [{ id: 'cut-1', x: 0.1, y: 0.2, label: '001', isBranch: false }],
          expectedAssetHint: null,
        },
      ],
    });

    const { result } = renderHook(() => {
      const [currentPage, setCurrentPage] = useState(1);
      return useProjectWorkspace({
        docType: 'images',
        currentPage,
        setCurrentPage,
        currentAssetHints: [{ sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 }],
        effectiveSettings: settings,
        effectiveTemplate: template,
        fallbackSettings: settings,
        projectEditor: {
          project: null,
          bindings: {},
          canApply: false,
          assignedCount: 0,
          selectedLogicalPage: null,
          selectedLogicalPageId: null,
          selectedLogicalPageNumber: null,
          selectedAssetIndex: null,
        },
        legacyProjection: {
          project: legacyProject,
          bindings: { 'page-1': 0 },
          previewLogicalPage: legacyProject.logicalPages[0],
        },
      });
    });

    expect(result.current.activeProject?.meta.name).toBe(legacyProject.meta.name);
    expect(result.current.previewCuts).toEqual([
      expect.objectContaining({
        id: 'cut-1',
        pageIndex: 0,
        label: '001',
      }),
    ]);
    expect(result.current.effectiveExportCuts).toEqual([
      expect.objectContaining({
        id: 'cut-1',
        pageIndex: 0,
        label: '001',
      }),
    ]);
  });
});
