import type { ReactSelectProps } from '../types';

/** Keeps a scroll inside the menu or its footer from closing the menu. */
function closeMenuOnScroll(event: Event) {
  return !(
    event.target instanceof Element &&
    event.target.closest('[role="listbox"], [data-select-menu-footer]')
  );
}

/** React Select settings shared by every select: explicit commits, fixed menus, no auto-open. */
export const selectBehavior = {
  closeMenuOnSelect: false,
  blurInputOnSelect: false,
  tabSelectsValue: false,
  openMenuOnFocus: false,
  menuPosition: 'fixed',
  menuPlacement: 'auto',
  menuShouldScrollIntoView: false,
  maxMenuHeight: 240,
  closeMenuOnScroll,
  unstyled: true,
  noOptionsMessage: () => 'No matching options. Try another search.',
} satisfies Partial<ReactSelectProps>;
