import type { JobStep } from '../../../../shared/api/types';

/** Counts step numbers GitHub skipped before the step at `index`. */
export function hiddenStepsBefore(steps: JobStep[], index: number) {
  let previous = 0;
  if (index > 0) previous = steps[index - 1].number;
  return Math.max(0, steps[index].number - previous - 1);
}
