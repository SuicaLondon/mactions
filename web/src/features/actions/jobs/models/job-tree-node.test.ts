import { expect, it } from 'vitest';

import { jobTreeNode, jobTreeStepNode, parseJobTreeNode } from './job-tree-node';

it('round-trips job and step row ids', () => {
  expect(jobTreeNode(12)).toBe('job-12');
  expect(jobTreeStepNode(12, 3)).toBe('job-12-step-3');
  expect(parseJobTreeNode(jobTreeNode(12))).toEqual({ jobId: 12 });
  expect(parseJobTreeNode(jobTreeStepNode(12, 3))).toEqual({ jobId: 12, stepNumber: 3 });
});

it('ignores elements that are not tree rows', () => {
  expect(parseJobTreeNode(undefined)).toBeNull();
  expect(parseJobTreeNode('job-x')).toBeNull();
  expect(parseJobTreeNode('runner-1')).toBeNull();
});
