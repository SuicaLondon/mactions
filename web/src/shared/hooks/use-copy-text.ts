import { useCallback, useEffect, useState } from 'react';

export type CopyState = 'idle' | 'copied' | 'failed';

/** Copies text to the clipboard and reports the result until the next copy or two seconds pass. */
export function useCopyText(resetAfterMs = 2000) {
  const [state, setState] = useState<CopyState>('idle');
  useEffect(() => {
    if (state !== 'copied') return;
    const timer = window.setTimeout(() => setState('idle'), resetAfterMs);
    return () => window.clearTimeout(timer);
  }, [state, resetAfterMs]);
  const copy = useCallback(async (text: string) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  }, []);
  return { state, copy };
}
