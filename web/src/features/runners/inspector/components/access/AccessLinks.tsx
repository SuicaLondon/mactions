import type { Capabilities } from '../../../../../shared/api/types';

/** GitHub pages for fixing access, such as the account's application access and the runner's target. */
export function AccessLinks({ links }: { links: Capabilities['links'] }) {
  return (
    <div className="mx-0 mb-3.5 flex flex-col flex-wrap gap-2 text-xs">
      {links.map((link) => (
        <a
          className="wrap-anywhere max-md:inline-flex max-md:min-h-10 max-md:items-center"
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
