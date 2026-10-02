# Odd World · Mostar

A scroll-driven, cinematic single-page story about **Mostar, Bosnia and Herzegovina**.

One tall scroll container, one sticky stage, and a ~50-variable animation pipeline that
choreographs layered artwork, editorial copy, and a looping sights carousel using nothing but
scroll position and pointer movement.

> No build step. No dependencies. No framework. Open the file and it runs.

---

## Table of Contents

- [Highlights](#highlights)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
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
| **Scroll-driven choreography** | Four timed acts cross-fade layered artwork, blur, and brightness from a single `requestAnimationFrame` loop |
| **Infinite carousel** | 5 sight cards cloned into 3 sets (15 nodes) for a seamless wrap with no visible seam |
| **Pointer parallax** | Normalized cursor tracking drives independent depth offsets, drifts, and rotations per layer |
| **Reduced-motion support** | `prefers-reduced-motion` disables smoothing, parallax, and all transitions site-wide |
| **Keyboard operable** | Carousel cards expose `role="button"`, `tabindex="0"`, and Enter/Space activation |
| **Responsive** | Three breakpoints (1500 / 1100 / 640px) reflow type, artwork scale, and card sizing |
| **Performance-minded** | Passive listeners, a single rAF tick guard, `will-change` on animated layers, compositor-only properties |

---

## Quick Start

The site is fully static. There is nothing to install.

### Option A — open directly

```bash
start index.html          # Windows
open  index.html          # macOS
xdg-open index.html       # Linux
```

Works because the project uses no ES modules, no `fetch`, and no build step.

### Option B — local server (recommended)

A local server gives you accurate scroll/devtools behavior and a real origin for asset requests.

```bash
# Python (any version with the http.server module)
python -m http.server 8000

# or Node, with no install
npx serve .
```

Then open <http://localhost:8000>.

> **Network required.** All imagery is hotlinked from `figma.site` and `cloudfront.net`.
> The layout and animation work offline, but the artwork will not render.

---

## Project Structure

```
.
├── index.html      # Semantic markup: 3 story acts, header, sights slider
├── styles.css      # 640 lines — sticky stage, z-index stack, CSS variable contract
├── script.js       # 282 lines — rAF loop, scroll math, carousel, parallax
├── ow_cdp.mjs      # Chrome DevTools Protocol inspection script (dev only)
├── .gitignore      # Excludes generated debug screenshots
└── README.md
```

---

## How It Works

### 1. The scroll rig

The page does not scroll elements natively. Instead it uses a **tall container with a sticky stage**:

```css
.cinema-scroll { height: calc(100vh + 3700px); }  /* 3700px of scroll distance */
.stage         { position: sticky; top: 0; height: 100vh; overflow: hidden; }
```

The stage stays pinned for the entire experience. Scroll position is read manually and used as
the single animation clock:

```js
const getScrollDistance = () =>
  clamp(-section.getBoundingClientRect().top, 0, section.offsetHeight - window.innerHeight);
```

### 2. The animation pipeline

`script.js` never animates elements directly. It computes a smoothed scroll value, derives every
visual property from it, and writes results into **CSS custom properties on `:root`**. All actual
motion lives in CSS transitions and transforms, which keeps the work on the compositor.

```
scroll event ──▶ targetScroll
                      │
                  lerp (0.14)          ← temporal smoothing
                      │
                  smoothScroll
                      │
        ┌─────────────┴─────────────┐
        │  segment math             │  smoothstep enter/exit windows
        │  frame2 / frame3 / intro  │
        └─────────────┬─────────────┘
                      │
        ~50 root.style.setProperty()  ──▶ CSS ──▶ paint
```

This indirection is the core design decision: JS owns *state*, CSS owns *rendering*.

### 3. Segmentation

Each timed act gets an `enter` and `exit` ramp, combined into an `active` value:

```js
const segmentInOut = (s, a, b, c, d) => {
  const enter = smoothstep(a, b, s);
  const exit  = smoothstep(c, d, s);
  return { enter, exit, active: enter * (1 - exit) };
};
```

`active` cross-fades; `enter` drives arrival motion; `exit` drives departure. This is how the
bridge panel, the river close-up, and the bazaar panel hand off to one another without a
timeline library.

### 4. The sights carousel

The markup ships 5 cards. On init the track is emptied and repopulated with 3 identical sets:

```js
for (let setIndex = 0; setIndex < 3; setIndex++) {   // 5 × 3 = 15 nodes
  originalCards.forEach((card, cardIndex) => { /* cloneNode(true) */ });
}
activeSight = originalSightCount;                     // start in the middle set
```

Movement is a single CSS variable, so navigation costs one style write:

```js
root.style.setProperty("--sights-shift", `${-(cardWidth + gap) * activeSight}px`);
```

The loop closes on `transitionend` — when the selection drifts past either set boundary, the
track jumps back by exactly one set with transitions temporarily suppressed, which is invisible
to the user:

```js
function normalizeSightSlider() {
  if (activeSight >= originalSightCount * 2) jumpSightSlider(activeSight - originalSightCount);
  else if (activeSight < originalSightCount)   jumpSightSlider(activeSight + originalSightCount);
}
```

### 5. Pointer parallax

Cursor position is normalized to ±0.5 and eased independently of scroll:

```js
targetMouseX = e.clientX / window.innerWidth - 0.5;
mouseX = lerp(mouseX, targetMouseX, 0.12);
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

- CSS custom properties, `clamp()`, `min()`/`max()`
- `position: sticky`
- `Element.replaceChildren()`, `Node.cloneNode()`
- `Array.from`, arrow functions, template literals
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
- **Hardcoded nav offsets.** Header links scroll to fixed pixel positions (0 / 1100 / 2200 / 3500)
  rather than real anchors, so they will drift if the timeline changes. `#routes` has no
  corresponding section in the document.
- **Inert controls.** The language switcher and the "Open old town notes" button are styled but
  have no handlers attached.
- **No tests or CI.** There is no test runner and no automated pipeline.
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
