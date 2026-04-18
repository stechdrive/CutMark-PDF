import { describe, expect, it } from 'vitest';
import {
  insertLogicalPageAfter,
  moveLogicalPage,
  removeLogicalPage,
} from '../../application/projectPages';
import { createLogicalPage, createProjectDocument } from '../../domain/project';
import { createAppSettings, createTemplate } from '../../test/factories';

const createProject = () =>
  createProjectDocument({
    settings: createAppSettings(),
    template: createTemplate(),
    logicalPages: [
      createLogicalPage({ id: 'page-1' }),
      createLogicalPage({ id: 'page-2' }),
      createLogicalPage({ id: 'page-3' }),
    ],
  });

describe('application/projectPages', () => {
  it('inserts a blank logical page after the requested page', () => {
    const nextProject = insertLogicalPageAfter(
      createProject(),
      'page-1',
      createLogicalPage({ id: 'page-new' })
    );

    expect(nextProject.logicalPages.map((page) => page.id)).toEqual([
      'page-1',
      'page-new',
      'page-2',
      'page-3',
    ]);
  });

  it('moves a logical page by one step within bounds', () => {
    const movedUp = moveLogicalPage(createProject(), 'page-2', -1);
    const movedDown = moveLogicalPage(createProject(), 'page-2', 1);

    expect(movedUp.logicalPages.map((page) => page.id)).toEqual([
      'page-2',
      'page-1',
      'page-3',
    ]);
    expect(movedDown.logicalPages.map((page) => page.id)).toEqual([
      'page-1',
      'page-3',
      'page-2',
    ]);
  });

  it('does not remove the final logical page', () => {
    const singlePageProject = createProjectDocument({
      settings: createAppSettings(),
      template: createTemplate(),
      logicalPages: [createLogicalPage({ id: 'page-1' })],
    });

    expect(removeLogicalPage(createProject(), 'page-2').logicalPages.map((page) => page.id)).toEqual([
      'page-1',
      'page-3',
    ]);
    expect(removeLogicalPage(singlePageProject, 'page-1').logicalPages.map((page) => page.id)).toEqual([
      'page-1',
    ]);
  });
});
