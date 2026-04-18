import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../test/factories';
import {
  calculateFitScale,
  getClickSnapTarget,
  getPlacementFromClick,
  isClickSnapCandidate,
} from '../../utils/documentPreviewMath';

describe('documentPreviewMath', () => {
  it('caps auto-fit scale and rounds down to two decimal places', () => {
    expect(calculateFitScale({
      contentWidth: 500,
      contentHeight: 1000,
      viewportWidth: 2000,
      viewportHeight: 2000,
    })).toBe(1.5);

    expect(calculateFitScale({
      contentWidth: 1000,
      contentHeight: 1000,
      viewportWidth: 640,
      viewportHeight: 480,
    })).toBe(0.44);
  });

  it('detects snap candidacy only when close to the template baseline', () => {
    const template = createTemplate({
      xPosition: 0.1,
      rowPositions: [0.2, 0.5, 0.8],
    });

    expect(isClickSnapCandidate({
      x: 0.109,
      contentWidthPx: 1000,
      template,
      enableClickSnapToRows: true,
    })).toBe(true);

    expect(isClickSnapCandidate({
      x: 0.2,
      contentWidthPx: 1000,
      template,
      enableClickSnapToRows: true,
    })).toBe(false);
  });

  it('returns the original click position when snapping is disabled or too far away', () => {
    const template = createTemplate({
      xPosition: 0.1,
      rowPositions: [0.2, 0.5, 0.8],
    });

    expect(getPlacementFromClick({
      x: 0.2,
      y: 0.6,
      contentWidthPx: 1000,
      template,
      enableClickSnapToRows: true,
    })).toEqual({ x: 0.2, y: 0.6 });

    expect(getPlacementFromClick({
      x: 0.109,
      y: 0.6,
      contentWidthPx: 1000,
      template,
      enableClickSnapToRows: false,
    })).toEqual({ x: 0.109, y: 0.6 });
  });

  it('offsets free placement upward so the click lands near the visual center', () => {
    const template = createTemplate({
      xPosition: 0.1,
      rowPositions: [0.2, 0.5, 0.8],
    });

    expect(getPlacementFromClick({
      x: 0.3,
      y: 0.25,
      contentWidthPx: 1000,
      contentHeightPx: 1000,
      template,
      enableClickSnapToRows: true,
      freePlacementOffsetYPx: 18,
    })).toEqual({ x: 0.3, y: 0.232 });
  });

  it('snaps to the nearest previous row while forcing x to the template baseline', () => {
    const template = createTemplate({
      xPosition: 0.1,
      rowCount: 3,
      rowPositions: [0.8, 0.2, 0.5],
    });

    expect(getPlacementFromClick({
      x: 0.109,
      y: 0.55,
      contentWidthPx: 1000,
      template,
      enableClickSnapToRows: true,
    })).toEqual({ x: 0.1, y: 0.5 });

    expect(getPlacementFromClick({
      x: 0.109,
      y: 0.05,
      contentWidthPx: 1000,
      template,
      enableClickSnapToRows: true,
    })).toEqual({ x: 0.1, y: 0.2 });
  });

  it('returns the snap target row metadata for preview highlighting', () => {
    const template = createTemplate({
      xPosition: 0.1,
      rowCount: 3,
      rowPositions: [0.8, 0.2, 0.5],
    });

    expect(getClickSnapTarget({
      x: 0.109,
      y: 0.55,
      contentWidthPx: 1000,
      template,
      enableClickSnapToRows: true,
    })).toEqual({ x: 0.1, y: 0.5, rowIndex: 2 });

    expect(getClickSnapTarget({
      x: 0.2,
      y: 0.55,
      contentWidthPx: 1000,
      template,
      enableClickSnapToRows: true,
    })).toBeNull();
  });
});
