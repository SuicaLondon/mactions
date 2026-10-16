import { useCopyText } from '../../../../shared/hooks/use-copy-text';
import { cn } from '../../../../shared/lib/cn';
import { ModalDialog } from '../../../../shared/ui/dialog/components/ModalDialog';

export function StorageDialog({ path, onClose }: { path: string; onClose: () => void }) {
  const { state, copy } = useCopyText();
  const copied = state === 'copied';
  return (
    <ModalDialog onClose={onClose}>
      {(titleId) => (
        <>
          <h2 id={titleId}>Data directory</h2>
          <p className="mx-0 mt-0 mb-4 text-xs/relaxed text-muted">
            Runner installations, workspaces, and logs are stored here.
          </p>
          <code
            id="data-dir"
            className={cn(
              'block rounded-md border border-line bg-surface p-3 font-mono text-xs',
              'leading-relaxed wrap-anywhere select-all',
            )}
          >
            {path}
          </code>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="mr-auto min-w-19.5 text-xs"
              aria-label="Copy path"
              onClick={() => void copy(path)}
            >
              {/* Both labels share one grid cell so the button keeps its width. */}
              <span className="inline-grid justify-items-center">
                <span className={cn('col-start-1 row-start-1', { invisible: copied })}>
                  Copy path
                </span>
                <span
                  className={cn('col-start-1 row-start-1', { invisible: !copied })}
                  aria-hidden="true"
                >
                  Copied
                </span>
              </span>
            </button>
            <button type="button" className="min-w-19.5 text-xs" onClick={onClose}>
              Done
            </button>
          </div>
          <p className="sr-only" role="status">
            {copied && 'Path copied.'}
          </p>
          {/* Below the actions, so a failure never moves the button the user just pressed. */}
          {state === 'failed' && (
            <p className="mx-0 mt-3 mb-0 text-xs/normal text-danger" role="alert">
              Could not copy the path. Select it and copy it manually.
            </p>
          )}
        </>
      )}
    </ModalDialog>
  );
}
