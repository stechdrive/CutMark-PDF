import { describe, expect, it } from 'vitest';
import {
  applyBoundAssetHintsToProject,
  countAssignedProjectAssetBindings,
  createSequentialProjectAssetBindings,
  createSuggestedProjectAssetBindings,
  hasCompleteProjectAssetBindings,
  reassignProjectAssetBinding,
  synchronizeProjectAssetBindings,
} from '../../application/projectBindings';
import { createProjectDocument } from '../../domain/project';
import { createAppSettings, createTemplate } from '../../test/factories';

const project = createProjectDocument({
  settings: createAppSettings(),
  template: createTemplate(),
  logicalPages: [
    {
      id: 'page-1',
      cuts: [],
      expectedAssetHint: {
        sourceKind: 'image',
        sourceLabel: '001.png',
        pageNumber: 1,
      },
    },
    {
      id: 'page-2',
      cuts: [],
      expectedAssetHint: {
        sourceKind: 'image',
        sourceLabel: '002.png',
        pageNumber: 2,
      },
    },
    {
      id: 'page-3',
      cuts: [],
      expectedAssetHint: {
        sourceKind: 'image',
        sourceLabel: '003.png',
        pageNumber: 3,
      },
    },
  ],
});

describe('application/projectBindings', () => {
  it('prefers exact asset hint matches when suggesting bindings', () => {
    const bindings = createSuggestedProjectAssetBindings(project, [
      { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
      { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
      { sourceKind: 'image', sourceLabel: '004.png', pageNumber: 4 },
    ]);

    expect(bindings).toEqual({
      'page-1': 1,
      'page-2': 0,
      'page-3': 2,
    });
  });

  it('keeps bindings unique when a page is reassigned', () => {
    const next = reassignProjectAssetBinding(
      {
        'page-1': 0,
        'page-2': 1,
        'page-3': 2,
      },
      'page-3',
      1
    );

    expect(next).toEqual({
      'page-1': 0,
      'page-2': null,
      'page-3': 1,
    });
  });

  it('creates sequential bindings for the current document order', () => {
    const bindings = createSequentialProjectAssetBindings(project, 2);

    expect(bindings).toEqual({
      'page-1': 0,
      'page-2': 1,
      'page-3': null,
    });
  });

  it('reports assignment completeness against logical pages', () => {
    const partial = {
      'page-1': 0,
      'page-2': null,
      'page-3': 2,
    };

    expect(countAssignedProjectAssetBindings(project, partial)).toBe(2);
    expect(hasCompleteProjectAssetBindings(project, partial)).toBe(false);
    expect(
      hasCompleteProjectAssetBindings(project, {
        'page-1': 0,
        'page-2': 1,
        'page-3': 2,
      })
    ).toBe(true);
  });

  it('preserves still-valid manual bindings while filling gaps with suggestions', () => {
    const synced = synchronizeProjectAssetBindings(
      project,
      [
        { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
        { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
        { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
      ],
      {
        'page-1': 2,
        'page-2': null,
        'page-3': 1,
      }
    );

    expect(synced).toEqual({
      'page-1': 2,
      'page-2': 0,
      'page-3': 1,
    });
  });

  it('writes currently bound asset hints back onto logical pages for saving', () => {
    const savedProject = applyBoundAssetHintsToProject(
      project,
      {
        'page-1': 2,
        'page-2': 0,
        'page-3': null,
      },
      [
        { sourceKind: 'image', sourceLabel: 'A.png', pageNumber: 1 },
        { sourceKind: 'image', sourceLabel: 'B.png', pageNumber: 2 },
        { sourceKind: 'image', sourceLabel: 'C.png', pageNumber: 3 },
      ]
    );

    expect(savedProject.logicalPages[0].expectedAssetHint?.sourceLabel).toBe('C.png');
    expect(savedProject.logicalPages[1].expectedAssetHint?.sourceLabel).toBe('A.png');
    expect(savedProject.logicalPages[2].expectedAssetHint?.sourceLabel).toBe('003.png');
  });
});
