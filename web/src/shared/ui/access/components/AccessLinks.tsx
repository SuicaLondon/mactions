import type { Capabilities } from '../../../api/types';
import { cn } from '../../../lib/cn';

export function AccessLinks({
  links,
  stacked = false,
}: {
  links: Capabilities['links'];
  stacked?: boolean;
}) {
  return (
    <div
      className={cn('access-links mx-0 mb-3.5 flex flex-wrap text-xs', {
        'mt-0 flex-col gap-2': stacked,
        'mt-3 gap-3': !stacked,
      })}
    >
      {links.map((link) => (
        <a
          className="wrap-anywhere"
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noreferrer"
        >
          {link.label} ↗
        </a>
      ))}
    </div>
  );
}
