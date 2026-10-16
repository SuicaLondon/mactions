import { cn } from '../../../../shared/lib/cn';
import { linkButtonClassName } from '../../../../shared/ui/controls/buttons/link-button-class';
import { PendingLabel } from '../../../../shared/ui/controls/buttons/PendingLabel';
import { ExternalLinkIcon } from '../../../../shared/ui/icons/ExternalLinkIcon';
import { InlineLoading } from '../../../../shared/ui/loading/components/InlineLoading';

/** The device flow row; on phones it wraps, and its container reserves that height. */
export function DeviceCodeRow({
  code,
  canceling,
  onCancel,
}: {
  code: string | null;
  canceling: boolean;
  onCancel: () => void;
}) {
  let deviceCode = <InlineLoading label="Waiting for a device code…" className="h-7 w-28" />;
  if (code) {
    deviceCode = (
      <code
        className={cn(
          'rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-semibold',
          'tracking-widest',
          'select-all',
        )}
      >
        {code}
      </code>
    );
  }
  return (
    <div className="flex min-h-7 w-full flex-wrap items-center gap-3">
      {deviceCode}
      <a
        className="inline-flex items-center gap-1"
        href="https://github.com/login/device"
        target="_blank"
        rel="noreferrer"
      >
        Open GitHub
        <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
      </a>
      {/* A link-style button keeps the row on one line on phones. */}
      <button
        type="button"
        className={cn(linkButtonClassName, 'ml-auto min-h-0')}
        disabled={canceling}
        onClick={onCancel}
      >
        <PendingLabel pending={canceling} idle="Cancel" busy="Canceling…" />
      </button>
    </div>
  );
}
