import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { AppSettings, Template } from '../types';
import {
  getClickSnapTarget,
  getPlacementFromClick,
} from '../utils/documentPreviewMath';

const POINTER_TAP_SLOP_PX = 8;

interface UseDocumentPlacementInteractionOptions {
  mode: 'edit' | 'template';
  settings: AppSettings;
  template: Template;
  onContentClick: (x: number, y: number) => void;
  containerRef: RefObject<HTMLDivElement>;
}

export const useDocumentPlacementInteraction = ({
  mode,
  settings,
  template,
  onContentClick,
  containerRef,
}: UseDocumentPlacementInteractionOptions) => {
  const placementPointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [snapTarget, setSnapTarget] = useState<{ y: number; rowIndex: number } | null>(null);

  const showSnapCandidate = settings.enableClickSnapToRows && snapTarget !== null;

  const getRelativePointerPosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      return { rect, x, y };
    }

    return null;
  }, [containerRef]);

  const updateSnapTarget = useCallback((clientX: number, clientY: number) => {
    if (mode === 'template' || !settings.enableClickSnapToRows) {
      setSnapTarget(null);
      return;
    }

    const relativePosition = getRelativePointerPosition(clientX, clientY);
    if (!relativePosition || template.rowPositions.length === 0) {
      setSnapTarget(null);
      return;
    }

    const nextSnapTarget = getClickSnapTarget({
      x: relativePosition.x,
      y: relativePosition.y,
      contentWidthPx: relativePosition.rect.width,
      template,
      enableClickSnapToRows: settings.enableClickSnapToRows,
    });

    setSnapTarget(
      nextSnapTarget
        ? {
            y: nextSnapTarget.y,
            rowIndex: nextSnapTarget.rowIndex,
          }
        : null
    );
  }, [getRelativePointerPosition, mode, settings.enableClickSnapToRows, template]);

  const handlePagePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (mode === 'template') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    placementPointerRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };

    if (e.pointerType !== 'mouse') {
      updateSnapTarget(e.clientX, e.clientY);
    }
  }, [mode, updateSnapTarget]);

  const handlePagePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    updateSnapTarget(e.clientX, e.clientY);

    const activePointer = placementPointerRef.current;
    if (!activePointer || activePointer.pointerId !== e.pointerId) {
      return;
    }

    if (
      Math.hypot(e.clientX - activePointer.startX, e.clientY - activePointer.startY) >
      POINTER_TAP_SLOP_PX
    ) {
      activePointer.moved = true;
    }
  }, [updateSnapTarget]);

  const handlePagePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (mode === 'template') return;

    const activePointer = placementPointerRef.current;
    if (!activePointer || activePointer.pointerId !== e.pointerId) {
      return;
    }

    placementPointerRef.current = null;
    if (activePointer.moved) {
      return;
    }

    const relativePosition = getRelativePointerPosition(e.clientX, e.clientY);
    if (!relativePosition) {
      return;
    }

    const placement = getPlacementFromClick({
      x: relativePosition.x,
      y: relativePosition.y,
      contentWidthPx: relativePosition.rect.width,
      contentHeightPx: relativePosition.rect.height,
      template,
      enableClickSnapToRows: settings.enableClickSnapToRows,
      freePlacementOffsetYPx: (settings.fontSize + settings.backgroundPadding * 2) / 2,
    });
    onContentClick(placement.x, placement.y);
  }, [
    getRelativePointerPosition,
    mode,
    onContentClick,
    settings.backgroundPadding,
    settings.enableClickSnapToRows,
    settings.fontSize,
    template,
  ]);

  const clearPointerState = useCallback(() => {
    placementPointerRef.current = null;
  }, []);

  const handlePagePointerCancel = useCallback(() => {
    clearPointerState();
    setSnapTarget(null);
  }, [clearPointerState]);

  const handlePointerLeave = useCallback(() => {
    setSnapTarget(null);
  }, []);

  return {
    snapTarget,
    showSnapCandidate,
    handlePagePointerDown,
    handlePagePointerMove,
    handlePagePointerUp,
    handlePagePointerCancel,
    handlePointerLeave,
  };
};
