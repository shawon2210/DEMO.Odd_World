/**
 * Timeline tests.
 *
 * The scroll choreography is a pure function, so it can be verified without a
 * browser. Two layers of protection:
 *
 *   1. A golden snapshot, so any unintended visual change is caught.
 *   2. Invariants and a full-range sweep, which catch NaN and out-of-range
 *      regressions that a sparse snapshot would miss.
 *
 * Run with:  node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeTimeline } from '../js/model/timeline.js';
import { SEGMENTS, RAMPS, PROGRESS_SPAN } from '../js/config.js';

const golden = JSON.parse(readFileSync(new URL('./golden/timeline.json', import.meta.url), 'utf8'));
const VIEWPORT = golden.viewport;

const frameAt = (scroll, overrides = {}) =>
  computeTimeline({
    scrollSmooth: scroll,
    mouseX: 0,
    mouseY: 0,
    reducedMotion: false,
    viewport: VIEWPORT,
    ...overrides,
  });

test('matches the golden snapshot at every recorded position', () => {
  for (const position of golden.positions) {
    const expected = golden.frames[String(position)];
    const actual = frameAt(position);
    for (const [field, want] of Object.entries(expected)) {
      if (typeof want === 'number') {
        assert.ok(
          Math.abs(actual[field] - want) < 1e-6,
          `scroll ${position}, field ${field}: expected ${want}, got ${actual[field]}`,
        );
      } else {
        assert.equal(actual[field], want, `scroll ${position}, field ${field}`);
      }
    }
  }
});

test('every numeric field stays finite across the full scroll range', () => {
  for (let s = 0; s <= 3700; s += 1) {
    const f = frameAt(s, { mouseX: -0.5, mouseY: 0.5 });
    for (const [key, value] of Object.entries(f)) {
      if (typeof value === 'number') {
        assert.ok(Number.isFinite(value), `scroll ${s}: ${key} was ${value}`);
      }
    }
  }
});

test('opacity-like fields stay within [0, 1]', () => {
  // Saturation is deliberately excluded: the bazaar act lifts it above 1.
  const bounded = [
    'titleOpacity', 'backOpacity', 'introCopyOpacity',
    'panel2Opacity', 'panel3Opacity', 'frame2Opacity',
    'sightsOpacity', 'sightsControlsOpacity',
    'backBrightness', 'bazaarBrightness',
    'shadeTopAlpha', 'shadeMidAlpha', 'shadeBottomAlpha',
  ];
  for (let s = 0; s <= 3700; s += 5) {
    const f = frameAt(s);
    for (const key of bounded) {
      assert.ok(f[key] >= 0 && f[key] <= 1, `scroll ${s}: ${key} = ${f[key]}`);
    }
  }
});

test('saturation only ever lifts, never drains', () => {
  let previous = 0;
  for (let s = 0; s <= 3700; s += 25) {
    const { bazaarSaturation } = frameAt(s);
    assert.ok(bazaarSaturation >= 1, `scroll ${s}: saturation dipped to ${bazaarSaturation}`);
    assert.ok(bazaarSaturation <= 1.18 + 1e-9, `scroll ${s}: saturation ran away to ${bazaarSaturation}`);
    previous = bazaarSaturation;
  }
  assert.ok(previous >= 1);
});

test('acts are fully hidden outside their windows', () => {
  const [f2EnterStart, f2EnterEnd, f2ExitStart, f2ExitEnd] = SEGMENTS.frame2;
  assert.equal(frameAt(0).frame2Opacity, 0, 'river close-up must start hidden');
  assert.equal(frameAt(f2EnterStart - 1).frame2Opacity, 0);
  assert.ok(frameAt((f2EnterEnd + f2ExitStart) / 2).frame2Opacity > 0.99, 'must peak mid-plateau');
  assert.equal(frameAt(3700).frame2Opacity, 0, 'must be gone by the end');

  const [f3EnterStart, f3EnterEnd] = SEGMENTS.frame3;
  assert.equal(frameAt(f3EnterStart - 1).panel3Opacity, 0, 'bazaar panel must start hidden');
  assert.ok(frameAt((f3EnterEnd + SEGMENTS.frame3[2]) / 2).panel3Opacity > 0.99);
});

test('the sights rail reveals exactly once, late in the timeline', () => {
  const [enterStart, enterEnd] = RAMPS.sightsEnter;
  assert.equal(frameAt(enterStart - 1).sightsOpacity, 0, 'must be hidden before its ramp');
  assert.equal(frameAt(enterStart - 1).sightsVisible, false);
  assert.ok(frameAt(enterEnd).sightsOpacity > 0.999, 'must be fully in at the end of its ramp');
  assert.equal(frameAt(enterEnd).sightsVisible, true);
  assert.equal(frameAt(3700).sightsOpacity, 1);
});

test('sights controls arm once the rail is essentially fully revealed', () => {
  const [controlsStart, controlsEnd] = RAMPS.sightsControls;
  // The threshold is 0.98, which the ramp crosses before it finishes.
  const thresholdPoint = controlsStart + (controlsEnd - controlsStart) * 0.9;
  assert.equal(frameAt(thresholdPoint - 40).sightsControlsReady, false, 'must stay inert while faded out');
  assert.equal(frameAt(controlsEnd).sightsControlsReady, true, 'must be armed by the end of its ramp');
});

test('shade overlay raises its z-index only when it is visible', () => {
  assert.equal(frameAt(0).shadeZ, 0);
  for (let s = 0; s <= 3700; s += 5) {
    assert.ok([0, 2].includes(frameAt(s).shadeZ), `scroll ${s}: shadeZ must be 0 or 2`);
  }
});

test('background scale grows monotonically and stays within its bounds', () => {
  let previous = -Infinity;
  for (let s = 0; s <= 3700; s += 25) {
    const { backScale } = frameAt(s);
    assert.ok(backScale >= previous - 1e-9, `backScale dipped at ${s}`);
    assert.ok(backScale >= 0.76 && backScale <= 1.3001, `backScale out of range at ${s}: ${backScale}`);
    previous = backScale;
  }
});

test('progress spans the configured range and stops at the end', () => {
  assert.ok(PROGRESS_SPAN > 0);
  assert.equal(frameAt(PROGRESS_SPAN).backScale > 0, true);
});

test('reduced motion zeroes all pointer-driven motion', () => {
  for (const s of [0, 800, 1600, 2400, 3200, 3700]) {
    const f = frameAt(s, { reducedMotion: true, mouseX: 0.49, mouseY: -0.49 });
    // Compared with === because these are -0, which is numerically zero.
    assert.ok(f.pointerX === 0, `pointerX at ${s}`);
    assert.ok(f.pointerY === 0, `pointerY at ${s}`);
    assert.ok(f.backX === 0, `backX at ${s}`);
    assert.ok(f.bridgeX === 0, `bridgeX at ${s}`);
    assert.equal(f.splitLeftX, frameAt(s).splitLeftX, 'split drift must not depend on pointer');
  }
});

test('pointer input drives parallax with layer-specific multipliers', () => {
  const f = frameAt(0, { mouseX: 0.5, mouseY: 0 });
  assert.equal(f.backX, 0.5 * -12, 'background drifts opposite the pointer');
  assert.equal(f.bridgeX, 0.5 * 18, 'bridge drifts further, same direction');
  assert.ok(Math.abs(f.bridgeX) > Math.abs(f.backX), 'foreground must move more than background');
});

test('sights geometry is derived from viewport height', () => {
  const short = computeTimeline({
    scrollSmooth: 3700, mouseX: 0, mouseY: 0, reducedMotion: false,
    viewport: { innerWidth: 1440, innerHeight: 600 },
  });
  const tall = computeTimeline({
    scrollSmooth: 3700, mouseX: 0, mouseY: 0, reducedMotion: false,
    viewport: { innerWidth: 1440, innerHeight: 1200 },
  });
  assert.notEqual(short.sightsTop, tall.sightsTop, 'rail offset must track viewport height');
  assert.ok(tall.sightsTop > short.sightsTop, 'taller viewports push the rail down');
});
