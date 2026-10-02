/**
 * Composition root.
 *
 * Wires the three layers together and boots them. This is the only module that
 * knows about all three at once; Model, View, and Controller have no knowledge of
 * each other's construction.
 *
 *   js/
 *   ├── main.js          <- you are here
 *   ├── config.js
 *   ├── model/           state.js, timeline.js
 *   ├── view/            view.js
 *   └── controller/      controller.js
 */

import { createModel } from './model/state.js';
import { computeTimeline } from './model/timeline.js';
import { createView } from './view/view.js';
import { createController } from './controller/controller.js';

const model = createModel();
const view = createView();
const controller = createController({ model, view });

const boot = () => controller.start();

// Module scripts are deferred by default, so the DOM is normally already parsed.
// The readyState guard covers the case where this module is loaded dynamically.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

export { model, view, controller, computeTimeline };
