/**
 * Immutable configuration for the scroll experience.
 *
 * Every tunable value lives here so the Model, View, and Controller share a
 * single source of truth. Distances are pixels from the top of the experience.
 */

/** Total scrollable distance, mirrors `height: calc(100vh + 3700px)` in styles.css. */
export const SCROLL_DISTANCE = 3700;

/** Named act windows, each `[enterStart, enterEnd, exitStart, exitEnd]`. */
export const SEGMENTS = {
  frame2: [560, 900, 1300, 1620],
  frame3: [1760, 2140, 2540, 2700],
};

/** Scalar ramps: `[start, end]`. */
export const RAMPS = {
  introExit: [90, 650],
  sightsEnter: [2760, 3560],
  sightsControls: [3360, 3660],
};

/** Scroll distance over which global progress is normalized to 1. */
export const PROGRESS_SPAN = 2700;

/** Easing exponent applied to the sights entrance curve. */
export const SIGHTS_ENTER_POWER = 1.55;

/** Frame interpolation factors and rest thresholds. */
export const EASING = {
  scroll: 0.14,
  pointer: 0.12,
  scrollEpsilon: 0.08,
  pointerEpsilon: 0.001,
};

/** Depth-scale baseline for the background stack. */
export const BACK_SCALE_BASE = 0.76;

/** Vertical clamp for the sights rail, in pixels. */
export const SIGHTS_TOP_MIN = 112;
export const SIGHTS_TOP_MAX = 220;
export const SIGHTS_TOP_VIEWPORT_RATIO = 0.19;
export const SIGHTS_TOP_OFFSET = 50;

/** Number of times the card set is cloned to build the infinite track. */
export const SLIDER_SET_COUNT = 3;

/** Hardcoded scroll offsets for header navigation. */
export const NAV_OFFSETS = {
  '#cinema': 0,
  '#bridge': 1100,
  '#bazaar': 2200,
  '#routes': 3500,
};
