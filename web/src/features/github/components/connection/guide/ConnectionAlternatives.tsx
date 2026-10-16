import { cn } from '../../../../../shared/lib/cn';
import type { ConnectionPanelVariant } from '../../../models/connection-panel';

const alternativesClasses: Record<ConnectionPanelVariant, string> = {
  banner: 'mt-3',
  card: 'm-0',
};

interface ConnectionAlternativesProps {
  variant: ConnectionPanelVariant;
  onContinueLocal: () => void;
  onUseToken?: () => void;
}

/** Ways to keep going without connecting: local controls, or a registration token. */
export function ConnectionAlternatives({
  variant,
  onContinueLocal,
  onUseToken,
}: ConnectionAlternativesProps) {
  return (
    <div className={cn('flex flex-wrap gap-x-4 gap-y-2', alternativesClasses[variant])}>
      <button
        type="button"
        className="min-h-5.5 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
        onClick={onContinueLocal}
      >
        Continue with local controls
      </button>
      {!!onUseToken && (
        <button
          type="button"
          className="min-h-5.5 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
          onClick={onUseToken}
        >
          Use a registration token instead
        </button>
      )}
      <p className="m-0 w-full text-xs/relaxed text-muted">
        Local start, stop, and logs do not require GitHub login. A registration token can add a
        runner without connecting an account.
      </p>
    </div>
  );
}
