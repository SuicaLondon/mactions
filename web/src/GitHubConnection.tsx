import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './api';
import { RUNNERS_KEY, usePageVisible } from './use-runners';
import type { Connection, LoginAttempt } from './types';

export const CONNECTION_KEY = ['github-connection'];
export function useConnection() {
  const visible = usePageVisible();
  return useQuery({ queryKey: CONNECTION_KEY, queryFn: ({ signal }) => request<Connection>('/api/github/connection', undefined, signal), enabled: visible, staleTime: 30_000, refetchInterval: visible ? 60_000 : false });
}
export function GitHubStatus({ interactive = true, onOpen }: { interactive?: boolean; onOpen: () => void }) {
  const connection = useConnection();
  const unavailable = connection.isError || connection.data?.state === 'unavailable';
  const label = connection.isPending ? 'GitHub CLI · Checking…' : connection.data?.connected ? `GitHub CLI · @${connection.data.login}` : unavailable ? 'GitHub CLI · Status unavailable' : 'GitHub CLI · Not connected';
  const title = connection.data?.connected ? `Using @${connection.data.login} from GitHub CLI on this Mac. Open account settings.` : unavailable ? 'Unable to verify GitHub CLI status. Open settings to check again.' : 'Uses GitHub CLI on the Mac running mactions.';
  const content = <><span className={`connection-dot ${connection.data?.connected ? 'connected' : ''}`} aria-hidden="true"/><span>{label}</span></>;
  return interactive && !connection.isPending ? <button className="github-status" title={title} onClick={onOpen}>{content}</button> : <span className="github-status" title={title}>{content}</span>;
}
export function GitHubConnection({ guide = false, onUseToken, onContinueLocal }: { guide?: boolean; onUseToken?: () => void; onContinueLocal?: () => void }) {
  const connection = useConnection();
  const visible = usePageVisible();
  const client = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [organizationScope, setOrganizationScope] = useState(false);
  const handled = useRef(false);
  const auth = useQuery({ queryKey: ['github-auth'], queryFn: ({ signal }) => request<LoginAttempt>('/api/github/auth', undefined, signal), enabled: visible, refetchInterval: q => visible && q.state.data?.status === 'pending' ? 1500 : false });
  const connect = useMutation({ mutationFn: () => request<LoginAttempt>('/api/github/auth', { organization_scope: organizationScope }), onSuccess: data => { handled.current = false; client.setQueryData(['github-auth'], data); setExpanded(true); }, gcTime: 0 });
  const cancel = useMutation({ mutationFn: () => request<LoginAttempt>('/api/github/auth/cancel', {}), onSuccess: data => client.setQueryData(['github-auth'], data), gcTime: 0 });
  const pending = auth.data?.status === 'pending';
  const needsConnection = connection.isSuccess && !connection.data.connected && connection.data.state !== 'unavailable';
  const showGuide = guide && needsConnection && !dismissed;
  const showContent = expanded || pending || showGuide;
  useEffect(() => {
    if (auth.data?.status === 'complete' && !handled.current) {
      handled.current = true;
      setExpanded(false);
      setDismissed(false);
      void client.invalidateQueries({ queryKey: CONNECTION_KEY });
      void client.invalidateQueries({ queryKey: RUNNERS_KEY });
      void client.invalidateQueries({ queryKey: ['targets'] });
      void client.invalidateQueries({ queryKey: ['capabilities'] });
      void client.invalidateQueries({ queryKey: ['jobs'] });
    }
  }, [auth.data?.status, client]);
  return <section className="github-connection" aria-label="GitHub connection">
    <div className="connection-summary"><span className={`connection-dot ${connection.data?.connected ? 'connected' : ''}`}/>
      <span>{connection.isPending ? 'Checking GitHub…' : connection.data?.connected ? `Connected as @${connection.data.login}` : connection.isError ? 'Unable to check GitHub connection' : 'GitHub connection needs attention'}</span>
      <button type="button" className="text-button" onClick={() => { setExpanded(!showContent); setDismissed(showContent); }} aria-expanded={Boolean(showContent)}>{showContent ? 'Hide' : connection.data?.connected ? 'Connection settings' : 'Connect GitHub'}</button>
      <button type="button" className="text-button" disabled={connection.isFetching} onClick={() => { void client.invalidateQueries({ queryKey: CONNECTION_KEY }); void client.invalidateQueries({ queryKey: ['capabilities'] }); void client.invalidateQueries({ queryKey: RUNNERS_KEY }); }}>Check again</button>
    </div>
    {showContent ? <div className="connection-content">
      {showGuide ? <h2>Connect GitHub to get started</h2> : null}
      <p>{connection.data?.connected ? 'Uses the GitHub CLI account on this Mac. GitHub permissions are checked separately for each target.' : 'mactions uses GitHub CLI (gh) on this Mac. Connect GitHub to choose repositories, register runners, and view jobs.'}</p>
      {!pending ? <>
        <label className="checkbox-label"><input type="checkbox" checked={organizationScope} onChange={e => setOrganizationScope(e.target.checked)}/>Request organization runner management access</label>
        <button type="button" className="primary" disabled={connect.isPending} onClick={() => connect.mutate()}>{connect.isPending ? 'Starting…' : connection.data?.connected ? 'Authorize GitHub again' : 'Start GitHub authorization'}</button>
      </> : <div className="device-flow">
        <p>Open GitHub on your own computer or phone and enter this code. Keep this page open while authorizing.</p>
        <code className="device-code">{auth.data?.code ?? 'Waiting for a device code…'}</code>
        {auth.data?.code ? <a href="https://github.com/login/device" target="_blank" rel="noreferrer">Open GitHub ↗</a> : null}
        <button type="button" className="text-button" disabled={cancel.isPending} onClick={() => cancel.mutate()}>Cancel authorization</button>
      </div>}
      {!pending && needsConnection ? <>
        <p>Authorize in the browser on your own computer or phone. This also works over SSH, a local network, or Tailscale.</p>
        <details className="terminal-login"><summary>Prefer the terminal?</summary><p>On the Mac running mactions, use the same OS user to run:</p><code>gh auth login --hostname github.com --web</code><p>Then select Check again above. An existing gh login is detected automatically.</p></details>
        {guide ? <div className="connection-alternatives"><button type="button" className="text-button" onClick={() => { setDismissed(true); setExpanded(false); onContinueLocal?.(); }}>Continue with local controls</button>{onUseToken ? <button type="button" className="text-button" onClick={onUseToken}>Use a registration token instead</button> : null}<p className="detail-help">Local start, stop, and logs do not require GitHub login. A registration token can add a runner without connecting an account.</p></div> : null}
      </> : null}
      {auth.data?.status === 'failed'  || auth.data?.status === 'expired' ? <p className="error-message">Authorization {auth.data.status}. Try again, or run mactions auth login in the host terminal.</p> : null}
      {connect.error || cancel.error || connection.error ? <p className="error-message">{(connect.error || cancel.error || connection.error)?.message}</p> : null}
      {!connection.data?.connected && connection.data?.message ? <p className="detail-help">{connection.data.message}</p> : null}
    </div> : null}
  </section>;
}
