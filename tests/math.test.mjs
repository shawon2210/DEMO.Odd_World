/** Math primitive tests. These underpin every visual value the timeline produces. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { clamp, lerp, smoothstep, segmentInOut } from '../js/utils/math.js';

test('clamp constrains to the range and honours defaults', () => {
  assert.equal(clamp(-5), 0, 'below range clamps to min');
  assert.equal(clamp(5), 1, 'above range clamps to max');
  assert.equal(clamp(0.42), 0.42, 'inside range passes through');
  assert.equal(clamp(3, 0, 10), 3, 'explicit range is respected');
  assert.equal(clamp(30, 0, 10), 10);
  assert.equal(clamp(-2, -5, 5), -2, 'values inside a negative range pass through');
  assert.equal(clamp(-9, -5, 5), -5, 'and clamp to its floor');
});

test('lerp interpolates linearly between endpoints', () => {
  assert.equal(lerp(0, 10, 0), 0);
  assert.equal(lerp(0, 10, 1), 10);
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.equal(lerp(4, 8, 0.25), 5);
  assert.equal(lerp(10, 0, 0.5), 5, 'works in reverse');
});

test('smoothstep is 0 and 1 outside its edges, 0.5 at the midpoint', () => {
  assert.equal(smoothstep(0, 10, -5), 0);
  assert.equal(smoothstep(0, 10, 0), 0);
  assert.equal(smoothstep(0, 10, 5), 0.5);
  assert.equal(smoothstep(0, 10, 10), 1);
  assert.equal(smoothstep(0, 10, 15), 1);
});

test('smoothstep is monotonically non-decreasing', () => {
  let previous = -Infinity;
  for (let v = -5; v <= 15; v += 0.25) {
    const y = smoothstep(0, 10, v);
    assert.ok(y >= previous - 1e-12, `smoothstep dipped at ${v}`);
    previous = y;
  }
});

test('smoothstep survives a zero-width window without producing NaN', () => {
  const y = smoothstep(5, 5, 5);
  assert.ok(Number.isFinite(y), `expected a finite value, got ${y}`);
});

test('segmentInOut cross-fades between enter and exit', () => {
  const w = [100, 200, 300, 400];
  const before = segmentInOut(0, w);
  assert.equal(before.enter, 0);
  assert.equal(before.active, 0, 'inactive before the window');

  const entering = segmentInOut(150, w);
  assert.ok(entering.enter > 0 && entering.enter < 1, 'mid-entry');
  assert.equal(entering.exit, 0);
  assert.ok(entering.active > 0 && entering.active < 1, 'partially visible mid-entry');

  const plateau = segmentInOut(250, w);
  assert.equal(plateau.enter, 1);
  assert.equal(plateau.exit, 0);
  assert.equal(plateau.active, 1, 'fully active mid-plateau');

  const exiting = segmentInOut(350, w);
  assert.equal(exiting.enter, 1);
  assert.ok(exiting.active > 0 && exiting.active < 1, 'fading out');

  const after = segmentInOut(500, w);
  assert.equal(after.exit, 1);
  assert.equal(after.active, 0, 'inactive after the window');
});

test('segmentInOut active always equals enter times one minus exit', () => {
  const w = [10, 90, 200, 300];
  for (let s = 0; s <= 350; s += 5) {
    const { enter, exit, active } = segmentInOut(s, w);
    assert.ok(Math.abs(active - enter * (1 - exit)) < 1e-12, `mismatch at ${s}`);
    assert.ok(active >= 0 && active <= 1, `active out of range at ${s}`);
  }
});
