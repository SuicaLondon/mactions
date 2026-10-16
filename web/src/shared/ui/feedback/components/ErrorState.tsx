import { cn } from '../../../lib/cn';

const toneClasses = {
  default: { title: 'text-foreground', message: 'text-muted' },
  dark: { title: 'text-slate-100', message: 'text-slate-300' },
};

/** Fills a content area when a request failed before any data could be shown. */
export function ErrorState({
  title,
  error,
  onRetry,
  retrying = false,
  tone = 'default',
  className,
}: {
  title: string;
  error: Error;
  onRetry: () => void;
  retrying?: boolean;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 p-5',
        'text-center text-xs',
        className,
      )}
    >
      <p className={cn('m-0 text-base font-semibold', toneClasses[tone].title)}>{title}</p>
      <p
        className={cn(
          'm-0 max-w-120 leading-normal wrap-anywhere whitespace-pre-wrap',
          toneClasses[tone].message,
        )}
      >
        {error.message}
      </p>
      <button type="button" className="mt-1 text-xs" disabled={retrying} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
