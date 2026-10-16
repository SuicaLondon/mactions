import type { Capabilities, Capability } from '../../../../../shared/api/types';
import { capabilityLabels } from '../../models/capabilities';

/** Whether GitHub allows reading status, reading jobs, and managing the runner. */
export function CapabilityList({ capabilities }: { capabilities: Capabilities }) {
  const rows: [string, Capability][] = [
    ['Runner status', capabilities.runner_status],
    ['Workflow jobs', capabilities.jobs],
    ['Runner management', capabilities.manage],
  ];
  return (
    <dl className="mx-0 mb-3 px-0">
      {rows.map(([label, capability]) => (
        <div key={label} className="border-b border-line py-2.25">
          <dt className="mb-1 text-xs">{label}</dt>
          <dd className="text-xs">
            {capabilityLabels[capability.state]}
            {!!capability.message && (
              <p className="mx-0 mt-2 mb-0 text-xs/normal text-muted">{capability.message}</p>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
