import { cn } from '../../../../../shared/lib/cn';
interface WelcomeMethodChoicesProps {
  method: 'cli' | 'token';
  cliDescription: string;
  onSelect: (method: 'cli' | 'token') => void;
}
export function WelcomeMethodChoices({
  method,
  cliDescription,
  onSelect,
}: WelcomeMethodChoicesProps) {
  return (
    <div
      className="create-choice-grid grid grid-cols-2 gap-3 max-sm:grid-cols-1"
      role="group"
      aria-label="GitHub setup method"
    >
      <button
        type="button"
        className={cn(
          'create-choice aria-pressed:border-accent aria-pressed:inset-ring-1',
          'flex min-w-0 flex-col items-start justify-start p-3.5 aria-pressed:bg-accent/5',
          'rounded-lg border border-line bg-surface px-3 py-2.75 text-left',
          'group whitespace-normal shadow-none inset-ring-accent',
        )}
        aria-pressed={method === 'cli'}
        onClick={() => onSelect('cli')}
      >
        <strong className="text-xs font-semibold group-aria-pressed:text-accent">GitHub CLI</strong>
        <span className="mt-0.75 text-xs leading-snug text-muted">{cliDescription}</span>
      </button>
      <button
        type="button"
        className={cn(
          'create-choice aria-pressed:border-accent aria-pressed:inset-ring-1',
          'flex min-w-0 flex-col items-start justify-start p-3.5 aria-pressed:bg-accent/5',
          'rounded-lg border border-line bg-surface px-3 py-2.75 text-left',
          'group whitespace-normal shadow-none inset-ring-accent',
        )}
        aria-pressed={method === 'token'}
        onClick={() => onSelect('token')}
      >
        <strong className="text-xs font-semibold group-aria-pressed:text-accent">
          Registration Token
        </strong>
        <span className="mt-0.75 text-xs leading-snug text-muted">
          Register a runner without GitHub login.
        </span>
      </button>
    </div>
  );
}
