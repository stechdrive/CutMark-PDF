import { useEffect, useRef, useState } from 'react';

const MOBILE_UI_MAX_WIDTH = 980;
const MOBILE_COMPACT_MAX_WIDTH = 760;
const MOBILE_TIGHT_MAX_WIDTH = 430;
const COARSE_POINTER_QUERY = '(pointer: coarse)';

export interface MobileLayoutState {
  isMobileUi: boolean;
  isMobileCompact: boolean;
  isMobileTight: boolean;
  isCoarsePointer: boolean;
  viewportWidth: number;
  breakpointWidth: number;
  uiScale: number;
}

const DEFAULT_STATE: MobileLayoutState = {
  isMobileUi: false,
  isMobileCompact: false,
  isMobileTight: false,
  isCoarsePointer: false,
  viewportWidth: 0,
  breakpointWidth: 0,
  uiScale: 1,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getViewportWidth = () => window.visualViewport?.width ?? window.innerWidth ?? 0;

export const getBreakpointWidth = (viewportWidth: number) => {
  const screenWidth = window.screen?.width;
  if (screenWidth && screenWidth < viewportWidth * 0.8) {
    return screenWidth;
  }
  return viewportWidth;
};

export const resolveMobileLayoutState = (): MobileLayoutState => {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  const viewportWidth = getViewportWidth();
  const breakpointWidth = getBreakpointWidth(viewportWidth);
  const isCoarsePointer =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(COARSE_POINTER_QUERY).matches
      : false;
  const isMobileUi = isCoarsePointer && viewportWidth > 0 && breakpointWidth < MOBILE_UI_MAX_WIDTH;
  const isMobileCompact = isMobileUi && breakpointWidth < MOBILE_COMPACT_MAX_WIDTH;
  const isMobileTight = isMobileUi && breakpointWidth < MOBILE_TIGHT_MAX_WIDTH;
  const uiScale = isMobileUi ? clamp(breakpointWidth / 420, 0.9, 1) : 1;

  return {
    isMobileUi,
    isMobileCompact,
    isMobileTight,
    isCoarsePointer,
    viewportWidth,
    breakpointWidth,
    uiScale,
  };
};

const isSameState = (left: MobileLayoutState, right: MobileLayoutState) =>
  left.isMobileUi === right.isMobileUi &&
  left.isMobileCompact === right.isMobileCompact &&
  left.isMobileTight === right.isMobileTight &&
  left.isCoarsePointer === right.isCoarsePointer &&
  left.viewportWidth === right.viewportWidth &&
  left.breakpointWidth === right.breakpointWidth &&
  left.uiScale === right.uiScale;

export const useMobileLayout = (): MobileLayoutState => {
  const [state, setState] = useState(resolveMobileLayoutState);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncState = () => {
      setState((current) => {
        const next = resolveMobileLayoutState();
        return isSameState(current, next) ? current : next;
      });
    };

    const scheduleSync = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        syncState();
      });
    };

    syncState();

    const vv = window.visualViewport;
    const coarsePointerQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(COARSE_POINTER_QUERY)
        : null;

    vv?.addEventListener('resize', scheduleSync);
    vv?.addEventListener('scroll', scheduleSync);
    window.addEventListener('resize', scheduleSync);
    coarsePointerQuery?.addEventListener('change', scheduleSync);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      vv?.removeEventListener('resize', scheduleSync);
      vv?.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
      coarsePointerQuery?.removeEventListener('change', scheduleSync);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mobileUi = state.isMobileUi ? 'true' : 'false';
    root.dataset.mobileCompact = state.isMobileCompact ? 'true' : 'false';
    root.dataset.mobileTight = state.isMobileTight ? 'true' : 'false';
    root.style.setProperty('--ui-scale', String(state.uiScale));
    root.style.setProperty('--mobile-viewport-width', `${state.viewportWidth}px`);
    root.style.setProperty('--mobile-breakpoint-width', `${state.breakpointWidth}px`);
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    return () => {
      root.dataset.mobileUi = 'false';
      root.dataset.mobileCompact = 'false';
      root.dataset.mobileTight = 'false';
      root.style.removeProperty('--ui-scale');
      root.style.removeProperty('--mobile-viewport-width');
      root.style.removeProperty('--mobile-breakpoint-width');
    };
  }, []);

  return state;
};
