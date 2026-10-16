import { cn } from '../../../../shared/lib/cn';
import { useRunnerCreationStatus } from '../hooks/use-runner-creation-status';
import { useRunnerCreationStore } from '../stores/runner-creation-store';

/** The Method, Target, and Creating steps, with the current one marked. */
export function CreationProgress() {
  const step = useRunnerCreationStore((state) => state.step);
  const { pending } = useRunnerCreationStatus();
  let currentStep: 1 | 2 | 3 = step;
  if (pending) currentStep = 3;
  return (
    <ol
      className={cn('m-0 flex list-none gap-2 border-b border-b-line px-0 pt-0', 'pb-3.75')}
      aria-label="Add runner steps"
    >
      {(['Method', 'Target', 'Creating'] as const).map((label, index) => {
        const active = currentStep === index + 1;
        let ariaCurrent: 'step' | undefined;
        if (active) ariaCurrent = 'step';
        return (
          <li
            key={label}
            aria-current={ariaCurrent}
            className={cn(
              'flex flex-1 items-center gap-1.75 text-xs whitespace-nowrap text-muted',
              { 'font-semibold text-accent': active },
            )}
          >
            <span
              className={cn(
                'grid size-5 flex-none place-items-center rounded-full border border-line text-xs',
                { 'border-accent-fill bg-accent-fill text-white': active },
              )}
            >
              {index + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
