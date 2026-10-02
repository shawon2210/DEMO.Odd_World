/**
 * Config integrity tests.
 *
 * The timeline used to be declared twice, once in styles.css and once in JS, and
 * nav offsets were restated as bare numbers. These tests fail if that duplication
 * is reintroduced or if the two drift apart again.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  SEGMENTS, RAMPS, NAV_OFFSETS, SLIDER_SET_COUNT, EASING, PROGRESS_SPAN,
} from '../js/config.js';

const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('act windows are well formed and strictly ordered', () => {
  for (const [name, [enterStart, enterEnd, exitStart, exitEnd]] of Object.entries(SEGMENTS)) {
    assert.ok(enterStart < enterEnd, `${name}: enter window is inverted`);
    assert.ok(enterEnd <= exitStart, `${name}: enter ends after exit begins`);
    assert.ok(exitStart < exitEnd, `${name}: exit window is inverted`);
    assert.ok(enterStart >= 0, `${name}: window starts before zero`);
  }
});

test('scalar ramps are ordered and inside the scrollable range', () => {
  // PROGRESS_SPAN only normalises background progress, so ramps legitimately
  // extend past it. The bound that matters is the total scroll distance.
  const SCROLL_DISTANCE = 3700;
  for (const [name, [start, end]] of Object.entries(RAMPS)) {
    assert.ok(start < end, `${name}: ramp is inverted`);
    assert.ok(start >= 0, `${name}: ramp starts before zero`);
    assert.ok(end <= SCROLL_DISTANCE, `${name}: ramp extends past the scrollable range`);
  }
});

test('the carousel builds enough sets to wrap in both directions', () => {
  assert.ok(SLIDER_SET_COUNT >= 3, 'fewer than three sets cannot wrap seamlessly');
});

test('easing factors stay within the range that converges', () => {
  for (const [key, value] of Object.entries(EASING)) {
    assert.ok(value > 0 && value < 1, `${key} = ${value} would never converge`);
  }
});

test('nav offsets are derived, not restated as literals', () => {
  // If someone re-hardcodes these, the derivation below is the thing that breaks.
  // Segment windows are [enterStart, enterEnd, exitStart, exitEnd].
  const [, f2EnterEnd, f2ExitStart] = SEGMENTS.frame2;
  assert.equal(NAV_OFFSETS['#bridge'], Math.round((f2EnterEnd + f2ExitStart) / 2));

  const [, f3EnterEnd, f3ExitStart] = SEGMENTS.frame3;
  assert.equal(NAV_OFFSETS['#bazaar'], Math.round((f3EnterEnd + f3ExitStart) / 2));

  assert.equal(NAV_OFFSETS['#routes'], RAMPS.sightsEnter[1] - 60);
  assert.equal(NAV_OFFSETS['#cinema'], 0);
});

test('every nav target lands inside its act active window', () => {
  // Same tuple shape: the plateau is bounded by enterEnd and exitStart.
  const within = (value, [, enterEnd, exitStart]) => value >= enterEnd && value <= exitStart;

  assert.ok(
    within(NAV_OFFSETS['#bridge'], SEGMENTS.frame2),
    `#bridge (${NAV_OFFSETS['#bridge']}) must sit inside frame2's plateau`,
  );
  assert.ok(
    within(NAV_OFFSETS['#bazaar'], SEGMENTS.frame3),
    `#bazaar (${NAV_OFFSETS['#bazaar']}) must sit inside frame3's plateau`,
  );
  // '#routes' deliberately sits 60px before the ramp closes: at that depth the
  // eased reveal is already ~97.6%, so the rail reads as fully arrived.
  const reveal = RAMPS.sightsEnter;
  assert.ok(
    NAV_OFFSETS['#routes'] > reveal[0] && NAV_OFFSETS['#routes'] <= reveal[1],
    '#routes must land in the final stretch of the sights reveal',
  );
  assert.ok(
    reveal[1] - NAV_OFFSETS['#routes'] <= 120,
    '#routes should not short of the rail finishing its entrance',
  );
});

test('the scroll rig length is declared once, in CSS only', () => {
  assert.ok(
    /height:\s*calc\(100vh\s*\+\s*3700px\)/.test(styles),
    'styles.css must keep owning the scroll distance',
  );
  const config = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
  assert.ok(
    !/SCROLL_DISTANCE\s*=/.test(config),
    'SCROLL_DISTANCE must not reappear in config.js; the DOM is the source of truth',
  );
});
