/** Model tests: easing integration and infinite-carousel wrap logic. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createModel,
  step,
  moveSlider,
  setActiveSight,
  setPointerTarget,
  setScrollTarget,
  centerSlider,
  normalizeSliderIndex,
  clampScrollDistance,
  setViewport,
  setScrollDistance,
} from '../js/model/state.js';

const ready = () => {
  const m = createModel();
  setViewport(m, 1440, 900);
  setScrollDistance(m, 3700);
  return m;
};

test('a new model starts uninitialised at scroll zero', () => {
  const m = ready();
  assert.equal(m.initialized, false);
  assert.equal(m.scrollSmooth, 0);
});

test('the first step snaps to the target instead of easing in', () => {
  const m = ready();
  setScrollTarget(m, 2000);
  step(m);
  assert.equal(m.scrollSmooth, 2000, 'must not animate the very first frame');
  assert.equal(m.initialized, true);
});

test('later steps ease toward the target and then settle', () => {
  const m = ready();
  setScrollTarget(m, 2000);
  step(m);

  setScrollTarget(m, 3000);
  step(m);
  assert.ok(m.scrollSmooth > 2000 && m.scrollSmooth < 3000, `expected an in-between value, got ${m.scrollSmooth}`);
  assert.equal(step(m), true, 'should request another frame while still moving');

  let guard = 0;
  while (step(m) && guard++ < 500);
  assert.equal(m.scrollSmooth, 3000, 'must converge exactly on the target');
});

test('reduced motion applies scroll instantly and never eases', () => {
  const m = ready();
  m.reducedMotion = true;
  setScrollTarget(m, 2000);
  step(m);
  setScrollTarget(m, 3600);
  step(m);
  assert.equal(m.scrollSmooth, 3600, 'no interpolation under reduced motion');
  assert.equal(m.mouseX, 0);
  assert.equal(m.mouseY, 0);
});

test('pointer input is normalised to the range [-0.5, 0.5]', () => {
  const m = ready();
  setPointerTarget(m, 0, 0, 1440, 900);
  assert.ok(Math.abs(m.mouseTargetX - -0.5) < 1e-12);
  assert.ok(Math.abs(m.mouseTargetY - -0.5) < 1e-12);

  setPointerTarget(m, 1440, 900, 1440, 900);
  assert.ok(Math.abs(m.mouseTargetX - 0.5) < 1e-12);
  assert.ok(Math.abs(m.mouseTargetY - 0.5) < 1e-12);

  setPointerTarget(m, 720, 450, 1440, 900);
  assert.ok(Math.abs(m.mouseTargetX) < 1e-12, 'centre maps to zero');
});

test('pointer eases separately from scroll', () => {
  const m = ready();
  step(m);
  setPointerTarget(m, 1440, 900, 1440, 900);
  step(m);
  assert.ok(m.mouseX > 0 && m.mouseX < 0.5, `expected a partial ease, got ${m.mouseX}`);
});

test('the carousel centres on the middle set', () => {
  const m = ready();
  m.sightCount = 5;
  centerSlider(m);
  assert.equal(m.activeSight, 5, 'starts at the first card of the middle set');
});

test('the carousel wraps in both directions', () => {
  const m = ready();
  m.sightCount = 5;

  m.activeSight = 10;
  assert.equal(normalizeSliderIndex(m), 5, 'past the last set wraps back by one set');

  m.activeSight = 4;
  assert.equal(normalizeSliderIndex(m), 9, 'before the first set wraps forward by one set');

  for (const settled of [5, 6, 7, 8, 9]) {
    m.activeSight = settled;
    assert.equal(normalizeSliderIndex(m), null, `${settled} is already in range`);
  }
});

test('a full lap in either direction returns to the same index', () => {
  const m = ready();
  m.sightCount = 5;
  centerSlider(m);
  const start = m.activeSight;

  for (let i = 0; i < 5; i++) {
    moveSlider(m, 1);
    const corrected = normalizeSliderIndex(m);
    if (corrected !== null) setActiveSight(m, corrected);
  }
  assert.equal(m.activeSight, start, 'five forward steps return to the origin');

  for (let i = 0; i < 5; i++) {
    moveSlider(m, -1);
    const corrected = normalizeSliderIndex(m);
    if (corrected !== null) setActiveSight(m, corrected);
  }
  assert.equal(m.activeSight, start, 'five backward steps return to the origin');
});

test('scroll distance is clamped to the measured extent', () => {
  const m = ready();
  assert.equal(clampScrollDistance(-500, m), 0, 'negative scroll clamps to the start');
  assert.equal(clampScrollDistance(9999, m), 3700, 'overscroll clamps to the end');
  assert.equal(clampScrollDistance(1234, m), 1234, 'in-range passes through');
});

test('clamping tolerates an unmeasured layout', () => {
  const m = createModel();
  assert.equal(clampScrollDistance(500, m), 0, 'before measure(), nothing is scrollable');
});
