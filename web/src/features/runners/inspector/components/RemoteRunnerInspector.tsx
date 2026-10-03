import { cn } from '../../../../shared/lib/cn';
import { type RunnerSelection } from '../../list/models/runner-list';
import { RunnerStatus } from '../../shared/components/RunnerStatus';

export function RemoteRunnerInspector({ runner }: { runner: RunnerSelection }) {
  const remote = runner.remote;
  let statusLabel = remote?.status || 'Unknown';
  if (remote?.busy) statusLabel = 'Busy';
  let statusState = '';
  if (remote?.status === 'online') {
    statusState = 'online';
    if (remote.busy) statusState = 'busy';
  }
  let deviceMessage = 'This runner is not managed on this device.';
  if (remote?.device === 'other_device') deviceMessage = 'This runner is on another device.';
  let hosting = 'Unknown';
  if (remote?.host_type === 'self-hosted') hosting = 'Self-hosted';
  else if (remote?.host_type === 'github-hosted') hosting = 'GitHub-hosted';
  return (
    <div>
      <div className="identity mx-0 mb-1.5 px-4.5 py-4.5 pt-5.75 pb-4.5 text-left max-md:p-4.5">
        <h3 className="mt-0 text-sm font-semibold wrap-anywhere">{runner.name}</h3>
        <RunnerStatus label={statusLabel} state={statusState} />
      </div>
      <section className="detail-section mx-0 mb-3 border-t border-t-line px-4.5 py-3.75">
        <p className="detail-help mx-0 mt-2 mb-0 text-xs leading-normal text-muted">
          {deviceMessage} Runner management is read-only here.
        </p>
        <dl>
          <div
            className={cn(
              'detail-row mb-2.75 grid grid-cols-[--spacing(19)_minmax(0,_1fr)] items-baseline',
              'gap-2.5 last:mb-0 max-md:grid-cols-[--spacing(22.5)_minmax(0,_1fr)]',
            )}
          >
            <dt>Hosting</dt>
            <dd>{hosting}</dd>
          </div>
          <div
            className={cn(
              'detail-row mb-2.75 grid grid-cols-[--spacing(19)_minmax(0,_1fr)] items-baseline',
              'gap-2.5 last:mb-0 max-md:grid-cols-[--spacing(22.5)_minmax(0,_1fr)]',
            )}
          >
            <dt>GitHub ID</dt>
            <dd>{runner.githubId ?? 'Unknown'}</dd>
          </div>
        </dl>
      </section>
      <section className="detail-section mx-0 mb-3 border-t border-t-line px-4.5 py-3.75">
        <h4 className="mt-0 text-xs font-semibold">Labels</h4>
        <div className="labels flex flex-wrap gap-1.25">
          {remote?.labels.map((label) => (
            <span
              className={cn(
                'label inline-flex max-w-full items-center gap-1 rounded-md border border-line',
                'bg-surface px-1.5 py-0.75 text-xs wrap-anywhere',
              )}
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
