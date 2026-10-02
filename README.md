# Odd World · Mostar

A scroll-driven, cinematic single-page story about **Mostar, Bosnia and Herzegovina**.

One tall scroll container, one sticky stage, and a ~55-variable animation pipeline that
choreographs layered artwork, editorial copy, and a looping sights carousel using nothing but
scroll position and pointer movement. Logic is layered MVC; rendering stays in CSS.

> No build step. No dependencies. No framework. Serve the folder and it runs.

---

## Table of Contents

- [Highlights](#highlights)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Architecture — MVC](#architecture--mvc)
- [How It Works](#how-it-works)
- [Scroll Timeline](#scroll-timeline)
- [Accessibility](#accessibility)
- [Performance](#performance)
- [Browser Support](#browser-support)
- [Debugging with CDP](#debugging-with-cdp)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [Credits & Assets](#credits--assets)
- [License](#license)

---

## Highlights

| | |
|---|---|
| **Layered MVC** | Strict one-way Model → View / Controller boundaries, with zero DOM access in the Model |
| **Testable animation** | Timeline math is pure, so the full choreography verifies numerically without a browser |
| **Scroll-driven choreography** | Four timed acts cross-fade layered artwork, blur, and brightness from a single `requestAnimationFrame` loop |
| **Infinite carousel** | 5 sight cards cloned into 3 sets (15 nodes) for a seamless wrap with no visible seam |
| **Pointer parallax** | Normalized cursor tracking drives independent depth offsets, drifts, and rotations per layer |
| **Reduced-motion support** | `prefers-reduced-motion` disables smoothing, parallax, and all transitions site-wide |
| **Keyboard operable** | Carousel cards expose `role="button"`, `tabindex="0"`, and Enter/Space activation |
| **Responsive** | Three breakpoints (1500 / 1100 / 640px) reflow type, artwork scale, and card sizing |
| **Performance-minded** | Passive listeners, a self-terminating rAF loop, `will-change` on animated layers, compositor-only properties |

---

## Quick Start

The site is fully static. There is nothing to install — but it loads as native ES modules, so it
**must be served over HTTP**. Opening `index.html` directly from disk will fail with a CORS error,
because browsers block module imports from the `file://` origin.

```bash
# Python (any version with the http.server module)
python -m http.server 8000

# or Node, with no install
npx serve .

# or PHP
php -S localhost:8000
```

Then open <http://localhost:8000>.

> **Network required.** All imagery is hotlinked from `figma.site` and `cloudfront.net`.
> The layout and animation work offline, but the artwork will not render.

---

## Project Structure

```
.
├── index.html            # Semantic markup: 3 story acts, header, sights slider
├── styles.css            # 640 lines — sticky stage, z-index stack, CSS variable contract
├── js/
│   ├── main.js           # Composition root — wires Model, View, Controller
│   ├── config.js         # Every tunable: act windows, ramps, easing, nav offsets
│   ├── model/
│   │   ├── state.js      # State + temporal easing. No DOM.
│   │   └── timeline.js   # Pure frame derivation. No DOM.
│   ├── view/
│   │   └── view.js       # All DOM access + CSS custom property rendering
│   ├── controller/
│   │   └── controller.js # Events, geometry measurement, rAF clock
│   └── utils/
│       └── math.js       # clamp, lerp, smoothstep, segmentInOut
├── ow_cdp.mjs            # Chrome DevTools Protocol inspection script (dev only)
├── .gitignore            # Excludes generated debug screenshots
├── AGENTS.md             # Conventions for automated agents
└── README.md
```

---

## Architecture — MVC

The scroll experience is split into three layers with strictly enforced boundaries. The rule that
makes the split meaningful: **dependencies point in one direction only.**

```
          ┌───────────────┐
   input  │  Controller   │  events, geometry, rAF clock
     ───▶ │  (control)    │──────────────────┐
          └───────┬───────┘                  │
                  │ mutates                 │ reads state
                  ▼                         ▼
          ┌───────────────┐          ┌───────────────┐
          │    Model      │─────────▶│     View      │
          │   (model)     │  frame   │    (view)     │
          └───────────────┘          └───────────────┘
                  ▲                          │
                  └──── no DOM refs ─────────┘
```

| Layer | Owns | Never does |
|---|---|---|
| **Model** (`js/model/`) | All state, all easing, all timeline math | Touch the DOM or read `window` |
| **View** (`js/view/`) | Every query, every style write, carousel DOM | Compute an animation value |
| **Controller** (`js/controller/`) | Event listeners, layout measurement, frame loop | Write a style or compute visuals |

### Why this split holds up

The 3700px choreography in `model/timeline.js` is a **pure function** of model state — same state
in, same numbers out. Because it never touches the DOM, the entire animation curve can be verified
numerically against a reference implementation without launching a browser. The refactor from the
original single file was validated this way across 9.1 million field comparisons, plus a
headless-Chrome pass for DOM behaviour.

### Data flow per frame

```
scroll / pointermove
        │
        ▼
  Controller.tick()          1. read scroll geometry
        │                    2. model.step()   ← easing integrates here
        ▼
  Model                      3. state is current
        │
        │  computeTimeline(model)
        ▼
  timeline frame             4. ~55 derived scalars, no DOM touched
        │
        ▼
  View.render(frame)         5. write CSS custom properties on :root
        │
        ▼
  CSS                        6. compositor applies transform / opacity / filter
```

The View's only job in step 5 is formatting — deciding that `backScale` becomes `--back-scale: 0.7600`
and that `bridgeX` becomes `calc(-50% + 32.4px)`.

---

## How It Works

### 1. The scroll rig

The page does not scroll elements natively. Instead it uses a **tall container with a sticky stage**:

```css
.cinema-scroll { height: calc(100vh + 3700px); }  /* 3700px of scroll distance */
.stage         { position: sticky; top: 0; height: 100vh; overflow: hidden; }
```

The stage stays pinned for the entire experience. Scroll position is read manually by the Controller
and used as the single animation clock:

```js
// controller/controller.js — geometry belongs here, not in the Model
const readScrollDistance = () => -els.section.getBoundingClientRect().top;

// model/state.js — and is clamped against the Model's known scroll extent
setScrollTarget(model, clampScrollDistance(readScrollDistance(), model));
```

### 2. The animation pipeline

No layer animates elements directly. The Model integrates a smoothed scroll value, the timeline
derives every visual scalar from it, and the View writes the results into **CSS custom properties
on `:root`**. All actual motion lives in CSS transitions and transforms, which keeps the work on
the compositor.

```
scroll event ──▶ model.scrollTarget
                      │
                  lerp (0.14)          ← temporal smoothing, inside Model.step()
                      │
                  model.scrollSmooth
                      │
                  computeTimeline()     ← pure, no DOM
                      │
        ~55 root.style.setProperty()  ──▶ CSS ──▶ paint
```

This indirection is the core design decision: JS owns *state*, CSS owns *rendering*.

### 3. Segmentation

Each timed act gets an `enter` and `exit` ramp, combined into an `active` value:

```js
// utils/math.js
export const segmentInOut = (scroll, [enterStart, enterEnd, exitStart, exitEnd]) => {
  const enter = smoothstep(enterStart, enterEnd, scroll);
  const exit  = smoothstep(exitStart, exitEnd, scroll);
  return { enter, exit, active: enter * (1 - exit) };
};
```

Act windows are declared once in `config.js` and consumed by the timeline, so retiming the
experience is a data change rather than a code change:

```js
export const SEGMENTS = {
  frame2: [560, 900, 1300, 1620],
  frame3: [1760, 2140, 2540, 2700],
};
```

`active` cross-fades; `enter` drives arrival motion; `exit` drives departure. This is how the
bridge panel, the river close-up, and the bazaar panel hand off to one another without a
timeline library.

### 4. The sights carousel

The markup ships 5 cards. On init the View empties the track and repopulates it with 3 identical
sets:

```js
// view/view.js
for (let setIndex = 0; setIndex < SLIDER_SET_COUNT; setIndex++) {   // 5 × 3 = 15 nodes
  source.forEach((card, cardIndex) => {
    const clone = card.cloneNode(true);
    clone.dataset.sightIndex = String(setIndex * setSize + cardIndex);
    els.track.appendChild(clone);
  });
}
centerSlider(model);                                             // start in the middle set
```

Movement is a single CSS variable, so navigation costs one style write:

```js
// view/view.js
setVar('--sights-shift', `${-(cardWidth + gap) * activeSight}px`);
```

The loop closes on `transitionend` — when the selection drifts past either set boundary, the
track jumps back by exactly one set with transitions temporarily suppressed, which is invisible
to the user:

```js
// model/state.js — the Model owns the wrap rule, not the DOM
export const normalizeSliderIndex = (model) => {
  if (model.activeSight >= model.sightCount * 2) return model.activeSight - model.sightCount;
  if (model.activeSight < model.sightCount) return model.activeSight + model.sightCount;
  return null;
};
```

### 5. Pointer parallax

Cursor position is normalized to ±0.5 and eased independently of scroll:

```js
// controller/controller.js — capture
setPointerTarget(model, event.clientX, event.clientY, window.innerWidth, window.innerHeight);

// model/state.js — ease
model.mouseX = lerp(model.mouseX, model.mouseTargetX, EASING.pointer);
```

Each layer consumes it with a different multiplier and axis — the background drifts
`mouseX * -12px`, the bridge `mouseX * 18px`, the split frames `mouseX * 22px` — producing
depth separation from one pointer signal.

---

## Scroll Timeline

Distances are in pixels from the top of the experience (3700px total).

| Range | Act | What happens |
|---|---|---|
| `0` – `90` | **Intro** | Hero title and copy hold at full opacity |
| `90` – `650` | **Intro exit** | Title drifts up and fades; copy follows |
| `560` – `1620` | **Act I · Bridge** | River close-up enters; background blurs and dims; bridge scales up and drifts out; bridge copy panel fades in |
| `1760` – `2700` | **Act II · Bazaar** | Bazaar panel slides in; background saturation lifts; bazaar copy panel takes over |
| `2760` – `3560` | **Sights** | Carousel slides in from the right on an eased `^1.55` curve, counter-scaled against the background |
| `3360` – `3660` | **Sights controls** | Prev/next arrows fade in and become interactive |

Global progress is normalized as `scroll / 2700`, driving the shared background scale, hero
drift, and depth offset.

---

## Accessibility

- **Reduced motion** — `prefers-reduced-motion: reduce` snaps scroll to its target (no easing),
  zeroes parallax, and disables all transitions and smooth scrolling.
- **Keyboard** — carousel cards are focusable and respond to <kbd>Enter</kbd> and <kbd>Space</kbd>.
- **Semantics** — `<main>`, `<header>`, `<nav>`, and `<section>` landmarks; every section and
  icon-only control carries an `aria-label`.
- **Contrast** — cream text (`#fdf1e1`) on darkened artwork, with layered text shadows.
- **Overflow** — `overflow-x: clip` on `<body>` prevents horizontal scrollbars from the oversized
  artwork layers.

---

## Performance

- One `requestAnimationFrame` loop, guarded by a `rafPending` flag so a frame is never queued twice.
- The loop **self-terminates** when scroll and pointer deltas fall below threshold, so an idle
  page costs nothing.
- `scroll`, `pointermove`, and `resize` handlers are passive.
- Animation is limited to `transform`, `opacity`, and `filter`; all motion uses `translate3d` to
  avoid layout and paint.
- `will-change: transform` is applied only to the layers that actually move.

---

## Browser Support

Modern evergreen browsers. The site relies on:

- **Native ES modules** with static `import`/`export` (no bundler, no transpiler)
- CSS custom properties, `clamp()`, `min()`/`max()`
- `position: sticky`
- `Element.replaceChildren()`, `Node.cloneNode()`
- `matchMedia` with a `change` listener
- `Array.from`, arrow functions, template literals, `String.replaceAll`-free
- `prefers-reduced-motion`

Roughly Chrome/Edge 105+, Firefox 121+, Safari 15.4+.

---

## Debugging with CDP

`ow_cdp.mjs` is a development utility that inspects a **running** page over the Chrome DevTools
Protocol. It reports scroll geometry, computed styles, image load state, font status, carousel
transform state, overflow, and console errors — then writes a screenshot.

Start Chrome with the debug port and load the site:

```bash
# 1. Launch Chrome with remote debugging
chrome.exe --remote-debugging-port=9222

# 2. Open http://localhost:8000 in that window, then run:
node ow_cdp.mjs
```

It prints a JSON report and writes `ow_cdp_shot.png` (git-ignored). It is **not** part of the
deployed site.

---

## Deployment

The site is fully static, so any static host works — GitHub Pages, Netlify, Vercel, Cloudflare
Pages, or plain object storage.

### GitHub Pages

No workflow file is included. Enable Pages without a build:

```bash
gh api -X POST repos/:owner/:repo/pages \
  -f source[branch]=main -f source[path]=/ --jq .html_url
```

Then the site is served from the repository root — `index.html` becomes the entry point.

---

## Known Limitations

Honest list of what is not finished:

- **Hotlinked assets.** All imagery and the `Ogg Medium` webfont load from third-party CDNs. The
  site breaks visually if those URLs are removed, and offers no offline fallback.
- **Requires an HTTP origin.** Native ES modules cannot load over `file://`. The site will not work
  by double-clicking `index.html`.
- **Hardcoded nav offsets.** Header links scroll to fixed pixel positions (0 / 1100 / 2200 / 3500)
  rather than real anchors, so they will drift if the timeline changes. `#routes` has no
  corresponding section in the document. Offsets live in `config.js` → `NAV_OFFSETS`.
- **Inert controls.** The language switcher and the "Open old town notes" button are styled but
  have no handlers attached.
- **No test runner or CI.** The MVC split makes the timeline unit-testable, and it was verified
  numerically during the refactor, but no automated suite is checked into the repo.
- **No build or minification.** Files are served exactly as authored.
- **Broad `will-change`.** Applied to many long-lived layers; on low-memory devices this can be
  tuned down.

---

## Credits & Assets

- **Design & code:** original project work.
- **Imagery:** Figma-hosted exports served from `raft-blast-61784561.figma.site`; card pins from
  CloudFront. All rights remain with their respective owners.
- **Typeface:** `Ogg Medium` via `@font-face` from CloudFront, falling back to
  Inter / Satoshi / `system-ui`.
- **Content:** Mostar landmarks and dates (Stari Most 1566, UNESCO inscription 2005).

---

## License

No license has been declared yet. Until one is added, treat this repository as
**all rights reserved** — contact the author before reuse.

Third-party imagery and fonts are **not** covered by any license granted here and remain
property of their respective owners.
