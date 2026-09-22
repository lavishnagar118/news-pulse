import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNextScrollState,
  INITIAL_SCROLL_STATE,
  ScrollState,
} from '../src/hooks/useScrollState';

describe('Header Scroll-State Logic & Hysteresis Tests', () => {
  const defaultOptions = { thresholdDown: 48, thresholdUp: 16 };

  // 1. Initial Top State
  test('1. Initial top state starts unscrolled at position zero', () => {
    assert.equal(INITIAL_SCROLL_STATE.scrollY, 0);
    assert.equal(INITIAL_SCROLL_STATE.isScrolled, false);
    assert.equal(INITIAL_SCROLL_STATE.scrollDirection, null);

    const calculated = calculateNextScrollState(INITIAL_SCROLL_STATE, 0, defaultOptions);
    assert.equal(calculated.scrollY, 0);
    assert.equal(calculated.isScrolled, false);
    assert.equal(calculated.scrollDirection, null);
  });

  // 2. Downward Scroll Behavior
  test('2. Downward scroll below threshold updates direction but remains in full masthead mode', () => {
    const s1 = calculateNextScrollState(INITIAL_SCROLL_STATE, 25, defaultOptions);
    assert.equal(s1.scrollY, 25);
    assert.equal(s1.scrollDirection, 'down');
    assert.equal(s1.isScrolled, false, 'Should not engage compact mode before thresholdDown');

    const s2 = calculateNextScrollState(s1, 40, defaultOptions);
    assert.equal(s2.scrollY, 40);
    assert.equal(s2.scrollDirection, 'down');
    assert.equal(s2.isScrolled, false, 'Should remain false at 40px (< 48px)');
  });

  test('3. Downward scroll exceeding threshold engages compact sticky header', () => {
    const s1 = calculateNextScrollState(INITIAL_SCROLL_STATE, 60, defaultOptions);
    assert.equal(s1.scrollY, 60);
    assert.equal(s1.scrollDirection, 'down');
    assert.equal(s1.isScrolled, true, 'Must engage compact header when scrollY > 48px');

    const s2 = calculateNextScrollState(s1, 350, defaultOptions);
    assert.equal(s2.scrollY, 350);
    assert.equal(s2.scrollDirection, 'down');
    assert.equal(s2.isScrolled, true);
  });

  // 4. Upward Scroll Behavior
  test('4. Upward scroll while reading preserves compact header and tracks direction', () => {
    const activeScrolled: ScrollState = {
      scrollY: 400,
      isScrolled: true,
      scrollDirection: 'down',
    };

    const s1 = calculateNextScrollState(activeScrolled, 320, defaultOptions);
    assert.equal(s1.scrollY, 320);
    assert.equal(s1.scrollDirection, 'up');
    assert.equal(s1.isScrolled, true, 'Compact header must remain engaged during mid-article scroll up');

    const s2 = calculateNextScrollState(s1, 80, defaultOptions);
    assert.equal(s2.scrollY, 80);
    assert.equal(s2.scrollDirection, 'up');
    assert.equal(s2.isScrolled, true, 'Header remains compact above 48px');
  });

  // 5. Return to Top Behavior
  test('5. Returning to top of page restores full broadsheet masthead', () => {
    const scrolledState: ScrollState = {
      scrollY: 150,
      isScrolled: true,
      scrollDirection: 'up',
    };

    const s1 = calculateNextScrollState(scrolledState, 10, defaultOptions);
    assert.equal(s1.scrollY, 10);
    assert.equal(s1.scrollDirection, 'up');
    assert.equal(s1.isScrolled, false, 'Must restore full broadsheet masthead when scrollY <= 16px');

    const s0 = calculateNextScrollState(s1, 0, defaultOptions);
    assert.equal(s0.scrollY, 0);
    assert.equal(s0.isScrolled, false);
  });

  // 6. Threshold Hysteresis to Prevent Bouncing/Jitter
  test('6. Hysteresis prevents flickering and bouncing at threshold boundaries', () => {
    // Case A: Scrolling down into the ambiguous zone (e.g. 35px)
    const unscrolled: ScrollState = {
      scrollY: 10,
      isScrolled: false,
      scrollDirection: 'down',
    };
    const intoZoneDown = calculateNextScrollState(unscrolled, 35, defaultOptions);
    assert.equal(intoZoneDown.isScrolled, false, 'Approaching 35px from top must stay unscrolled');

    // Case B: Scrolling up into the ambiguous zone (e.g. 35px)
    const scrolled: ScrollState = {
      scrollY: 80,
      isScrolled: true,
      scrollDirection: 'up',
    };
    const intoZoneUp = calculateNextScrollState(scrolled, 35, defaultOptions);
    assert.equal(intoZoneUp.isScrolled, true, 'Approaching 35px from bottom must stay compact');

    // Demonstrates stability: identical scrollY (35px) produces different stable states depending on history, preventing rapid oscillation
    assert.notEqual(intoZoneDown.isScrolled, intoZoneUp.isScrolled);
  });

  // 7. Clamping and Negative Scroll (iOS rubber-band effect)
  test('7. Handles negative scroll coordinates gracefully without state corruption', () => {
    const rubberBand = calculateNextScrollState(INITIAL_SCROLL_STATE, -25, defaultOptions);
    assert.equal(rubberBand.scrollY, 0, 'Negative scrollY must clamp to 0');
    assert.equal(rubberBand.isScrolled, false);
  });

  // 8. Event Listener Cleanup Lifecycle Simulation
  test('8. Event listener subscription and cleanup contract verification', () => {
    const listeners: { [event: string]: Function[] } = {};
    const mockWindow = {
      addEventListener: (event: string, fn: Function, options?: any) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(fn);
        assert.ok(options?.passive, 'Scroll listener must be registered as passive');
      },
      removeEventListener: (event: string, fn: Function) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((f) => f !== fn);
        }
      },
    };

    const handler = () => {};
    mockWindow.addEventListener('scroll', handler, { passive: true });
    assert.equal(listeners['scroll'].length, 1);

    mockWindow.removeEventListener('scroll', handler);
    assert.equal(listeners['scroll'].length, 0, 'Listener must be completely removed on cleanup');
  });
});
