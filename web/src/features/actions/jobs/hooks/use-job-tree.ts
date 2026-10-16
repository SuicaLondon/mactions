import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { useRef, useState } from 'react';

import type { JobSummary } from '../../data/types/activity-types';
import { jobTreeNode, parseJobTreeNode } from '../models/job-tree-node';
import type { JobSelection } from '../types/job-selection';

function treeRow(target: EventTarget) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>('[role="treeitem"]');
}

function onDisclosure(target: EventTarget) {
  return target instanceof Element && !!target.closest('[data-disclosure]');
}

/**
 * Handles the job tree's interaction for every row: roving focus, arrow-key navigation, and
 * selecting or expanding a row on click. The handlers go on the tree element and read the
 * row from its `data-node` id, so rows stay presentational.
 */
export function useJobTree(
  jobs: JobSummary[],
  expandedJobIds: number[],
  onSelect: (selection: JobSelection) => void,
  onToggle: (jobId: number, expanded: boolean) => void,
) {
  const tree = useRef<HTMLUListElement>(null);
  const [focused, setFocused] = useState<string | null>(null);
  let tabbable = focused ?? '';
  if (!focused && jobs[0]) tabbable = jobTreeNode(jobs[0].id);

  function onFocus(event: FocusEvent<HTMLUListElement>) {
    const node = treeRow(event.target)?.dataset.node;
    if (node) setFocused(node);
  }

  function onClick(event: MouseEvent<HTMLUListElement>) {
    const row = treeRow(event.target);
    const selection = parseJobTreeNode(row?.dataset.node);
    if (!selection) return;
    const { jobId, stepNumber } = selection;
    if (stepNumber !== undefined) {
      onSelect({ jobId, stepNumber });
      return;
    }
    const expanded = expandedJobIds.includes(jobId);
    if (onDisclosure(event.target)) {
      if (!expanded) onSelect({ jobId });
      onToggle(jobId, !expanded);
      return;
    }
    onSelect({ jobId });
    onToggle(jobId, true);
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const row = treeRow(event.target);
    const selection = parseJobTreeNode(row?.dataset.node);
    if (!row || !selection) return;
    const { jobId, stepNumber } = selection;
    const rows = [...(tree.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])];
    const index = rows.indexOf(row);
    let target: HTMLElement | undefined;
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
        } else if (rows[index + 1]?.dataset.parent === jobTreeNode(jobId)) {
          target = rows[index + 1];
        }
        break;
      case 'ArrowLeft':
        if (stepNumber === undefined && expandedJobIds.includes(jobId)) onToggle(jobId, false);
        else if (stepNumber !== undefined)
          target = rows.find((item) => item.dataset.node === jobTreeNode(jobId));
        break;
      default:
        return;
    }
    event.preventDefault();
    target?.focus();
  }

  return { tree, tabbable, onFocus, onClick, onKeyDown };
}
