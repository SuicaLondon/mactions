import { cn } from '../../../../shared/lib/cn';
import { RunnerDialog } from './RunnerDialog';

export function StorageDialog({ path, onClose }: { path: string; onClose: () => void }) {
  return (
    <RunnerDialog title="Data Directory" onClose={onClose}>
      {(titleId) => (
        <>
          <h2 id={titleId}>Data Directory</h2>
          <p className="dialog-description mx-0 mt-0 mb-4 text-xs leading-relaxed text-muted">
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
          <p className="form-help mx-0 my-3.5 text-xs leading-relaxed text-muted">
            Closing this web interface leaves runners running.
          </p>
          <div className="dialog-actions mt-6 flex justify-end gap-2">
            <button className="primary min-w-19.5 text-xs" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      )}
    </RunnerDialog>
  );
}
