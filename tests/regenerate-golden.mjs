/**
 * Regenerates tests/golden/timeline.json.
 *
 * Only run this when a change to the scroll timeline is intentional. The suite
 * treats the fixture as the definition of correct output, so regenerating it
 * accepts whatever the current code produces.
 *
 *   node tests/regenerate-golden.mjs
 *
 * Then review the diff before committing: every changed number is a visible
 * change to the experience.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeTimeline } from '../js/model/timeline.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Fields worth pinning. Everything here feeds a CSS custom property. */
const FIELDS = [
  'titleOpacity', 'titleY', 'titleScale',
  'backScale', 'backOpacity', 'backBrightness', 'blur',
  'fourY', 'fourScale', 'bazaarY', 'bazaarBlur', 'bazaarBrightness', 'bazaarSaturation',
  'shadeZ', 'shadeTopAlpha', 'shadeMidAlpha', 'shadeBottomAlpha',
  'bridgeX', 'bridgeY', 'bridgeBottom', 'bridgeWidth', 'bridgeScale',
  'splitLeftX', 'splitRightX', 'splitY', 'splitScale',
  'frame2Opacity', 'frame2X', 'frame2Y', 'frame2Scale',
  'introCopyY', 'introCopyOpacity',
  'panel2Opacity', 'panel2Y', 'panel3Opacity', 'panel3Y',
  'sightsOpacity', 'sightsControlsOpacity', 'sightsVisible', 'sightsControlsReady',
  'sightsEnterX', 'sightsScale', 'sightsTop', 'sightsScreenTop',
  'pointerX', 'pointerY',
];

/** Act boundaries, rest state, and the two transition shoulders. */
const POSITIONS = [0, 650, 1100, 1600, 2340, 3000, 3560, 3700];
const VIEWPORT = { innerWidth: 1440, innerHeight: 900 };

const round = (value) => (typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value);

const frames = {};
for (const position of POSITIONS) {
  const frame = computeTimeline({
    scrollSmooth: position,
    mouseX: 0,
    mouseY: 0,
    reducedMotion: false,
    viewport: VIEWPORT,
  });
  frames[String(position)] = Object.fromEntries(FIELDS.map((field) => [field, round(frame[field])]));
}

await mkdir(join(HERE, 'golden'), { recursive: true });
await writeFile(
  join(HERE, 'golden', 'timeline.json'),
  JSON.stringify(
    {
      _comment:
        'Snapshot of computeTimeline output. Regenerate with `node tests/regenerate-golden.mjs` only when a timeline change is intentional, then review the diff.',
      viewport: VIEWPORT,
      positions: POSITIONS,
      frames,
    },
    null,
    2,
  ) + '\n',
  'utf8',
);

console.log(`Wrote ${POSITIONS.length} positions x ${FIELDS.length} fields to tests/golden/timeline.json`);
