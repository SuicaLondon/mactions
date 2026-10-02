import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { request } from './api';
import { AccessLinks, CapabilityList } from './Capabilities';
import { usePageVisible } from './use-runners';
import type { Capabilities } from './types';

export function RunnerAccess({ runnerId, connected }: { runnerId: number; connected: boolean }) {
  const [open, setOpen] = useState(false);
  const visible = usePageVisible();
  const access = useQuery({
    queryKey: ['capabilities', runnerId],
    queryFn: ({ signal }) => request<Capabilities>(`/api/runners/${runnerId}/capabilities`, undefined, signal),
    enabled: open && visible && connected,
    staleTime: 30_000,
  });
  return <details className="detail-section runner-access" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>GitHub access</summary>
    {open ? <div className="runner-access-content">
      {!connected ? <p className="detail-help">Connect GitHub CLI from the account status in the header to check access.</p> : <>
        {access.isPending ? <p className="detail-help" role="status">Checking GitHub access…</p> : null}
        {access.error ? <p className="error-message" role="alert">{access.error.message}</p> : access.data ? <><CapabilityList data={access.data}/><AccessLinks links={access.data.links}/></> : null}
        <button className="text-button" disabled={access.isFetching} onClick={() => void access.refetch()}>Check access again</button>
      </>}
    </div> : null}
  </details>;
}
