export const keyboardShortcutGroups = [
  {
    title: 'Anywhere',
    shortcuts: [
      { key: '/', description: 'Search the current list' },
      { key: '1', description: 'Show Runners' },
      { key: '2', description: 'Show Runs' },
      { key: 'r', description: 'Refresh the current page' },
      { key: 'n', description: 'Add a runner' },
      { key: 'j / k', description: 'Next / previous row' },
      { key: 'Enter', description: 'Open the focused row' },
      { key: '?', description: 'Show keyboard shortcuts' },
      { key: 'Esc', description: 'Close a dialog' },
    ],
  },
  {
    title: 'Log search',
    shortcuts: [
      { key: 'Enter', description: 'Next match' },
      { key: 'Shift+Enter', description: 'Previous match' },
      { key: 'Esc', description: 'Clear the search' },
    ],
  },
] as const;

/** Typing into a field or editable region must never trigger single-key shortcuts. */
export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, select'));
}

export function hasCommandModifier(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey;
}

export function hasOpenDialog() {
  return Boolean(document.querySelector('dialog[open]'));
}

export function findSearchInput() {
  return document.querySelector<HTMLInputElement>(
    'main input[type="search"], main [role="searchbox"]',
  );
}

function isVisible(element: HTMLElement) {
  if (typeof element.checkVisibility !== 'function') return true;
  return element.checkVisibility();
}

function isRefreshButton(button: HTMLButtonElement) {
  const label = button.getAttribute('aria-label') ?? button.textContent ?? '';
  return label.trim().startsWith('Refresh');
}

/** Finds the first visible Refresh control the current page renders. */
export function findRefreshButton() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('main button');
  return Array.from(buttons).find((button) => isRefreshButton(button) && isVisible(button));
}

/**
 * Each list row marks the element that takes its focus with `data-row-focus`: the row itself in
 * the Runners grid, or the row's primary button in the Runs and Job history tables.
 */
function findRowTargets() {
  const targets = document.querySelectorAll<HTMLElement>('main [data-row-focus]');
  return Array.from(targets).filter(isVisible);
}

function rowOf(target: HTMLElement) {
  return target.closest<HTMLElement>('[role="row"], tr') ?? target;
}

function follows(element: Element, reference: Element) {
  return Boolean(reference.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/** The visible row target whose row holds the focused element, or -1 outside any row. */
function focusedRowIndex(targets: HTMLElement[], active: Element | null) {
  if (!active) return -1;
  return targets.findIndex((target) => rowOf(target).contains(active));
}

/** Whether focus is on a list row, where ArrowUp and ArrowDown move between rows. */
export function hasFocusedRow() {
  return focusedRowIndex(findRowTargets(), document.activeElement) !== -1;
}

/** The visible row target whose row is selected, such as the runner whose details are open. */
function selectedRowIndex(targets: HTMLElement[]) {
  return targets.findIndex((target) => rowOf(target).getAttribute('aria-selected') === 'true');
}

/**
 * The row target to focus next (`step` 1) or previously (`step` -1), clamped to the first and last
 * rows. Outside a row, the step starts from the selected row; without one, the next row after the
 * focused element is chosen, or the first row.
 */
export function findAdjacentRow(step: 1 | -1) {
  const targets = findRowTargets();
  const active = document.activeElement;
  let index = focusedRowIndex(targets, active);
  if (index === -1) index = selectedRowIndex(targets);
  if (index !== -1) return targets[Math.min(targets.length - 1, Math.max(0, index + step))];
  if (active && step === 1) {
    const next = targets.find((target) => follows(target, active));
    if (next) return next;
  }
  return targets[0];
}
