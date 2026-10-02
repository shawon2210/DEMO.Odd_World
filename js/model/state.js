/**
 * Model — owns application state and its temporal evolution.
 *
 * Contains no DOM queries and no rendering. The Controller feeds raw input and
 * geometry in; the View reads state out. All easing and integration lives here
 * so the animation curve is testable without a browser.
 */

import { EASING } from '../config.js';
import { clamp, lerp } from '../utils/math.js';

export const createModel = () => ({
  /** Raw scroll distance reported by the Controller, in pixels. */
  scrollTarget: 0,
  /** Eased scroll distance; the actual animation clock. */
  scrollSmooth: 0,

  /** Normalized pointer position, in the range [-0.5, 0.5]. */
  mouseTargetX: 0,
  mouseTargetY: 0,
  mouseX: 0,
  mouseY: 0,

  /** Injected geometry, refreshed by the Controller on resize. */
  scrollDistance: 0,
  viewport: { innerWidth: 0, innerHeight: 0 },
  /** Width of one carousel card, measured from the DOM. */
  cardWidth: 0,

  /** True when the user prefers reduced motion; disables easing and parallax. */
  reducedMotion: false,

  /** Sights carousel position and set size. */
  activeSight: 0,
  sightCount: 0,

  /** Guards against a snap-back on the first frame. */
  initialized: false,
});

/**
 * Advance eased state by one frame and report whether another frame is needed.
 *
 * When reduced motion is requested the scroll value is applied directly with no
 * interpolation, so content still responds to scroll — it simply does not glide.
 *
 * @returns {boolean} `true` if the caller should schedule another frame.
 */
export const step = (model) => {
  if (!model.initialized || model.reducedMotion) {
    model.scrollSmooth = model.scrollTarget;
    model.initialized = true;
  } else {
    model.scrollSmooth = lerp(model.scrollSmooth, model.scrollTarget, EASING.scroll);
  }

  // Snap once the remaining distance falls below perceptual threshold.
  if (Math.abs(model.scrollSmooth - model.scrollTarget) < EASING.scrollEpsilon) {
    model.scrollSmooth = model.scrollTarget;
  }

  if (model.reducedMotion) {
    model.mouseX = 0;
    model.mouseY = 0;
  } else {
    model.mouseX = lerp(model.mouseX, model.mouseTargetX, EASING.pointer);
    model.mouseY = lerp(model.mouseY, model.mouseTargetY, EASING.pointer);
  }

  const scrollMoving = Math.abs(model.scrollSmooth - model.scrollTarget) > EASING.scrollEpsilon;
  const pointerMoving =
    !model.reducedMotion &&
    (Math.abs(model.mouseX - model.mouseTargetX) > EASING.pointerEpsilon ||
      Math.abs(model.mouseY - model.mouseTargetY) > EASING.pointerEpsilon);

  return scrollMoving || pointerMoving;
};

/** Record a raw scroll distance from the Controller. */
export const setScrollTarget = (model, distance) => {
  model.scrollTarget = distance;
};

/** Record a viewport rect in pixels. */
export const setViewport = (model, innerWidth, innerHeight) => {
  model.viewport = { innerWidth, innerHeight };
};

/** Record the measured width of one carousel card. */
export const setCardWidth = (model, width) => {
  model.cardWidth = width;
};

/** Set the maximum scrollable distance for the current layout. */
export const setScrollDistance = (model, distance) => {
  model.scrollDistance = distance;
};

/** Record normalized pointer coordinates, each in the range [-0.5, 0.5]. */
export const setPointerTarget = (model, clientX, clientY, innerWidth, innerHeight) => {
  model.mouseTargetX = clientX / innerWidth - 0.5;
  model.mouseTargetY = clientY / innerHeight - 0.5;
};

/** Advance or rewind the carousel by `delta` positions. */
export const moveSlider = (model, delta) => {
  model.activeSight += delta;
};

/** Jump the carousel to an absolute index. */
export const setActiveSight = (model, index) => {
  model.activeSight = index;
};

/** Record how many cards make up one set. */
export const setSightCount = (model, count) => {
  model.sightCount = count;
};

/** Centre the carousel on the middle set so either direction can wrap. */
export const centerSlider = (model) => {
  model.activeSight = model.sightCount;
};

/**
 * Determine whether the carousel has drifted past a set boundary.
 *
 * @returns {number} The corrected index, or `null` when no correction is due.
 */
export const normalizeSliderIndex = (model) => {
  if (model.activeSight >= model.sightCount * 2) return model.activeSight - model.sightCount;
  if (model.activeSight < model.sightCount) return model.activeSight + model.sightCount;
  return null;
};

/** Clamp a scroll distance to the valid range for the current layout. */
export const clampScrollDistance = (value, model) =>
  clamp(value, 0, Math.max(model.scrollDistance, 0));
