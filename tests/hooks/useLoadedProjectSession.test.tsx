import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createProjectDocument } from '../../domain/project';
import { useLoadedProjectSession } from '../../hooks/useLoadedProjectSession';
import { createAppSettings, createTemplate } from '../../test/factories';

const loadedProject = createProjectDocument({
  settings: createAppSettings({
    nextNumber: 12,
    branchChar: 'A',
    minDigits: 4,
    autoIncrement: true,
  }),
  template: createTemplate(),
  logicalPages: [
    {
      id: 'page-1',
      cuts: [{ id: 'cut-1', x: 0.1, y: 0.2, label: '0012\nA', isBranch: true }],
      expectedAssetHint: { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
    },
    {
      id: 'page-2',
      cuts: [],
      expectedAssetHint: { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
    },
  ],
});

describe('useLoadedProjectSession', () => {
  it('adapts the loaded project editor into workspace and cut editor contracts', () => {
    const { result } = renderHook(() =>
      useLoadedProjectSession(
        [
          { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
          { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
        ],
        createAppSettings()
      )
    );

    act(() => {
      result.current.loadProject(loadedProject);
    });

    expect(result.current.workspaceSession.project?.meta.name).toBe(loadedProject.meta.name);
    expect(result.current.workspaceSession.selectedLogicalPageId).toBe('page-1');
    expect(result.current.workspaceSession.assignedCount).toBe(2);
    expect(result.current.workspaceSession.canApply).toBe(true);
    expect(result.current.projectCutEditorApi.settings).toMatchObject({
      nextNumber: 12,
      branchChar: 'A',
      minDigits: 4,
    });

    act(() => {
      result.current.projectCutEditorApi.setNumberingState({
        nextNumber: 20,
        branchChar: null,
      });
      result.current.projectCutEditorApi.addCutToSelectedPage(
        {
          id: 'cut-2',
          x: 0.3,
          y: 0.4,
          label: '0020',
          isBranch: false,
        },
        {
          nextNumber: 21,
          branchChar: null,
        }
      );
    });

    expect(result.current.project?.numbering).toMatchObject({
      nextNumber: 21,
      branchChar: null,
    });
    expect(result.current.project?.logicalPages[0].cuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'cut-2',
          label: '0020',
        }),
      ])
    );
    expect(result.current.projectCutEditorApi.selectedCutId).toBe('cut-2');
    expect(result.current.projectCutEditorApi.canUndo).toBe(true);
  });
});
