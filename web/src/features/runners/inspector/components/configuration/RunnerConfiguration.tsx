import type { Runner } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';

interface RunnerConfigurationProps {
  runner: Runner;
}
export function RunnerConfiguration({ runner: r }: RunnerConfigurationProps) {
  let scopeLabel = 'Organization';
  if (r.target.kind === 'repo') scopeLabel = 'Repository';
  let githubStatus = (r.github_status || 'unknown').replaceAll('_', ' ');
  if (r.local_status === 'stopped' && r.github_status === 'online')
    githubStatus = 'Online · awaiting GitHub update';
  let startupLabel = 'Disabled';
  if (r.enabled) startupLabel = 'Enabled';
  const details = [
    ['Target', r.target.name],
    ['Scope', scopeLabel],
    ['Installed', r.version || 'Not installed'],
    ['Local state', (r.local_status || 'unknown').replaceAll('_', ' ')],
    ['GitHub', githubStatus],
    ['Login startup', startupLabel],
  ];
  return (
    <details
      className={cn(
        'detail-section runner-configuration mx-0 mb-3 border-t border-t-line px-4.5',
        'py-3.75',
      )}
    >
      <summary className="cursor-pointer text-xs font-medium">Configuration & location</summary>
      <dl className="mt-4">
        {details.map(([label, value]) => (
          <div
            className={cn(
              'detail-row mb-2.75 grid grid-cols-[--spacing(19)_minmax(0,_1fr)] items-baseline',
              'gap-2.5 last:mb-0 max-md:grid-cols-[--spacing(22.5)_minmax(0,_1fr)]',
            )}
            key={label}
          >
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div
        className={cn(
          'location mt-3.5 border-t font-mono text-xs leading-relaxed wrap-anywhere',
          'border-t-line pt-3',
        )}
      >
        {r.path}
      </div>
    </details>
  );
}
