/**
 * Pure math helpers.
 *
 * No state, no DOM. These are the only operations the Model uses to derive
 * visual values, which keeps the animation logic testable in isolation.
 */

/** Constrain `value` to the inclusive range `[min, max]`. */
export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/** Linear interpolation between `a` and `b` at `t`. */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Hermite ease with zero derivative at both ends.
 * Returns 0 below `edge0` and 1 above `edge1`.
 */
export const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
};

/**
 * Convert a single scroll position into an enter/exit pair for a timed window.
 *
 * `active` is the product of the two ramps, so it naturally cross-fades:
 * entering acts as 1, exiting acts as 0, and the middle sits at their product.
 *
 * @param {number} scroll   Current smoothed scroll distance.
 * @param {number[]} window `[enterStart, enterEnd, exitStart, exitEnd]`
 */
export const segmentInOut = (scroll, [enterStart, enterEnd, exitStart, exitEnd]) => {
  const enter = smoothstep(enterStart, enterEnd, scroll);
  const exit = smoothstep(exitStart, exitEnd, scroll);
  return { enter, exit, active: enter * (1 - exit) };
};
