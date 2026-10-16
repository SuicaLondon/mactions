/** The row index that a grid navigation key moves focus to, clamped to the first and last rows. */
export function rowFocusIndex(key: string, index: number, count: number) {
  switch (key) {
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'ArrowUp':
      return Math.max(0, index - 1);
    case 'ArrowDown':
      return Math.min(count - 1, index + 1);
    default:
      return undefined;
  }
}
