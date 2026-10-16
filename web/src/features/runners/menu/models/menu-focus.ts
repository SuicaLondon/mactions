/** The menu item a navigation key moves focus to, wrapping at either end. */
export function menuFocusIndex(key: string, current: number, count: number) {
  switch (key) {
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'ArrowDown':
      return (current + 1 + count) % count;
    case 'ArrowUp':
      return (current - 1 + count) % count;
    default:
      return undefined;
  }
}
