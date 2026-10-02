import type { ReactNode } from 'react';
const shapes: Record<string, ReactNode> = {
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  minus: <path d="M5 12h14"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  branch: <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10M18 7a10 10 0 0 1-10 10H6"/></>,
  external: <path d="M14 4h6v6M20 4 10 14M10 4H4v16h16v-6"/>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3M13 15h4"/></>,
  pause: <path d="M9 5v14M15 5v14"/>,
  server: <><rect x="4" y="3" width="16" height="7" rx="2"/><rect x="4" y="14" width="16" height="7" rx="2"/><path d="M8 6.5h.01M8 17.5h.01M12 6.5h4M12 17.5h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  refresh: <path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  play: <path d="m8 4 12 8-12 8Z"/>,
  stop: <rect x="5" y="5" width="14" height="14" rx="2"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  trash: <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>,
};
export function Icon({ name, className }: { name: string; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true">{shapes[name]}</svg>;
}
