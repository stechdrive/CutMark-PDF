import { Template } from '../types';

export const CLICK_SNAP_THRESHOLD_PX = 12;

interface FitScaleOptions {
  contentWidth: number;
  contentHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
  maxAutoScale?: number;
}

interface ClickPlacementOptions {
  x: number;
  y: number;
  contentWidthPx: number;
  template: Template;
  enableClickSnapToRows: boolean;
  snapThresholdPx?: number;
}

interface SnapCandidateOptions {
  x: number;
  contentWidthPx: number;
  template: Template;
  enableClickSnapToRows: boolean;
  snapThresholdPx?: number;
}

interface ClickSnapTargetOptions extends SnapCandidateOptions {
  y: number;
}

interface ClickSnapTarget {
  x: number;
  y: number;
  rowIndex: number;
}

export const calculateFitScale = ({
  contentWidth,
  contentHeight,
  viewportWidth,
  viewportHeight,
  padding = 40,
  maxAutoScale = 1.5,
}: FitScaleOptions): number => {
  const availWidth = Math.max(100, viewportWidth - padding);
  const availHeight = Math.max(100, viewportHeight - padding);

  const scaleX = availWidth / contentWidth;
  const scaleY = availHeight / contentHeight;

  return Math.floor(Math.min(scaleX, scaleY, maxAutoScale) * 100) / 100;
};

export const isClickSnapCandidate = ({
  x,
  contentWidthPx,
  template,
  enableClickSnapToRows,
  snapThresholdPx = CLICK_SNAP_THRESHOLD_PX,
}: SnapCandidateOptions): boolean => {
  if (!enableClickSnapToRows) return false;
  if (template.rowPositions.length === 0) return false;

  const dxPx = Math.abs(x - template.xPosition) * contentWidthPx;
  return dxPx <= snapThresholdPx;
};

export const getClickSnapTarget = ({
  x,
  y,
  contentWidthPx,
  template,
  enableClickSnapToRows,
  snapThresholdPx = CLICK_SNAP_THRESHOLD_PX,
}: ClickSnapTargetOptions): ClickSnapTarget | null => {
  if (!enableClickSnapToRows || template.rowPositions.length === 0) {
    return null;
  }

  const dxPx = Math.abs(x - template.xPosition) * contentWidthPx;
  if (dxPx > snapThresholdPx) {
    return null;
  }

  const sortedRows = template.rowPositions
    .map((rowY, rowIndex) => ({ rowY, rowIndex }))
    .sort((a, b) => a.rowY - b.rowY);

  let snapTarget = sortedRows[0];

  for (const row of sortedRows) {
    if (row.rowY <= y) {
      snapTarget = row;
    } else {
      break;
    }
  }

  return {
    x: template.xPosition,
    y: snapTarget.rowY,
    rowIndex: snapTarget.rowIndex,
  };
};

export const getPlacementFromClick = ({
  x,
  y,
  contentWidthPx,
  template,
  enableClickSnapToRows,
  snapThresholdPx = CLICK_SNAP_THRESHOLD_PX,
}: ClickPlacementOptions): { x: number; y: number } => {
  const snapTarget = getClickSnapTarget({
    x,
    y,
    contentWidthPx,
    template,
    enableClickSnapToRows,
    snapThresholdPx,
  });
  if (!snapTarget) {
    return { x, y };
  }

  return {
    x: snapTarget.x,
    y: snapTarget.y,
  };
};
