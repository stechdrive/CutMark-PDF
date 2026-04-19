import { useEffect, useRef, useState } from 'react';

const MOBILE_UI_MAX_WIDTH = 980;
const MOBILE_COMPACT_MAX_WIDTH = 760;
const MOBILE_TIGHT_MAX_WIDTH = 430;
const COARSE_POINTER_QUERY = '(pointer: coarse)';
const MOBILE_UI_SCALE_STORAGE_KEY = 'cutmark_mobile_ui_scale';
const MIN_USER_UI_SCALE = 0.7;
const MAX_USER_UI_SCALE = 2;

interface MobileLayoutSnapshot {
  isMobileUi: boolean;
  isMobileCompact: boolean;
  isMobileTight: boolean;
  isCoarsePointer: boolean;
  viewportWidth: number;
  breakpointWidth: number;
  autoUiScale: number;
}

export interface MobileLayoutState extends MobileLayoutSnapshot {
  userUiScale: number;
  uiScale: number;
  setUserUiScale: (next: number) => void;
  resetUserUiScale: () => void;
}

const DEFAULT_SNAPSHOT: MobileLayoutSnapshot = {
  isMobileUi: false,
  isMobileCompact: false,
  isMobileTight: false,
  isCoarsePointer: false,
  viewportWidth: 0,
  breakpointWidth: 0,
  autoUiScale: 1,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getViewportWidth = () => window.visualViewport?.width ?? window.innerWidth ?? 0;

const clampUserUiScale = (value: number) => clamp(value, MIN_USER_UI_SCALE, MAX_USER_UI_SCALE);

const loadUserUiScale = () => {
  if (typeof window === 'undefined') {
    return 1;
  }

  const raw = window.localStorage.getItem(MOBILE_UI_SCALE_STORAGE_KEY);
  if (!raw) {
    return 1;
  }

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? clampUserUiScale(parsed) : 1;
};

export const getBreakpointWidth = (viewportWidth: number) => {
  const screenWidth = window.screen?.width;
  if (screenWidth && screenWidth < viewportWidth * 0.8) {
    return screenWidth;
  }
  return viewportWidth;
};

const resolveMobileLayoutSnapshot = (): MobileLayoutSnapshot => {
  if (typeof window === 'undefined') {
    return DEFAULT_SNAPSHOT;
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
  const autoUiScale = isMobileUi ? clamp(breakpointWidth / 420, 0.9, 1) : 1;

  return {
    isMobileUi,
    isMobileCompact,
    isMobileTight,
    isCoarsePointer,
    viewportWidth,
    breakpointWidth,
    autoUiScale,
  };
};

const isSameSnapshot = (left: MobileLayoutSnapshot, right: MobileLayoutSnapshot) =>
  left.isMobileUi === right.isMobileUi &&
  left.isMobileCompact === right.isMobileCompact &&
  left.isMobileTight === right.isMobileTight &&
  left.isCoarsePointer === right.isCoarsePointer &&
  left.viewportWidth === right.viewportWidth &&
  left.breakpointWidth === right.breakpointWidth &&
  left.autoUiScale === right.autoUiScale;

export const useMobileLayout = (): MobileLayoutState => {
  const [snapshot, setSnapshot] = useState(resolveMobileLayoutSnapshot);
  const [userUiScale, setUserUiScaleState] = useState(loadUserUiScale);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncState = () => {
      setSnapshot((current) => {
        const next = resolveMobileLayoutSnapshot();
        return isSameSnapshot(current, next) ? current : next;
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
    if (typeof window === 'undefined') {
      return;
    }

    if (Math.abs(userUiScale - 1) < 0.001) {
      window.localStorage.removeItem(MOBILE_UI_SCALE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(MOBILE_UI_SCALE_STORAGE_KEY, userUiScale.toFixed(2));
  }, [userUiScale]);

  const setUserUiScale = (next: number) => {
    setUserUiScaleState(clampUserUiScale(next));
  };

  const resetUserUiScale = () => {
    setUserUiScaleState(1);
  };

  const uiScale = snapshot.isMobileUi
    ? clamp(snapshot.autoUiScale * userUiScale, MIN_USER_UI_SCALE, MAX_USER_UI_SCALE)
    : 1;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mobileUi = snapshot.isMobileUi ? 'true' : 'false';
    root.dataset.mobileCompact = snapshot.isMobileCompact ? 'true' : 'false';
    root.dataset.mobileTight = snapshot.isMobileTight ? 'true' : 'false';
    root.style.setProperty('--ui-scale', String(uiScale));
    root.style.setProperty('--ui-scale-auto', String(snapshot.autoUiScale));
    root.style.setProperty('--ui-scale-user', String(userUiScale));
    root.style.setProperty('--mobile-viewport-width', `${snapshot.viewportWidth}px`);
    root.style.setProperty('--mobile-breakpoint-width', `${snapshot.breakpointWidth}px`);
  }, [snapshot, uiScale, userUiScale]);

  useEffect(() => {
    const root = document.documentElement;
    return () => {
      root.dataset.mobileUi = 'false';
      root.dataset.mobileCompact = 'false';
      root.dataset.mobileTight = 'false';
      root.style.removeProperty('--ui-scale');
      root.style.removeProperty('--ui-scale-auto');
      root.style.removeProperty('--ui-scale-user');
      root.style.removeProperty('--mobile-viewport-width');
      root.style.removeProperty('--mobile-breakpoint-width');
    };
  }, []);

  return {
    ...snapshot,
    userUiScale,
    uiScale,
    setUserUiScale,
    resetUserUiScale,
  };
};
