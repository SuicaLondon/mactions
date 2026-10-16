import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom does not implement the browser's native modal dialog methods.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
};
// jsdom does not scroll; tests spy on this no-op to observe scroll requests.
Element.prototype.scrollIntoView = function () {};
afterEach(async () => {
  cleanup();
  // In-app Back traverses history after two timer tasks; let it settle before the next test.
  if (!vi.isFakeTimers()) {
    for (let task = 0; task < 3; task += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  // The app keeps its page in the URL hash; each test starts on the list again.
  window.history.replaceState(null, '', '/');
});
