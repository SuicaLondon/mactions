import { useState } from 'react';

/**
 * A value the caller may own. With `value` the caller's copy is shown, and with `onChange`
 * changes go to the caller; otherwise the hook keeps its own copy, starting from `initial`.
 */
export function useControllableValue<T>(
  value: T | undefined,
  onChange: ((next: T) => void) | undefined,
  initial: T,
) {
  const [local, setLocal] = useState(initial);
  const change: (next: T) => void = onChange ?? setLocal;
  return [value ?? local, change] as const;
}
