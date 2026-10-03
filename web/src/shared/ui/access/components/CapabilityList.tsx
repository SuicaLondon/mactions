import type { Capabilities } from '../../../api/types';
import { cn } from '../../../lib/cn';
import { capabilityLabels } from '../models/capabilities';
import { capabilityClasses } from '../models/capabilities';

export function CapabilityList({
  data,
  stacked = false,
}: {
  data: Capabilities;
  stacked?: boolean;
}) {
  return (
    <dl className={cn('capability-list mx-0 mb-3 px-0', { 'mt-0': stacked, 'mt-3': !stacked })}>
      {(
        [
          ['Runner status', data.runner_status],
          ['Workflow jobs', data.jobs],
          ['Runner management', data.manage],
        ] as const
      ).map(([label, capability]) => (
        <div
          key={label}
          className={cn('border-b border-line', {
            'block py-2.25': stacked,
            'grid grid-cols-2 gap-3 py-1.75': !stacked,
          })}
        >
          <dt className={cn({ 'mb-1 text-xs': stacked })}>{label}</dt>
          <dd className={cn({ 'text-xs': stacked })}>
            <span className={cn(capabilityClasses[capability.state])}>
              {capabilityLabels[capability.state]}
            </span>
            {!!capability.message && (
              <p className="detail-help mx-0 mt-2 mb-0 text-xs leading-normal text-muted">
                {capability.message}
              </p>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
