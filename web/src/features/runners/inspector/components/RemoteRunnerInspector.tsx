import { cn } from '../../../../shared/lib/cn';
import { type RunnerSelection } from '../../list/models/runner-list';
import { RunnerStatus } from '../../shared/components/RunnerStatus';
import { remoteStatusFor } from '../../shared/models/runner-model';

export function RemoteRunnerInspector({ runner }: { runner: RunnerSelection }) {
  const remote = runner.remote;
  const status = remoteStatusFor(remote);
  let deviceMessage = 'This runner is not managed on this device.';
  if (remote?.device === 'other_device') deviceMessage = 'This runner is on another device.';
  let hosting = 'Unknown';
  if (remote?.host_type === 'self-hosted') hosting = 'Self-hosted';
  else if (remote?.host_type === 'github-hosted') hosting = 'GitHub-hosted';
  return (
    <div>
      <div className="mx-0 mb-1.5 p-4.5 pt-5.75 pb-4.5 text-left max-md:p-4.5">
        <h3 className="mt-0 text-sm font-semibold wrap-anywhere">{runner.name}</h3>
        <RunnerStatus label={status.text} state={status.style} />
      </div>
      <section className="mx-0 mb-3 border-t border-t-line px-4.5 py-3.75">
        <p className="mx-0 mt-2 mb-0 text-xs/normal text-muted">
          {deviceMessage} Runner management is read-only here.
        </p>
        {/* One gap separates the help text and every row, so the list reads evenly. */}
        <dl className="mt-2.75 flex flex-col gap-2.75">
          <div className="flex items-baseline gap-2.5">
            <dt className="w-19 shrink-0 max-md:w-22.5">Hosting</dt>
            <dd className="min-w-0 flex-1">{hosting}</dd>
          </div>
          <div className="flex items-baseline gap-2.5">
            <dt className="w-19 shrink-0 max-md:w-22.5">GitHub ID</dt>
            <dd className="min-w-0 flex-1">{runner.githubId ?? 'Unknown'}</dd>
          </div>
        </dl>
      </section>
      <section className="mx-0 mb-3 border-t border-t-line px-4.5 py-3.75">
        <h4 className="mt-0 text-xs font-semibold">Labels</h4>
        <div className="flex flex-wrap gap-1.25">
          {remote?.labels.map((label) => (
            <span
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-md border border-line',
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
