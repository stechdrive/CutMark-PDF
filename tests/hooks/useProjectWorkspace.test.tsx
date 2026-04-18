import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
        setLoadedLogicalPageSelection: undefined,
        currentAssetHints: [
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
        ],
        effectiveSettings: settings,
        effectiveTemplate: template,
        fallbackSettings: settings,
        loadedSession: {
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
        currentSession: {
          project: null,
          bindings: {},
          selectedLogicalPage: null,
          selectedLogicalPageId: null,
          selectedLogicalPageNumber: null,
          selectedAssetIndex: null,
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
    expect(result.current.projectStatusMessage).toContain('カット番号P2');
    expect(result.current.previewCuts).toEqual([
      expect.objectContaining({
        id: 'cut-2',
        pageIndex: 1,
        label: '002',
      }),
    ]);
  });

  it('falls back to the current project when no loaded project is active', () => {
    const currentProject = createProjectDocument({
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
        setLoadedLogicalPageSelection: undefined,
        currentAssetHints: [{ sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 }],
        effectiveSettings: settings,
        effectiveTemplate: template,
        fallbackSettings: settings,
        loadedSession: {
          project: null,
          bindings: {},
          canApply: false,
          assignedCount: 0,
          selectedLogicalPage: null,
          selectedLogicalPageId: null,
          selectedLogicalPageNumber: null,
          selectedAssetIndex: null,
        },
        currentSession: {
          project: currentProject,
          bindings: { 'page-1': 0 },
          selectedLogicalPage: currentProject.logicalPages[0],
          selectedLogicalPageId: 'page-1',
          selectedLogicalPageNumber: 1,
          selectedAssetIndex: 0,
        },
      });
    });

    expect(result.current.activeProject?.meta.name).toBe(currentProject.meta.name);
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

  it('syncs the selected logical page to the current preview page while browsing assets', async () => {
    const loadedProject = createProjectDocument({
      settings,
      template,
      logicalPages: [
        { id: 'page-1', cuts: [], expectedAssetHint: null },
        { id: 'page-2', cuts: [], expectedAssetHint: null },
      ],
    });

    const { result } = renderHook(() => {
      const [currentPage, setCurrentPage] = useState(2);
      const [selectedLogicalPageId, setSelectedLogicalPageId] = useState<string | null>(null);
      const selectedLogicalPage =
        loadedProject.logicalPages.find((page) => page.id === selectedLogicalPageId) ?? null;

      const workspace = useProjectWorkspace({
        docType: 'images',
        currentPage,
        setCurrentPage,
        setLoadedLogicalPageSelection: setSelectedLogicalPageId,
        currentAssetHints: [
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
        ],
        effectiveSettings: settings,
        effectiveTemplate: template,
        fallbackSettings: settings,
        loadedSession: {
          project: loadedProject,
          bindings: {
            'page-1': 0,
            'page-2': 1,
          },
          canApply: true,
          assignedCount: 2,
          selectedLogicalPage,
          selectedLogicalPageId,
          selectedLogicalPageNumber:
            selectedLogicalPageId === 'page-1' ? 1 : selectedLogicalPageId === 'page-2' ? 2 : null,
          selectedAssetIndex:
            selectedLogicalPageId === 'page-1' ? 0 : selectedLogicalPageId === 'page-2' ? 1 : null,
        },
        currentSession: {
          project: null,
          bindings: {},
          selectedLogicalPage: null,
          selectedLogicalPageId: null,
          selectedLogicalPageNumber: null,
          selectedAssetIndex: null,
        },
      });

      return {
        currentPage,
        selectedLogicalPageId,
        setCurrentPage,
        ...workspace,
      };
    });

    await waitFor(() => {
      expect(result.current.selectedLogicalPageId).toBe('page-2');
    });

    act(() => {
      result.current.setCurrentPage(1);
    });

    await waitFor(() => {
      expect(result.current.selectedLogicalPageId).toBe('page-1');
    });
  });

  it('keeps an explicitly selected unassigned logical page while the preview page stays the same', async () => {
    const loadedProject = createProjectDocument({
      settings,
      template,
      logicalPages: [
        { id: 'page-1', cuts: [], expectedAssetHint: null },
        { id: 'page-2', cuts: [], expectedAssetHint: null },
      ],
    });

    const { result } = renderHook(() => {
      const [currentPage, setCurrentPage] = useState(1);
      const [selectedLogicalPageId, setSelectedLogicalPageId] = useState<string | null>(null);
      const selectedLogicalPage =
        loadedProject.logicalPages.find((page) => page.id === selectedLogicalPageId) ?? null;

      useProjectWorkspace({
        docType: 'images',
        currentPage,
        setCurrentPage,
        setLoadedLogicalPageSelection: setSelectedLogicalPageId,
        currentAssetHints: [
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
        ],
        effectiveSettings: settings,
        effectiveTemplate: template,
        fallbackSettings: settings,
        loadedSession: {
          project: loadedProject,
          bindings: {
            'page-1': 0,
            'page-2': null,
          },
          canApply: false,
          assignedCount: 1,
          selectedLogicalPage,
          selectedLogicalPageId,
          selectedLogicalPageNumber:
            selectedLogicalPageId === 'page-1' ? 1 : selectedLogicalPageId === 'page-2' ? 2 : null,
          selectedAssetIndex:
            selectedLogicalPageId === 'page-1' ? 0 : null,
        },
        currentSession: {
          project: null,
          bindings: {},
          selectedLogicalPage: null,
          selectedLogicalPageId: null,
          selectedLogicalPageNumber: null,
          selectedAssetIndex: null,
        },
      });

      return {
        currentPage,
        selectedLogicalPageId,
        setSelectedLogicalPageId,
      };
    });

    await waitFor(() => {
      expect(result.current.selectedLogicalPageId).toBe('page-1');
    });

    act(() => {
      result.current.setSelectedLogicalPageId('page-2');
    });

    await waitFor(() => {
      expect(result.current.selectedLogicalPageId).toBe('page-2');
    });
    expect(result.current.currentPage).toBe(1);
  });

  it('exposes a conte-page focus action for organizer cards', () => {
    const loadedProject = createProjectDocument({
      settings,
      template,
      logicalPages: [
        { id: 'page-1', cuts: [], expectedAssetHint: null },
        { id: 'page-2', cuts: [], expectedAssetHint: null },
      ],
    });
    const setLoadedLogicalPageSelection = vi.fn();

    const { result } = renderHook(() => {
      const [currentPage, setCurrentPage] = useState(1);
      const workspace = useProjectWorkspace({
        docType: 'images',
        currentPage,
        setCurrentPage,
        setLoadedLogicalPageSelection,
        currentAssetHints: [
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
        ],
        effectiveSettings: settings,
        effectiveTemplate: template,
        fallbackSettings: settings,
        loadedSession: {
          project: loadedProject,
          bindings: {
            'page-1': 0,
            'page-2': 1,
          },
          canApply: true,
          assignedCount: 2,
          selectedLogicalPage: null,
          selectedLogicalPageId: null,
          selectedLogicalPageNumber: null,
          selectedAssetIndex: null,
        },
        currentSession: {
          project: null,
          bindings: {},
          selectedLogicalPage: null,
          selectedLogicalPageId: null,
          selectedLogicalPageNumber: null,
          selectedAssetIndex: null,
        },
      });

      return {
        currentPage,
        ...workspace,
      };
    });

    act(() => {
      result.current.focusContePage(1, 'page-2');
    });

    expect(result.current.currentPage).toBe(2);
    expect(setLoadedLogicalPageSelection).toHaveBeenCalledWith('page-2');
    expect(result.current.previewCuts).toEqual([]);
  });
});
