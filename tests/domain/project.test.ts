import { describe, expect, it } from 'vitest';
import { createAppSettings, createTemplate } from '../../test/factories';
import {
  createEditorState,
  createLogicalPage,
  createProjectDocument,
  toNumberingPolicy,
  toStyleSettings,
  toTemplateSnapshot,
} from '../../domain/project';

describe('domain/project', () => {
  it('maps current app settings into project numbering and style slices', () => {
    const settings = createAppSettings({
      nextNumber: 12,
      branchChar: 'B',
      autoIncrement: false,
      minDigits: 4,
      fontSize: 31,
      useWhiteBackground: true,
      backgroundPadding: 6,
      textOutlineWidth: 3,
      enableClickSnapToRows: false,
    });

    expect(toNumberingPolicy(settings)).toEqual({
      nextNumber: 12,
      branchChar: 'B',
      autoIncrement: false,
      minDigits: 4,
    });

    expect(toStyleSettings(settings)).toEqual({
      fontSize: 31,
      useWhiteBackground: true,
      backgroundPadding: 6,
      textOutlineWidth: 3,
      enableClickSnapToRows: false,
    });
  });

  it('creates a project document with logical pages and a template snapshot', () => {
    const logicalPage = createLogicalPage({ id: 'page-1' });
    const template = createTemplate({ id: 'tpl-1', name: '5 rows' });

    const project = createProjectDocument({
      settings: createAppSettings(),
      template,
      name: 'Episode 1',
      savedAt: '2026-04-18T00:00:00.000Z',
      logicalPages: [logicalPage],
    });

    expect(project).toMatchObject({
      version: 1,
      meta: {
        name: 'Episode 1',
        savedAt: '2026-04-18T00:00:00.000Z',
      },
      logicalPages: [{ id: 'page-1', cuts: [] }],
    });
    expect(project.template).toEqual(toTemplateSnapshot(template));
  });

  it('creates editor state with one unbound binding per logical page', () => {
    const project = createProjectDocument({
      settings: createAppSettings(),
      template: createTemplate(),
      logicalPages: [
        createLogicalPage({ id: 'page-1' }),
        createLogicalPage({ id: 'page-2' }),
      ],
    });

    const state = createEditorState(project);

    expect(state.selection.logicalPageId).toBe('page-1');
    expect(state.bindings['page-1']).toMatchObject({
      logicalPageId: 'page-1',
      assetId: null,
      status: 'unbound',
    });
    expect(state.bindings['page-2']).toMatchObject({
      logicalPageId: 'page-2',
      assetId: null,
      status: 'unbound',
    });
  });
});
