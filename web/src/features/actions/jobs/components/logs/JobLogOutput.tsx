import { type ReactNode } from 'react';

import { type JobLogs } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { JobLogLoading } from './JobLogLoading';

/**
 * Chooses the log area for the request state: loading, waiting for GitHub, a status message,
 * or the available output given as `children`.
 */
export function JobLogOutput({
  data,
  pending,
  failed,
  recorded,
  fill,
  children,
}: {
  data: JobLogs | undefined;
  pending: boolean;
  failed: boolean;
  /** Recorded replay output, which waits on the recording rather than on GitHub. */
  recorded: boolean;
  fill: boolean;
  /** The output, shown once the log is available. */
  children: ReactNode;
}) {
  if (pending && !failed) {
    return (
      <JobLogLoading
        key="fetch"
        message="Fetching log from GitHub…"
        slowMessage="Still fetching from GitHub…"
        fill={fill}
      />
    );
  }
  if (data?.state === 'pending' && !failed) {
    let message = 'Waiting for GitHub to publish this log…';
    if (recorded) message = data.message || 'No recorded output yet.';
    return <JobLogLoading key="publish" message={message} fill={fill} />;
  }
  if (data?.state !== 'available') {
    if (failed && !data) return null;
    return (
      <p
        className={cn('m-0 px-4 py-3.5 text-xs/relaxed wrap-anywhere', 'text-slate-300')}
        role="status"
      >
        {data?.message || 'Log output is not available yet.'}
      </p>
    );
  }
  return (
    <>
      {/* GitHub's note about available output, such as a truncated or partial log. */}
      {!!data.message && (
        <p
          className={cn('m-0 shrink-0 px-4 pt-3.5 text-xs/relaxed wrap-anywhere', 'text-slate-300')}
        >
          {data.message}
        </p>
      )}
      {children}
    </>
  );
}
