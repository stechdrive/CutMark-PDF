import { describe, expect, it } from 'vitest';
import { summarizeProjectAssetComparison } from '../../application/projectComparison';
import { createProjectDocument } from '../../domain/project';
import { createAppSettings, createTemplate } from '../../test/factories';

describe('projectComparison', () => {
  it('marks pages as matched when saved hints and current assets line up by order', () => {
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
      ],
    });

    const summary = summarizeProjectAssetComparison(project, [
      { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
    ]);

    expect(summary.matchedPageCount).toBe(2);
    expect(summary.needsReviewCount).toBe(0);
    expect(summary.missingAssetCount).toBe(0);
    expect(summary.canApplyByPageCount).toBe(true);
  });

  it('flags pages for review when page order matches but asset labels differ', () => {
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
      ],
    });

    const summary = summarizeProjectAssetComparison(project, [
      { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      { sourceKind: 'image', sourceLabel: '009_revised.png', pageNumber: 2 },
    ]);

    expect(summary.matchedPageCount).toBe(1);
    expect(summary.needsReviewCount).toBe(1);
    expect(summary.missingAssetCount).toBe(0);
    expect(summary.canApplyByPageCount).toBe(true);
    expect(summary.rows[1].status).toBe('needs_review');
  });

  it('detects missing and extra assets when page counts drift', () => {
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

    const missingSummary = summarizeProjectAssetComparison(project, [
      { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
    ]);
    const extraSummary = summarizeProjectAssetComparison(project, [
      { sourceKind: 'image', sourceLabel: '001.png', pageNumber: 1 },
      { sourceKind: 'image', sourceLabel: '002.png', pageNumber: 2 },
      { sourceKind: 'image', sourceLabel: '003.png', pageNumber: 3 },
      { sourceKind: 'image', sourceLabel: '004_inserted.png', pageNumber: 4 },
    ]);

    expect(missingSummary.missingAssetCount).toBe(1);
    expect(missingSummary.canApplyByPageCount).toBe(false);
    expect(missingSummary.rows[2].status).toBe('missing_asset');

    expect(extraSummary.extraAssetCount).toBe(1);
    expect(extraSummary.canApplyByPageCount).toBe(false);
  });
});
