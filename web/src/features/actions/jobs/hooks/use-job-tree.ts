import type { KeyboardEvent } from 'react';
import { useRef, useState } from 'react';

import type { JobSummary } from '../../data/types/activity-types';
import type { JobSelection } from '../types/job-selection';

export function useJobTree(
  jobs: JobSummary[],
  expandedJobIds: number[],
  onSelect: (selection: JobSelection) => void,
  onToggle: (jobId: number, expanded: boolean) => void,
) {
  const tree = useRef<HTMLUListElement>(null);
  const [focused, setFocused] = useState<string | null>(null);
  let first = '';
  if (jobs[0]) first = `job-${jobs[0].id}`;
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, jobId: number, stepNumber?: number) {
    const row = event.currentTarget;
    const rows = [
      ...(tree.current?.querySelectorAll<HTMLButtonElement>('[role="treeitem"]') ?? []),
    ];
    const index = rows.indexOf(row);
    let target: HTMLButtonElement | undefined;
    switch (event.key) {
      case 'ArrowDown':
        target = rows[index + 1];
        break;
      case 'ArrowUp':
        target = rows[index - 1];
        break;
      case 'Home':
        target = rows[0];
        break;
      case 'End':
        target = rows.at(-1);
        break;
      case 'ArrowRight':
        if (stepNumber !== undefined) return;
        if (!expandedJobIds.includes(jobId)) {
          onSelect({ jobId });
          onToggle(jobId, true);
        } else if (rows[index + 1]?.dataset.parent === `job-${jobId}`) {
          target = rows[index + 1];
        }
        break;
      case 'ArrowLeft':
        if (stepNumber === undefined && expandedJobIds.includes(jobId)) onToggle(jobId, false);
        else if (stepNumber !== undefined)
          target = rows.find((item) => item.dataset.node === `job-${jobId}`);
        break;
      default:
        return;
    }
    event.preventDefault();
    target?.focus();
  }
  return { tree, focused, setFocused, first, keyboard };
}
