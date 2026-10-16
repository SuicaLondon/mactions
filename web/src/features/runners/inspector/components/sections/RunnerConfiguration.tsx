import { Fragment } from 'react';

import type { Runner } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';

interface RunnerConfigurationProps {
  runner: Runner;
}
export function RunnerConfiguration({ runner }: RunnerConfigurationProps) {
  let scopeLabel = 'Organization';
  if (runner.target.kind === 'repo') scopeLabel = 'Repository';
  let githubStatus = (runner.github_status || 'unknown').replaceAll('_', ' ');
  if (runner.local_status === 'stopped' && runner.github_status === 'online')
    githubStatus = 'Online · awaiting GitHub update';
  let startupLabel = 'Disabled';
  if (runner.enabled) startupLabel = 'Enabled';
  // Offer line breaks after each separator so long paths wrap between directory names.
  const pathSegments = runner.path.split(/(?<=\/)/);
  const details = [
    ['Target', runner.target.name],
    ['Scope', scopeLabel],
    ['Installed', runner.version || 'Not installed'],
    ['Local state', (runner.local_status || 'unknown').replaceAll('_', ' ')],
    ['GitHub', githubStatus],
    ['Login startup', startupLabel],
  ];
  return (
    <details className={cn('mx-0 mb-3 border-t border-t-line px-4.5', 'py-3.75')}>
      <summary className="cursor-pointer text-xs font-medium">Configuration & location</summary>
      <dl className="mt-4">
        {details.map(([label, value]) => (
          <div className="mb-2.75 flex items-baseline gap-2.5 last:mb-0" key={label}>
            <dt className="w-19 shrink-0 max-md:w-22.5">{label}</dt>
            <dd className="min-w-0 flex-1">{value}</dd>
          </div>
        ))}
      </dl>
      <div
        className={cn(
          'mt-3.5 border-t font-mono text-xs/relaxed wrap-break-word',
          'border-t-line pt-3',
        )}
      >
        {pathSegments.map((segment, index) => (
          // eslint-disable-next-line react-x/no-array-index-key -- Segments are fixed slices of one path.
          <Fragment key={index}>
            {segment}
            <wbr />
          </Fragment>
        ))}
      </div>
    </details>
  );
}
