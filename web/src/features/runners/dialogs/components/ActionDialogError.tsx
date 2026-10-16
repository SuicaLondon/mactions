import { cn } from '../../../../shared/lib/cn';

/** A failed action below the dialog's buttons, saying whether the entries are kept. */
export function ActionDialogError({
  message,
  keepsEntries,
}: {
  message: string;
  keepsEntries: boolean;
}) {
  let hint = 'Try again, or cancel.';
  if (keepsEntries) hint = 'Your entries are kept. Try again, or cancel.';
  return (
    <div
      role="alert"
      className={cn(
        'mx-0 mt-4 mb-0 rounded-md border border-danger/20 bg-danger/4',
        'px-3 py-2.5 text-xs/normal wrap-anywhere whitespace-pre-wrap',
      )}
    >
      <p className="m-0 text-danger">{message}</p>
      <p className="mx-0 mt-1 mb-0 text-muted">{hint}</p>
    </div>
  );
}
