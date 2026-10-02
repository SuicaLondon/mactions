import type { Capabilities } from './types';
export function CapabilityList({ data }: { data: Capabilities }) {
  return <dl className="capability-list">{([
    ['Runner status', data.runner_status], ['Workflow jobs', data.jobs], ['Runner management', data.manage],
  ] as const).map(([label, capability]) => <div key={label}><dt>{label}</dt><dd><span className={`capability-${capability.state}`}>{capability.state === 'available' ? 'Available' : capability.state === 'unavailable' ? 'Unavailable' : 'Not confirmed'}</span>{capability.message ? <p className="detail-help">{capability.message}</p> : null}</dd></div>)}</dl>;
}
export function AccessLinks({ links }: { links: Capabilities['links'] }) {
  return <div className="access-links">{links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</div>;
}
