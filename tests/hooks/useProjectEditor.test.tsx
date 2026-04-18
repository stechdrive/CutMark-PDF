import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useProjectEditor } from '../../hooks/useProjectEditor';
import { createProjectDocument } from '../../domain/project';
import { createAppSettings, createTemplate } from '../../test/factories';

const project = createProjectDocument({
  settings: createAppSettings(),
  template: createTemplate(),
  logicalPages: [
    {
      id: 'page-1',
      cuts: [{ id: 'cut-1', x: 0.1, y: 0.1, label: '001', isBranch: false }],
      expectedAssetHint: { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
    },
    {
      id: 'page-2',
      cuts: [{ id: 'cut-2', x: 0.2, y: 0.2, label: '002', isBranch: false }],
      expectedAssetHint: { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
    },
  ],
});

describe('useProjectEditor', () => {
  it('loads a project, manages staging history, and keeps selection on new pages', async () => {
    const { result, rerender } = renderHook(
      ({
        currentAssets,
      }: {
        currentAssets: Array<{ sourceKind: 'image'; sourceLabel: string; pageNumber: number }>;
      }) => useProjectEditor(currentAssets),
      {
        initialProps: {
          currentAssets: [
            { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
            { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
          ],
        },
      }
    );

    act(() => {
      result.current.loadProject(project);
    });

    expect(result.current.project?.logicalPages).toHaveLength(2);
    expect(result.current.selectedLogicalPageId).toBe('page-1');
    expect(result.current.assignedCount).toBe(2);

    act(() => {
      result.current.assignAsset('page-2', 0);
    });

    expect(result.current.bindings).toEqual({
      'page-1': null,
      'page-2': 0,
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.bindings).toEqual({
      'page-1': 0,
      'page-2': 1,
    });

    act(() => {
      result.current.insertPageAfter('page-1');
    });

    expect(result.current.project?.logicalPages).toHaveLength(3);
    expect(result.current.selectedLogicalPageNumber).toBe(2);

    await act(async () => {
      rerender({
        currentAssets: [
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
          { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
        ],
      });
      await Promise.resolve();
    });

    expect(result.current.bindings[result.current.selectedLogicalPageId ?? '']).toBe(2);
  });

  it('renumbers with the current numbering policy and keeps reset binding history undoable', async () => {
    const { result, rerender } = renderHook(
      ({
        currentAssets,
      }: {
        currentAssets: Array<{ sourceKind: 'image'; sourceLabel: string; pageNumber: number }>;
      }) => useProjectEditor(currentAssets),
      {
        initialProps: {
          currentAssets: [
            { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
            { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
          ],
        },
      }
    );

    act(() => {
      result.current.loadProject(project);
    });

    act(() => {
      result.current.assignAsset('page-2', 0);
    });

    await act(async () => {
      rerender({
        currentAssets: [{ sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 }],
      });
      await Promise.resolve();
    });

    act(() => {
      result.current.resetBindings();
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.bindings).toEqual({
      'page-1': null,
      'page-2': 0,
    });

    let nextNumbering = null;
    act(() => {
      nextNumbering = result.current.renumberFromCut('cut-1', {
        nextNumber: 20,
        branchChar: null,
        autoIncrement: true,
        minDigits: 4,
      });
    });

    expect(result.current.project?.logicalPages[0].cuts[0].label).toBe('0020');
    expect(result.current.project?.logicalPages[1].cuts[0].label).toBe('0021');
    expect(nextNumbering).toMatchObject({
      nextNumber: 22,
      branchChar: null,
      autoIncrement: true,
      minDigits: 4,
    });
  });

  it('updates project settings and template in-place for loaded projects', () => {
    const { result } = renderHook(() =>
      useProjectEditor([
        { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
        { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
      ])
    );

    act(() => {
      result.current.loadProject(project);
    });

    act(() => {
      result.current.updateSettings((current) => ({
        ...current,
        nextNumber: 30,
        fontSize: 36,
        useWhiteBackground: true,
      }));
      result.current.updateTemplate((current) => ({
        ...current,
        xPosition: 0.25,
        rowCount: 3,
        rowPositions: [0.1, 0.5, 0.9],
      }));
    });

    expect(result.current.project?.numbering).toMatchObject({
      nextNumber: 30,
    });
    expect(result.current.project?.style).toMatchObject({
      fontSize: 36,
      useWhiteBackground: true,
    });
    expect(result.current.project?.template).toMatchObject({
      xPosition: 0.25,
      rowCount: 3,
      rowPositions: [0.1, 0.5, 0.9],
    });
  });

  it('commits transactional template edits as a single undo step', () => {
    const { result } = renderHook(() =>
      useProjectEditor([
        { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
        { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
      ])
    );

    act(() => {
      result.current.loadProject(project);
    });

    act(() => {
      result.current.beginTransaction();
      result.current.updateTemplate((current) => ({
        ...current,
        xPosition: 0.2,
      }), { pushHistory: false });
      result.current.updateTemplate((current) => ({
        ...current,
        xPosition: 0.3,
      }), { pushHistory: false });
      result.current.commitTransaction();
    });

    expect(result.current.project?.template.xPosition).toBe(0.3);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.project?.template.xPosition).toBe(project.template.xPosition);
  });
});
