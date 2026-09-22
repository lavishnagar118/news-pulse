'use client';

import { useState, useEffect, useRef } from 'react';

export interface ScrollStateOptions {
  thresholdDown?: number;
  thresholdUp?: number;
}

export interface ScrollState {
  scrollY: number;
  isScrolled: boolean;
  scrollDirection: 'up' | 'down' | null;
}

export const INITIAL_SCROLL_STATE: ScrollState = {
  scrollY: 0,
  isScrolled: false,
  scrollDirection: null,
};

/**
 * Pure transition calculator for scroll state with hysteresis.
 * Hysteresis prevents layout jitter and bouncing at threshold boundaries.
 */
export function calculateNextScrollState(
  current: ScrollState,
  newScrollY: number,
  options?: ScrollStateOptions
): ScrollState {
  const thresholdDown = options?.thresholdDown ?? 48;
  const thresholdUp = options?.thresholdUp ?? 16;

  const clampedScrollY = Math.max(0, newScrollY);
  const delta = clampedScrollY - current.scrollY;

  let direction: 'up' | 'down' | null = current.scrollDirection;
  if (Math.abs(delta) >= 2) {
    direction = delta > 0 ? 'down' : 'up';
  }

  let isScrolled = current.isScrolled;
  if (!current.isScrolled && clampedScrollY > thresholdDown) {
    isScrolled = true;
  } else if (current.isScrolled && clampedScrollY <= thresholdUp) {
    isScrolled = false;
  }

  return {
    scrollY: clampedScrollY,
    isScrolled,
    scrollDirection: direction,
  };
}

/**
 * Reusable scroll-state hook tracking viewport scroll position, direction, and compact threshold.
 * Uses passive event listeners for 60fps performance and includes clean unmount teardown.
 */
export function useScrollState(options?: ScrollStateOptions): ScrollState {
  const thresholdDown = options?.thresholdDown;
  const thresholdUp = options?.thresholdUp;

  const [state, setState] = useState<ScrollState>(INITIAL_SCROLL_STATE);

  const lastStateRef = useRef(state);
  lastStateRef.current = state;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const opts = { thresholdDown, thresholdUp };

    const handleScroll = () => {
      const currentY = window.scrollY || document.documentElement.scrollTop || 0;
      const next = calculateNextScrollState(lastStateRef.current, currentY, opts);

      // Only trigger React state updates when state boundary changes
      if (
        next.isScrolled !== lastStateRef.current.isScrolled ||
        next.scrollDirection !== lastStateRef.current.scrollDirection ||
        Math.abs(next.scrollY - lastStateRef.current.scrollY) > 15
      ) {
        setState(next);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [thresholdDown, thresholdUp]);

  return state;
}
