import { cn } from '../../../../../shared/lib/cn';

interface ConnectionAlternativesProps {
  welcome: boolean;
  onContinueLocal: () => void;
  onUseToken?: () => void;
}

export function ConnectionAlternatives({
  welcome,
  onContinueLocal,
  onUseToken,
}: ConnectionAlternativesProps) {
  return (
    <div
      className={cn('connection-alternatives mt-3 flex flex-wrap gap-x-4 gap-y-2', {
        'm-0': welcome,
      })}
    >
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
      <p className="detail-help m-0 w-full text-xs leading-relaxed text-muted">
        Local start, stop, and logs do not require GitHub login. A registration token can add a
        runner without connecting an account.
      </p>
    </div>
  );
}
