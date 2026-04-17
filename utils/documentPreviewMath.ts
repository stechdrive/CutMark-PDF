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

export const getPlacementFromClick = ({
  x,
  y,
  contentWidthPx,
  template,
  enableClickSnapToRows,
  snapThresholdPx = CLICK_SNAP_THRESHOLD_PX,
}: ClickPlacementOptions): { x: number; y: number } => {
  if (!enableClickSnapToRows || template.rowPositions.length === 0) {
    return { x, y };
  }

  const dxPx = Math.abs(x - template.xPosition) * contentWidthPx;
  if (dxPx > snapThresholdPx) {
    return { x, y };
  }

  const sortedRows = [...template.rowPositions].sort((a, b) => a - b);
  let snapY = sortedRows[0];

  for (const row of sortedRows) {
    if (row <= y) {
      snapY = row;
    } else {
      break;
    }
  }

  return {
    x: template.xPosition,
    y: snapY,
  };
};
