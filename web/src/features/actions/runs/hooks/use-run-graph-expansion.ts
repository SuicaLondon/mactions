import { useState } from 'react';

/** Which grouped graph nodes show all of their executions. */
export function useRunGraphExpansion() {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  function toggleExpanded(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return { expanded, toggleExpanded };
}
