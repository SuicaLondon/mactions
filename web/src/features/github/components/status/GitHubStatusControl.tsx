import type { ReactNode } from 'react';

import { cn } from '../../../../shared/lib/cn';
import type { useConnection } from '../../hooks/connection/use-connection';

export function GitHubStatusControl({
  interactive,
  connection,
  title,
  onOpen,
  content,
}: {
  interactive: boolean;
  connection: ReturnType<typeof useConnection>;
  title: string;
  onOpen: () => void;
  content: ReactNode;
}) {
  if (interactive && !connection.isPending)
    return (
      <button
        className={cn(
          'github-status inline-flex min-h-7 max-w-60 min-w-0 items-center gap-1.5',
          'rounded-md border-0 bg-transparent px-2 py-1 text-xs text-muted shadow-none',
          'enabled:hover:bg-muted/10 max-md:max-w-37.5 max-md:pl-0 max-sm:max-w-8',
          'max-sm:p-1',
        )}
        title={title}
        onClick={onOpen}
      >
        {content}
      </button>
    );
  return (
    <span
      className={cn(
        'github-status inline-flex min-h-7 max-w-60 min-w-0 items-center gap-1.5',
        'rounded-md border-0 bg-transparent px-2 py-1 text-xs text-muted shadow-none',
        'enabled:hover:bg-muted/10 max-md:max-w-37.5 max-md:pl-0 max-sm:max-w-8',
        'max-sm:p-1',
      )}
      title={title}
    >
      {content}
    </span>
  );
}
