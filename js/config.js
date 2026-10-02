/**
 * Immutable configuration for the scroll experience.
 *
 * Every tunable value lives here so the Model, View, and Controller share a
 * single source of truth. Distances are pixels from the top of the experience.
 */

/**
 * Total scrollable distance is NOT declared here.
 *
 * The scroll rig's length is a layout concern and lives in exactly one place:
 * `.cinema-scroll { height: calc(100vh + 3700px) }` in styles.css. The
 * Controller reads the real extent from the DOM on init and resize, so a second
 * copy of the number here could only ever drift out of sync.
 */

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

/** Centre of a segment's fully-opaque plateau, where its panel is at full strength. */
const plateauCentre = ([, enterEnd, exitStart]) => Math.round((enterEnd + exitStart) / 2);

/**
 * Scroll offsets for header navigation.
 *
 * Derived from the act windows above rather than restating them, so retiming an
 * act automatically retargets its nav link instead of silently desynchronising.
 * Previously '#bazaar' pointed at 2200, slightly before the bazaar panel reached
 * full opacity; the derived 2340 sits mid-plateau.
 */
export const NAV_OFFSETS = {
  '#cinema': 0,
  '#bridge': plateauCentre(SEGMENTS.frame2),
  '#bazaar': plateauCentre(SEGMENTS.frame3),
  // Once the sights rail has finished sliding in.
  '#routes': RAMPS.sightsEnter[1] - 60,
};
