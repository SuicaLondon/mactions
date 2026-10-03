import { cn } from '../../../../../shared/lib/cn';
import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';

export function CreationProgress() {
  const { currentStep } = useRunnerCreationContext();
  return (
    <ol
      className={cn(
        'create-progress m-0 flex list-none gap-2 border-b border-b-line px-0 pt-0',
        'pb-3.75',
      )}
      aria-label="Add Runner steps"
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
                { 'border-accent bg-accent text-white': active },
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
