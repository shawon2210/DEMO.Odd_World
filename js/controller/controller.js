/**
 * Controller — owns input, geometry, and the animation clock.
 *
 * Responsibilities:
 *  - translate browser events into Model mutations
 *  - measure layout and keep the Model's geometry fields current
 *  - drive the requestAnimationFrame loop that ticks Model and View
 *  - enforce carousel wrap-around
 *
 * The Controller never computes a visual value and never writes a style directly.
 */

import { NAV_OFFSETS } from '../config.js';
import {
  centerSlider,
  clampScrollDistance,
  moveSlider,
  normalizeSliderIndex,
  setActiveSight,
  setPointerTarget,
  setScrollDistance,
  setScrollTarget,
  setSightCount,
  setViewport,
  step,
} from '../model/state.js';
import { computeTimeline } from '../model/timeline.js';

const HEADER_LINK_SELECTOR = '.site-nav a[href^="#"]';
const NAV_BEHAVIOR = 'smooth';

export const createController = ({ model, view }) => {
  const { els } = view;

  /** Guards against queueing two animation frames for the same tick. */
  let rafPending = false;

  /** Raw scroll offset of the pinned section, in pixels. */
  const readScrollDistance = () => {
    if (!els.section) return 0;
    return -els.section.getBoundingClientRect().top;
  };

  /** Refresh viewport and scroll-extent values used by the timeline. */
  const measure = () => {
    setViewport(model, window.innerWidth, window.innerHeight);
    setScrollDistance(model, els.section ? els.section.offsetHeight - window.innerHeight : 0);
  };

  /** Push the current carousel index to the view. */
  const paintSlider = () => view.renderSlider(model.activeSight);

  /**
   * One animation frame: advance the Model, then render the result.
   *
   * The loop self-terminates once scroll and pointer deltas fall below their
   * thresholds, so an idle page schedules no further frames.
   */
  const tick = () => {
    rafPending = false;

    setScrollTarget(model, clampScrollDistance(readScrollDistance(), model));
    const needsAnotherFrame = step(model);

    view.render(computeTimeline(model));

    if (needsAnotherFrame) requestFrame();
  };

  const requestFrame = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(tick);
  };

  /**
   * Relocate the carousel without animating, so the wrap is invisible.
   * Suppression spans two frames to survive style recalculation.
   */
  const jumpSliderTo = (index) => {
    view.setSliderJumping(true);
    setActiveSight(model, index);
    paintSlider();
    requestAnimationFrame(() => requestAnimationFrame(() => view.setSliderJumping(false)));
  };

  /** Correct the carousel if the selection has drifted past a set boundary. */
  const normalizeSlider = () => {
    const corrected = normalizeSliderIndex(model);
    if (corrected !== null) jumpSliderTo(corrected);
  };

  /** Focus the carousel on a specific card. */
  const selectCard = (card) => {
    const index = Number(card.dataset.sightIndex);
    if (!Number.isFinite(index)) return;
    setActiveSight(model, index);
    paintSlider();
  };

  /** Move the carousel by `delta` positions. */
  const nudgeSlider = (delta) => {
    moveSlider(model, delta);
    paintSlider();
  };

  /**
   * Arrow-key control for the carousel.
   *
   * The View uses a roving tabindex, so only the active card is focusable. That
   * makes keyboard operation a single tab stop with arrow keys, instead of one
   * tab stop per card across three cloned sets.
   */
  const onSliderKeydown = (event) => {
    const moves = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };

    if (event.key in moves) {
      event.preventDefault();
      nudgeSlider(moves[event.key]);
      view.focusActiveCard();
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const last = model.sightCount * 2 - 1;
      jumpSliderTo(event.key === 'Home' ? model.sightCount : last);
      view.focusActiveCard();
    }
  };

  /** Scroll to a named section, falling back to default anchor behaviour. */
  const scrollToHash = (hash) => {
    if (!(hash in NAV_OFFSETS)) return;
    window.scrollTo({ top: NAV_OFFSETS[hash], behavior: NAV_BEHAVIOR });
  };

  const bindEvents = () => {
    window.addEventListener('scroll', requestFrame, { passive: true });

    window.addEventListener('pointermove', (event) => {
      setPointerTarget(
        model,
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      );
      requestFrame();
    }, { passive: true });

    window.addEventListener('resize', () => {
      measure();
      view.measureSlider();
      paintSlider();
      requestFrame();
    });

    if (els.prevBtn) els.prevBtn.addEventListener('click', () => nudgeSlider(-1));
    if (els.nextBtn) els.nextBtn.addEventListener('click', () => nudgeSlider(1));

    if (els.track) {
      els.track.addEventListener('transitionend', normalizeSlider);
      els.track.addEventListener('keydown', onSliderKeydown);
    }

    document.querySelectorAll(HEADER_LINK_SELECTOR).forEach((link) => {
      link.addEventListener('click', (event) => {
        const hash = link.getAttribute('href');
        if (!(hash in NAV_OFFSETS)) return;
        event.preventDefault();
        scrollToHash(hash);
      });
    });
  };

  /**
   * Initialise state, build the carousel, and start the loop.
   * Call once after the DOM is ready.
   */
  const start = () => {
    measure();

    const setSize = view.buildSlider();
    setSightCount(model, setSize);
    centerSlider(model);

    view.measureSlider();
    view.onCardActivate(selectCard);
    paintSlider();

    bindEvents();

    // Respect the OS-level motion preference and track changes to it.
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => {
      model.reducedMotion = motionQuery.matches;
      requestFrame();
    };
    motionQuery.addEventListener('change', syncMotionPreference);
    syncMotionPreference();

    requestFrame();
  };

  return { start, requestFrame, measure };
};
