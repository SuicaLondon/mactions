import { type ReactNode } from 'react';

import { cn } from '../../../../shared/lib/cn';
import { CheckIcon } from '../../../../shared/ui/icons/CheckIcon';
import { LockIcon } from '../../../../shared/ui/icons/LockIcon';
import { type GitHubPermission } from '../../models/github-permissions';

export function GitHubPermissionList({ permissions }: { permissions: GitHubPermission[] }) {
  return (
    <ul className="m-0 flex list-none flex-col p-0" aria-label="What mactions can do">
      {permissions.map((permission) => {
        let icon = <LockIcon className="mt-px size-3.5 text-muted" aria-hidden="true" />;
        if (permission.state === 'granted') {
          icon = <CheckIcon className="mt-px size-3.5 text-activity-success" aria-hidden="true" />;
        }
        let state: ReactNode = (
          <>
            Needs <code className="font-mono">{permission.scopes[0]}</code>
          </>
        );
        if (permission.state === 'granted') state = 'Allowed';
        else if (permission.state === 'unknown') state = 'Checked per target';
        return (
          <li
            key={permission.id}
            className={cn(
              'flex items-start gap-x-2.5 border-t border-t-line py-2.5',
              'first:border-t-0 first:pt-0',
            )}
          >
            {icon}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs font-medium">{permission.title}</span>
              <span className="text-xs/snug text-muted">{permission.detail}</span>
            </div>
            <span className="text-xs whitespace-nowrap text-muted">{state}</span>
          </li>
        );
      })}
    </ul>
  );
}
