import type { JobSelection } from '../types/job-selection';

/** The `data-node` id of a job row in the job tree. */
export function jobTreeNode(jobId: number) {
  return `job-${jobId}`;
}

/** The `data-node` id of a step row, nested under its job's id. */
export function jobTreeStepNode(jobId: number, stepNumber: number) {
  return `${jobTreeNode(jobId)}-step-${stepNumber}`;
}

/** Reads the job and step a tree row stands for from its `data-node` id. */
export function parseJobTreeNode(node: string | undefined): JobSelection | null {
  const match = /^job-(\d+)(?:-step-(\d+))?$/.exec(node ?? '');
  if (!match) return null;
  const selection: JobSelection = { jobId: Number(match[1]) };
  if (match[2] !== undefined) selection.stepNumber = Number(match[2]);
  return selection;
}
