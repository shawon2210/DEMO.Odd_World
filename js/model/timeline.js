/**
 * Timeline — derives every visual value for one frame from Model state.
 *
 * This is a pure function: same state in, same numbers out. It performs no DOM
 * work and returns unitless scalars; the View decides how to express them in CSS.
 *
 * Keeping this isolated from rendering means the entire 3700px choreography can
 * be verified numerically without a browser.
 */

import {
  PROGRESS_SPAN,
  RAMPS,
  SEGMENTS,
  SIGHTS_ENTER_POWER,
  SIGHTS_TOP_MAX,
  SIGHTS_TOP_MIN,
  SIGHTS_TOP_OFFSET,
  SIGHTS_TOP_VIEWPORT_RATIO,
  BACK_SCALE_BASE,
} from '../config.js';
import { clamp, segmentInOut, smoothstep } from '../utils/math.js';

/** Half the background stack's width, as a fraction of the viewport (106vw / 2). */
const BACK_STACK_SPAN_HALF = 0.53;
/** Where the background stack's own left edge sits on screen (100vw - 3vw). */
const STACK_WORLD_ORIGIN = 0.5;

export const computeTimeline = (model) => {
  const scroll = model.scrollSmooth;

  // Pointer input is suppressed entirely under reduced motion.
  const mouseX = model.reducedMotion ? 0 : model.mouseX;
  const mouseY = model.reducedMotion ? 0 : model.mouseY;

  const frame2 = segmentInOut(scroll, SEGMENTS.frame2);
  const frame3 = segmentInOut(scroll, SEGMENTS.frame3);

  const progress = clamp(scroll / PROGRESS_SPAN);
  const introExit = smoothstep(RAMPS.introExit[0], RAMPS.introExit[1], scroll);
  const sightsEnter = Math.pow(smoothstep(RAMPS.sightsEnter[0], RAMPS.sightsEnter[1], scroll), SIGHTS_ENTER_POWER);
  const sightsControlsEnter = smoothstep(RAMPS.sightsControls[0], RAMPS.sightsControls[1], scroll);

  const blurActive = clamp(frame2.active + frame3.active);
  const frame2Opacity = frame2.active * (1 - frame3.enter);
  const splitDrift = Math.pow(frame2.enter, 1.5);
  const panel2Opacity = frame2.active * (1 - frame2.exit);
  const panel3Opacity = frame3.active * (1 - frame3.exit);

  const backScale = BACK_SCALE_BASE + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
  const sharedHeroY = progress * -74;
  const sharedHeroScale = progress * 0.23;

  // The sights rail is counter-scaled against the background stack, so its
  // offset has to be solved in unscaled parent coordinates.
  const { innerWidth, innerHeight } = model.viewport;
  const cardWidth = model.cardWidth;
  const sightsScreenTop =
    Math.min(SIGHTS_TOP_MAX, Math.max(SIGHTS_TOP_MIN, innerHeight * SIGHTS_TOP_VIEWPORT_RATIO)) -
    SIGHTS_TOP_OFFSET;
  const sightsParentTop = innerHeight - (innerHeight - sightsScreenTop) / backScale;

  // Horizontally the rail maps 1:1 onto the viewport, but the background stack
  // is BACK_STACK_SPAN vw wide and scaled about its centre, which leaves the
  // rail's local origin displaced by (SPAN/2 * backScale - worldOrigin) of the
  // viewport width. Adding that displacement back is what centres the active
  // card instead of parking it off-screen.
  const sightsCenterOffset =
    (innerWidth - cardWidth) / 2 + (BACK_STACK_SPAN_HALF * backScale - STACK_WORLD_ORIGIN) * innerWidth;

  return {
    // Pointer
    pointerX: mouseX,
    pointerY: mouseY,

    // Background stack
    backOpacity: 1 - frame2.active * 0.06,
    backX: mouseX * -12,
    backY: mouseY * -4,
    backScale,
    fourY: 10 + progress * 10,
    fourScale: 0.78 + progress * 0.16,
    bazaarY: 20 - progress * 8,
    blur: blurActive * 14,
    backBrightness: 1 - blurActive * 0.255,
    bazaarBlur: frame2.active * 14,
    bazaarBrightness: 1 - frame2.active * 0.255 - frame3.active * 0.06,
    bazaarSaturation: 1 + frame3.active * 0.18,

    // Colour shade overlay, raised above the artwork only once it is visible
    shadeZ: frame2.active > 0.02 ? 2 : 0,
    shadeTopAlpha: blurActive * 0.465,
    shadeMidAlpha: blurActive * 0.42,
    shadeBottomAlpha: blurActive * 0.51,

    // Hero title
    titleY: introExit * -210,
    titleScale: 1 - introExit * 0.08,
    titleOpacity: 1 - introExit,

    // Bridge foreground
    bridgeX: mouseX * 18,
    bridgeY: mouseY * 8 + sharedHeroY - frame2.exit * 760,
    bridgeBottom: 5 - frame2.enter * 13,
    bridgeWidth: 67.2 + frame2.enter * 37.8,
    bridgeScale: 1.02 + sharedHeroScale + frame2.exit * 0.46,

    // Split frames, mirrored around centre
    splitLeftX: -splitDrift * 46,
    splitRightX: splitDrift * 46,
    splitY: mouseY * 10 + sharedHeroY - splitDrift * 180,
    splitScale: 1 + sharedHeroScale + frame2.enter * 0.74,

    // River close-up
    frame2Opacity,
    frame2X: mouseX * 10,
    frame2Y: mouseY * 8 - frame2.exit * 150,
    frame2Scale: 1.06 + frame2.enter * 0.08 + frame2.exit * 0.08,

    // Intro copy
    introCopyY: introExit * 90,
    introCopyOpacity: 1 - introExit,

    // Story panels
    panel2Opacity,
    panel2Y: -frame2.exit * 86 + (1 - frame2.enter) * 58,
    panel3Opacity,
    panel3Y: -frame3.exit * 86 + (1 - frame3.enter) * 58,

    // Sights rail
    sightsOpacity: sightsEnter,
    sightsControlsOpacity: sightsControlsEnter,
    sightsControlsReady: sightsControlsEnter > 0.98,
    sightsVisible: sightsEnter > 0.01,
    sightsEnterX: (1 - sightsEnter) * 420,
    sightsScale: 1 / backScale,
    sightsCenter: sightsCenterOffset,
    sightsTop: sightsParentTop,
    sightsScreenTop,
  };
};
