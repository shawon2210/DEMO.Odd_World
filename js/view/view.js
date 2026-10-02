/**
 * View — owns every DOM interaction.
 *
 * Responsibilities:
 *  - cache element references once, up front
 *  - translate a timeline frame into CSS custom properties on `:root`
 *  - build and position the infinite carousel
 *
 * The View holds no animation logic. It is handed a computed frame and formats it.
 */

import { SLIDER_SET_COUNT } from '../config.js';

const SELECTORS = {
  section: '.cinema-scroll',
  root: ':root',
  track: '.sights-track',
  controls: '.sights-controls',
  prevBtn: '.sight-prev',
  nextBtn: '.sight-next',
  card: '.sight-card',
};

export const createView = () => {
  const doc = document;
  const els = {
    section: doc.querySelector(SELECTORS.section),
    root: doc.documentElement,
    track: doc.querySelector(SELECTORS.track),
    controls: doc.querySelector(SELECTORS.controls),
    prevBtn: doc.querySelector(SELECTORS.prevBtn),
    nextBtn: doc.querySelector(SELECTORS.nextBtn),
  };

  /** All carousel cards across every cloned set. */
  let cards = [];
  let cardWidth = 0;
  let gap = 0;

  const setVar = (name, value) => els.root.style.setProperty(name, value);
  const num = (value) => value.toFixed(4);
  const px = (value) => `${num(value)}px`;
  const vh = (value) => `${num(value)}vh`;
  const vw = (value) => `${num(value)}vw`;

  /**
   * Write one timeline frame to CSS custom properties.
   *
   * Values land on `:root` so every rule in styles.css can read them, which keeps
   * layout math out of the stylesheet and keeps rendering off the JS thread.
   */
  const render = (frame) => {
    // Pointer
    setVar('--mx', num(frame.pointerX));
    setVar('--my', num(frame.pointerY));

    // Background stack
    setVar('--back-opacity', num(frame.backOpacity));
    setVar('--back-x', px(frame.backX));
    setVar('--back-y', px(frame.backY));
    setVar('--back-scale', num(frame.backScale));
    setVar('--four-y', vh(frame.fourY));
    setVar('--four-scale', num(frame.fourScale));
    setVar('--bazaar-y', vh(frame.bazaarY));
    setVar('--blur-px', px(frame.blur));
    setVar('--back-brightness', num(frame.backBrightness));
    setVar('--bazaar-blur-px', px(frame.bazaarBlur));
    setVar('--bazaar-brightness', num(frame.bazaarBrightness));
    setVar('--bazaar-saturation', num(frame.bazaarSaturation));

    // Colour shade overlay
    setVar('--shade-opacity', '1');
    setVar('--shade-z', String(frame.shadeZ));
    setVar('--shade-top-alpha', num(frame.shadeTopAlpha));
    setVar('--shade-mid-alpha', num(frame.shadeMidAlpha));
    setVar('--shade-bottom-alpha', num(frame.shadeBottomAlpha));

    // Hero title
    setVar('--title-y', px(frame.titleY));
    setVar('--title-scale', num(frame.titleScale));
    setVar('--title-opacity', num(frame.titleOpacity));

    // Bridge foreground
    setVar('--bridge-x', `calc(-50% + ${px(frame.bridgeX)})`);
    setVar('--bridge-y', px(frame.bridgeY));
    setVar('--bridge-bottom', vh(frame.bridgeBottom));
    setVar('--bridge-width', vw(frame.bridgeWidth));
    setVar('--bridge-scale', num(frame.bridgeScale));

    // Split frames
    setVar('--split-left-x', `calc(-50% + ${vw(frame.splitLeftX)} + ${px(frame.pointerX * 22)})`);
    setVar('--split-left-y', px(frame.splitY));
    setVar('--split-left-scale', num(frame.splitScale));
    setVar('--split-right-x', `calc(-50% + ${vw(frame.splitRightX)} + ${px(frame.pointerX * 22)})`);
    setVar('--split-right-y', px(frame.splitY));
    setVar('--split-right-scale', num(frame.splitScale));

    // River close-up
    setVar('--frame2-opacity', num(frame.frame2Opacity));
    setVar('--frame2-x', `calc(-50% + ${px(frame.frame2X)})`);
    setVar('--frame2-y', `calc(-50% + ${px(frame.frame2Y)})`);
    setVar('--frame2-scale', num(frame.frame2Scale));

    // Intro copy
    setVar('--intro-copy-y', px(frame.introCopyY));
    setVar('--intro-copy-opacity', num(frame.introCopyOpacity));

    // Story panels
    setVar('--panel2-opacity', num(frame.panel2Opacity));
    setVar('--panel2-y', `calc(-50% + ${px(frame.panel2Y)})`);
    setVar('--panel3-opacity', num(frame.panel3Opacity));
    setVar('--panel3-y', `calc(-50% + ${px(frame.panel3Y)})`);

    // Sights rail
    setVar('--sights-opacity', num(frame.sightsOpacity));
    setVar('--sights-controls-opacity', num(frame.sightsControlsOpacity));
    setVar('--sights-y', '0px');
    setVar('--sights-enter-x', vw(frame.sightsEnterX));
    setVar('--sights-scale', num(frame.sightsScale));
    setVar('--sights-top', px(frame.sightsTop));
    setVar('--sights-screen-top', px(frame.sightsScreenTop));
    setVar('--sights-visibility', frame.sightsVisible ? 'visible' : 'hidden');

    // Controls stay inert until fully faded in.
    if (els.controls) els.controls.classList.toggle('is-ready', frame.sightsControlsReady);
  };

  /**
   * Build the carousel as `SLIDER_SET_COUNT` identical copies of the source cards.
   *
   * Sets before and after the middle one let the selection wrap without a visible
   * seam in either direction.
   *
   * @returns {number} The number of cards in a single set.
   */
  const buildSlider = () => {
    if (!els.track) return 0;

    const originals = Array.from(els.track.querySelectorAll(SELECTORS.card));
    const setSize = originals.length;
    const source = [...originals];

    els.track.replaceChildren();

    for (let setIndex = 0; setIndex < SLIDER_SET_COUNT; setIndex++) {
      source.forEach((card, cardIndex) => {
        const clone = card.cloneNode(true);
        clone.dataset.sightIndex = String(setIndex * setSize + cardIndex);
        els.track.appendChild(clone);
      });
    }

    cards = Array.from(els.track.querySelectorAll(SELECTORS.card));
    return setSize;
  };

  /** Cache the card metrics used to convert a card index into a pixel offset. */
  const measureSlider = () => {
    if (!cards.length || !els.track) return;
    cardWidth = cards[0].offsetWidth;
    gap = parseFloat(getComputedStyle(els.track).columnGap || '0');
  };

  /** Position the track so `activeSight` is the centred card. */
  const renderSlider = (activeSight) => {
    if (!cards.length) return;

    setVar('--sights-shift', `${-(cardWidth + gap) * activeSight}px`);
    cards.forEach((card) => {
      card.classList.toggle('is-active', Number(card.dataset.sightIndex) === activeSight);
    });
  };

  /** Suppress the track transition for one frame pair, for invisible wrap jumps. */
  const setSliderJumping = (isJumping) => {
    if (!els.track) return;
    els.track.classList.toggle('is-jumping', isJumping);
  };

  /** Attach a handler to every card, including all clones. */
  const onCardActivate = (handler) => {
    cards.forEach((card) => {
      card.addEventListener('click', () => handler(card));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handler(card);
        }
      });
    });
  };

  return {
    els,
    render,
    buildSlider,
    measureSlider,
    renderSlider,
    setSliderJumping,
    onCardActivate,
  };
};
