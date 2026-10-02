import { writeFileSync } from 'node:fs';

const listUrl = 'http://127.0.0.1:9222/json';
const targets = await (await fetch(listUrl)).json();
const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
if (!page) {
  console.log('NO_PAGE_TARGET');
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const consoleMsgs = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

const evals = new Map();
function onEvent(msg) {
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    consoleMsgs.push({
      type: msg.params.type,
      text: (msg.params.args || [])
        .map((a) => a.value ?? a.description ?? a.unserializableValue ?? '')
        .join(' '),
    });
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleMsgs.push({
      type: 'exception',
      text:
        msg.params.exceptionDetails?.exception?.description ||
        msg.params.exceptionDetails?.text ||
        'unknown exception',
    });
  }
}

await new Promise((resolve) => ws.addEventListener('open', resolve));
ws.addEventListener('message', (e) => onEvent(JSON.parse(e.data)));

await send('Runtime.enable');
await send('Page.enable');

async function evalJs(expr) {
  const r = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) {
    return { __error: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
  }
  return r.result.value;
}

const out = {};
out.url = await evalJs('location.href');
out.title = await evalJs('document.title');
out.readyState = await evalJs('document.readyState');

out.selectors = await evalJs(`(() => {
  const sel = ['.cinema-scroll','.sights-track','.sights-controls','.sight-prev','.sight-next','.sights-slider','.pointer','.cursor'];
  const o = {};
  for (const s of sel) o[s] = document.querySelectorAll(s).length;
  return o;
})()`);

out.cloneCount = await evalJs(
  `document.querySelectorAll('.sights-track .sight-card, .sights-track .sight').length`
);
out.trackChildCount = await evalJs(`(() => { const t = document.querySelector('.sights-track'); return t ? t.children.length : -1; })()`);

out.bodyFont = await evalJs(`getComputedStyle(document.body).fontFamily`);
out.h1 = await evalJs(`(() => {
  const el = document.querySelector('h1');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { text: el.textContent.trim().slice(0,80), fontFamily: cs.fontFamily, fontSize: cs.fontSize, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, color: cs.color };
})()`);

out.scrollDoc = await evalJs(`({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight, innerWidth: window.innerWidth, dpr: window.devicePixelRatio })`);

out.sections = await evalJs(`Array.from(document.querySelectorAll('section, main > div')).map((s,i)=>({i, id: s.id||null, cls: s.className||null, h: Math.round(s.getBoundingClientRect().height)}))`);

out.visibility = await evalJs(`(() => {
  const els = document.querySelectorAll('body *');
  let visible = 0, hidden = 0;
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') hidden++;
    else visible++;
  }
  return { total: els.length, visible, hidden };
})()`);

out.imagery = await evalJs(`(() => {
  return Array.from(document.images).map((im) => ({
    src: (im.currentSrc || im.src || '').slice(0, 120),
    complete: im.complete,
    w: im.naturalWidth,
    h: im.naturalHeight,
    display: getComputedStyle(im).display,
  }));
})()`);

out.lazyAttrs = await evalJs(`Array.from(document.images).map((i) => ({ loading: i.getAttribute('loading'), src: (i.getAttribute('src')||'').slice(0,80) }))`);

// fonts
out.fonts = await evalJs(`(() => {
  return Array.from(document.fonts).map(f => ({ family: f.family, status: f.status }));
})()`);

// reduced motion
out.reducedMotionMatches = await evalJs(`window.matchMedia('(prefers-reduced-motion: reduce)').matches`);

out.sightsBefore = await evalJs(`(() => {
  const t = document.querySelector('.sights-track');
  if (!t) return null;
  return { transform: getComputedStyle(t).transform, transition: getComputedStyle(t).transition, duration: getComputedStyle(t).transitionDuration };
})()`);

out.sightsAfter = await evalJs(`(async () => {
  const next = document.querySelector('.sight-next');
  if (!next) return null;
  const t = document.querySelector('.sights-track');
  const before = getComputedStyle(t).transform;
  next.click();
  await new Promise(r => setTimeout(r, 1200));
  const after = getComputedStyle(t).transform;
  return { before, after, changed: before !== after };
})()`);

out.pointerBefore = await evalJs(`(() => {
  const p = document.querySelector('.pointer') || document.querySelector('.cursor');
  if (!p) return null;
  const cs = getComputedStyle(p);
  return { transform: cs.transform, opacity: cs.opacity, display: cs.display, cls: p.className };
})()`);

out.pointerAfterMove = await evalJs(`(async () => {
  const p = document.querySelector('.pointer') || document.querySelector('.cursor');
  if (!p) return null;
  const ev = (x, y) => window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
  const before = getComputedStyle(p).transform;
  ev(100, 200);
  await new Promise(r => setTimeout(r, 900));
  const mid = getComputedStyle(p).transform;
  ev(900, 500);
  await new Promise(r => setTimeout(r, 900));
  const after = getComputedStyle(p).transform;
  return { before, mid, after, moved: before !== after };
})()`);

out.scrollTest = await evalJs(`(async () => {
  const scroller = document.querySelector('.cinema-scroll') || window;
  const start = scroller === window ? window.scrollY : scroller.scrollTop;
  if (scroller === window) window.scrollTo(0, 600);
  else scroller.scrollTop = 600;
  await new Promise(r => setTimeout(r, 800));
  const end = scroller === window ? window.scrollY : scroller.scrollTop;
  return { isWindow: scroller === window, start, end, moved: start !== end, maxScroll: scroller === window ? document.documentElement.scrollHeight - window.innerHeight : scroller.scrollHeight - scroller.clientHeight };
})()`);

out.pointerAfterScroll = await evalJs(`(() => {
  const p = document.querySelector('.pointer') || document.querySelector('.cursor');
  if (!p) return null;
  const cs = getComputedStyle(p);
  return { transform: cs.transform, opacity: cs.opacity, background: cs.backgroundColor, width: cs.width, height: cs.height, borderRadius: cs.borderRadius, mixBlendMode: cs.mixBlendMode, position: cs.position, zIndex: cs.zIndex };
})()`);

out.overflowX = await evalJs(`({ docScrollW: document.documentElement.scrollWidth, winW: window.innerWidth, horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1 })`);

out.consoleMsgs = consoleMsgs;

out.cinematic = await evalJs(`(() => {
  const b = getComputedStyle(document.body);
  return { overflow: b.overflow, height: b.height, position: b.position, bg: b.backgroundColor, cursor: b.cursor };
})()`);

out.pointerEvents = await evalJs(`(() => {
  const p = document.querySelector('.pointer');
  if (!p) return null;
  return { pointerEvents: getComputedStyle(p).pointerEvents, zIndex: getComputedStyle(p).zIndex, position: getComputedStyle(p).position };
})()`);

out.sightsControls = await evalJs(`(() => {
  const c = document.querySelector('.sights-controls');
  if (!c) return null;
  return { html: c.innerHTML.slice(0, 400), display: getComputedStyle(c).display, children: c.children.length };
})()`);

out.scrollRestored = await evalJs(`(() => {
  const scroller = document.querySelector('.cinema-scroll');
  return { scrollTop: scroller ? scroller.scrollTop : window.scrollY };
})()`);

out.netErrors = await evalJs(`(() => {
  return performance.getEntriesByType('resource').filter(r => r.transferSize === 0 && r.decodedBodySize === 0).map(r => r.name).slice(0, 20);
})()`);

out.finalShot = null;
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
if (shot?.data) {
  const p = 'D:/02_Projects/ODD WORLD/ow_cdp_shot.png';
  writeFileSync(p, Buffer.from(shot.data, 'base64'));
  out.finalShot = p;
}

console.log(JSON.stringify(out, null, 2));
ws.close();
