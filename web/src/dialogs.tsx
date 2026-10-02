import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './api';
import { TargetSelect } from './TargetSelect';
import { GitHubConnection, useConnection } from './GitHubConnection';
import { RUNNERS_KEY } from './use-runners';
import { Icon } from './Icon';
import { runnerLabels, splitLabels } from './model';
import type { Action, Operation, Runner, Targets, TargetOption } from './types';

function Dialog({ title, children, onClose }: { title: string; children: (titleId: string) => ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} aria-label={title} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    {children(titleId)}
  </dialog>;
}

export function WelcomeDialog({ onClose, onUseToken }: { onClose: () => void; onUseToken: () => void }) {
  const connection = useConnection();
  const [method, setMethod] = useState<'cli' | 'token'>('cli');
  return <Dialog title="Welcome to mactions" onClose={onClose}>{titleId => <div className="welcome-content">
    <div className="dialog-heading"><h2 id={titleId}>Welcome to mactions</h2><p>{connection.data?.connected ? 'A GitHub account is already connected on this Mac.' : 'Choose how to set up your GitHub runners.'}</p></div>
    <div className="create-choice-grid" role="group" aria-label="GitHub setup method">
      <button type="button" className="create-choice" aria-pressed={method === 'cli'} onClick={() => setMethod('cli')}><strong>GitHub CLI</strong><span>{connection.data?.connected ? `Use @${connection.data.login} from this Mac.` : "Reuse this Mac's gh login or connect an account."}</span></button>
      <button type="button" className="create-choice" aria-pressed={method === 'token'} onClick={() => setMethod('token')}><strong>Registration Token</strong><span>Register a runner without GitHub login.</span></button>
    </div>
    {method === 'cli' ? <div className="welcome-method-details">
      {connection.data?.connected ? <>
        <section className="connected-account" aria-label="Connected GitHub account">
          <div className="connected-account-status"><span className="connection-dot connected"/>GitHub CLI connected</div>
          <strong className="connected-account-name">@{connection.data.login}</strong>
          <p>Using the existing gh login on the Mac running mactions. No additional login is needed.</p>
        </section>
        <p className="dialog-description">Use this account to register runners and view GitHub status and jobs. Available actions depend on its repository and organization permissions.</p>
      </> : <>
        <p className="dialog-description">Already ran gh auth login on this Mac? mactions can reuse that login for the same OS user. If you are connected over SSH or Tailscale, this means the Mac running mactions.</p>
        <GitHubConnection guide onContinueLocal={onClose}/>
      </>}
    </div> : <div className="dialog-description welcome-method-details">
      <p>Use a registration token from your repository or organization's GitHub Settings → Actions → Runners → New self-hosted runner. You will choose a target and enter the token next. mactions does not save the token.</p>
      <p><strong>Some features are limited without a GitHub connection.</strong> You can register a runner, start, stop, restart, and view local logs. GitHub runner status, workflow and job status, label editing, and GitHub deregistration require a GitHub connection with the appropriate permissions.</p>
      <p>You can connect GitHub CLI later. Choosing a registration token does not disconnect an existing GitHub account.</p>
    </div>}
    <div className="dialog-actions"><button type="button" onClick={onClose}>{connection.data?.connected ? 'Close' : 'Set up later'}</button>{method === 'token' ? <button type="button" className="primary" onClick={onUseToken}>Continue with registration token</button> : connection.data?.connected ? <button type="button" className="primary" onClick={onClose}>Use this account</button> : null}</div>
  </div>}</Dialog>;
}

export function CreateDialog({ onClose, locked, initializing = false, initialMode = 'automatic' }: { onClose: () => void; locked: boolean; initializing?: boolean; initialMode?: 'automatic' | 'token' }) {
  const client = useQueryClient();
  const connection = useConnection();
  const [step, setStep] = useState<1 | 2>(initialMode === 'token' ? 2 : 1);
  const [mode, setMode] = useState<'automatic' | 'token'>(initialMode);
  const [kind, setKind] = useState<'repo' | 'org'>('repo');
  const [target, setTarget] = useState('');
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<TargetOption[]>([]);
  const [token, setToken] = useState('');
  const [prefix, setPrefix] = useState('mactions');
  const [labels, setLabels] = useState('');
  const rawTarget = target.trim().replace(/\/+$/, '');
  const githubPath = rawTarget.replace(/^https:\/\/github\.com\//i, '');
  const normalized = kind === 'org' && rawTarget !== githubPath ? githubPath.replace(/^orgs\//i, '') : githubPath;
  const valid = kind === 'repo' ? /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(normalized) : /^[a-zA-Z0-9_.-]+$/.test(normalized);
  const usePicker = mode === 'automatic';
  const discovery = useQuery({ queryKey: ['targets', kind, page, connection.data?.login], queryFn: ({ signal }) => request<Targets>(`/api/github/targets?kind=${kind}&page=${page}`, undefined, signal), enabled: step === 2 && usePicker && Boolean(connection.data?.connected), staleTime: 60_000 });
  useEffect(() => { if (discovery.data) setOptions(old => page === 1 ? discovery.data!.items : [...old.filter(o => !discovery.data!.items.some(n => n.name === o.name)), ...discovery.data!.items]); }, [discovery.data, page]);
  const create = useMutation({ mutationFn: () => request('/api/runners', { kind, target: normalized, prefix, labels: splitLabels(labels), ...(mode === 'token' ? { registration_token: token } : {}) }), onSuccess: () => { setToken(''); onClose(); }, onSettled: () => { void client.invalidateQueries({ queryKey: RUNNERS_KEY }); }, gcTime: 0 });
  const busy = create.isPending;
  const waiting = initializing ? 'Loading runner state…' : locked ? 'Another runner operation is in progress. Waiting for it to finish…' : mode === 'automatic' && connection.isPending ? 'Checking GitHub connection…' : null;
  const connected = Boolean(connection.data?.connected);
  function changeKind(next: 'repo' | 'org') {
    if (kind === next) return;
    setKind(next); setTarget(''); setPage(1); setOptions([]);
  }
  return <Dialog title="Add Runner" onClose={() => { if (!create.isPending) onClose(); }}>{titleId => <form aria-busy={create.isPending} onSubmit={event => { event.preventDefault(); if (step === 2 && !busy && !locked && valid && (mode === 'token' ? Boolean(token.trim()) : connected)) create.mutate(); }}>
    <div className="dialog-heading"><h2 id={titleId}>Add Runner</h2><p>{create.isPending ? 'Creating and starting your runner…' : step === 1 ? 'Choose how to register this Mac.' : 'Choose a target. Next will create and start the runner.'}</p></div>
    {waiting && !create.isPending ? <div className="loading-notice" role="status"><span className="loading-spinner" aria-hidden="true"/>{waiting}</div> : null}
    <ol className="create-progress" aria-label="Add Runner steps">{(['Method', 'Target', 'Creating'] as const).map((label, index) => <li key={label} aria-current={(create.isPending ? 3 : step) === index + 1 ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    {step === 1 ? <div className="create-step">
    <h3>Registration Method</h3>
    <div className="create-choice-grid" role="group" aria-label="Registration method">
      <button type="button" className="create-choice" aria-label="GitHub Connection: mactions gets a token for you" aria-pressed={mode === 'automatic'} disabled={busy} onClick={() => { setMode('automatic'); }}><strong>GitHub Connection</strong><span>mactions gets a token for you</span></button>
      <button type="button" className="create-choice" aria-label="Registration Token: paste a one-time token from GitHub" aria-pressed={mode === 'token'} disabled={busy} onClick={() => { setMode('token'); }}><strong>Registration Token</strong><span>Paste a one-time token from GitHub</span></button>
    </div>
    {mode === 'automatic' ? connected ? <p className="detail-help create-step-help">Connected as @{connection.data?.login}. Continue to choose a target.</p> : <GitHubConnection/> : <p className="detail-help create-step-help">No GitHub login is required. You will enter a registration token in the final step.</p>}
    </div> : null}
    {step === 2 ? <div className="create-step" hidden={create.isPending}>
    <h3>Runner Scope</h3>
    <div className="create-choice-grid" role="group" aria-label="Runner scope">
      <button type="button" className="create-choice" aria-label="Repository: run jobs for one repository" aria-pressed={kind === 'repo'} disabled={busy} onClick={() => changeKind('repo')}><strong>Repository</strong><span>Run jobs for one repository</span></button>
      <button type="button" className="create-choice" aria-label="Organization: share across an organization" aria-pressed={kind === 'org'} disabled={busy} onClick={() => changeKind('org')}><strong>Organization</strong><span>Share across an organization</span></button>
    </div>
    <h3>{kind === 'repo' ? 'Repository' : 'Organization'}</h3>
    {usePicker ? <div className="target-selection">
      <TargetSelect kind={kind} options={options} value={target} onChange={setTarget} disabled={busy || !connected} loading={discovery.isFetching}/>
      <div className="target-select-status" aria-live="polite">
        {discovery.error ? <span>Could not load targets. Please retry.</span> : discovery.isPending ? <span>Loading your GitHub targets…</span> : <span>{options.length ? `${options.length} targets loaded` : 'No targets found for this GitHub account.'}</span>}
        {discovery.error ? <button type="button" className="text-button" disabled={discovery.isFetching || busy} onClick={() => { void discovery.refetch(); }}>Retry</button> : discovery.data?.next_page ? <button type="button" className="text-button" disabled={discovery.isFetching || busy} onClick={() => setPage(discovery.data!.next_page!)}>{discovery.isFetching ? 'Loading…' : 'Load More Targets'}</button> : null}
      </div>
    </div> : <div className="create-fields">
      <label htmlFor="target-name">{kind === 'repo' ? 'Repository' : 'Organization'}</label>
      <input id="target-name" name="target" value={target} onChange={e => setTarget(e.target.value)} disabled={busy} placeholder={kind === 'repo' ? 'owner/repository…' : 'organization…'} autoComplete="off" spellCheck={false} required aria-describedby="target-hint"/>
      <p id="target-hint" className="detail-help">{kind === 'repo' ? 'Enter owner/repository. You can also paste a GitHub repository URL.' : 'Enter the organization name. You can also paste its GitHub URL.'}</p>
      {target.trim() && !valid ? <p className="field-error">{kind === 'repo' ? 'Use owner/repository for a repository.' : 'Use the organization name for an organization.'}</p> : null}
    </div>}
    {mode === 'token' ? <div className="create-fields"><label htmlFor="registration-token">Registration token</label><input id="registration-token" name="registration_token" type="password" value={token} onChange={e => setToken(e.target.value.trim())} disabled={busy} required autoComplete="off" spellCheck={false}/><p className="detail-help">GitHub Settings → Actions → Runners → New self-hosted runner. Used once and not saved by mactions.</p></div> : null}
    <details className="advanced-settings"><summary>Advanced settings</summary><div className="create-fields">
      <label htmlFor="name-prefix">Name prefix</label><input id="name-prefix" name="prefix" value={prefix} onChange={e => setPrefix(e.target.value)} required maxLength={48} pattern="[a-zA-Z0-9_-]+" disabled={busy} spellCheck={false}/>
      <label htmlFor="custom-labels">Custom labels</label><input id="custom-labels" name="labels" value={labels} onChange={e => setLabels(e.target.value)} disabled={busy} placeholder="build, apple-silicon…" spellCheck={false}/>
      <p className="detail-help">A number is appended to the name. Separate labels with commas.</p>
    </div></details>
    {create.error ? <><p className="error-message">{create.error.message} If an incomplete runner appears, use Resume Setup before trying to create another.</p>{mode === 'automatic' ? <GitHubConnection/> : null}</> : null}

    </div> : null}
    {create.isPending ? <div className="loading-notice" role="status"><span className="loading-spinner" aria-hidden="true"/><div><strong>Setting up your runner</strong><p>Downloading, registering, and starting the runner. This may take a few minutes. Keep this window open.</p></div></div> : null}
    <div className="dialog-actions create-actions">
      {step > 1 ? <button type="button" className="create-back" disabled={create.isPending} onClick={() => setStep(1)}>Back</button> : null}
      <button type="button" disabled={create.isPending} onClick={onClose}>Cancel</button>
      {step === 1 ? <button type="button" className="primary" disabled={busy || (mode === 'automatic' && !connected)} onClick={() => setStep(2)}>Continue to Target</button>
        : <button type="submit" className="primary" disabled={busy || locked || !valid || (mode === 'token' ? !token.trim() : !connected)}>{create.isPending ? <><span className="loading-spinner" aria-hidden="true"/>Creating & Starting…</> : waiting ? 'Please wait…' : 'Next'}</button>}
    </div>
  </form>}</Dialog>;
}

export function ActionDialog({ runner, action, locked, onClose, onRun }: { runner: Runner; action: Action; locked: boolean; onClose: () => void; onRun: (op: Operation) => void }) {
  const editing = action === 'labels';
  const retrying = action === 'retry';
  const verb = action[0].toUpperCase() + action.slice(1);
  const title = `${editing ? 'Edit labels for' : verb} ${runner.name}?`;
  const description = action === 'delete' ? 'This interrupts any active job, removes the GitHub registration, and permanently deletes this runner’s installation, workspace, and logs. Shared tool caches stay in place.'
    : retrying ? 'Resume this runner’s incomplete setup. Use a fresh registration token if GitHub is not connected. Existing registration will be recovered when possible.'
    : editing ? 'Replace custom labels. Leave empty to clear them. GitHub’s default labels are read-only.'
    : `This begins shutdown immediately and may interrupt an active job.${action === 'stop' ? ' Files are preserved and the runner stays stopped until you start it again.' : ' The runner starts again after shutdown completes.'}`;
  return <Dialog title={title} onClose={onClose}>{titleId => <form onSubmit={event => {
    event.preventDefault();
    if (locked) return;
    const form = new FormData(event.currentTarget);
    const token = String(form.get('registration_token') || '').trim();
    const payload = editing ? { labels: splitLabels(String(form.get('labels'))) } : retrying ? (token ? { registration_token: token } : {}) : { confirm: true };
    onRun({ path: `/api/runners/${runner.id}/${action}`, payload, message: `${editing ? 'Updating labels for' : action === 'delete' ? 'Deleting' : action === 'stop' ? 'Stopping' : 'Restarting'} ${runner.name}…` });
  }}>
    <h2 id={titleId}>{title}</h2><p className="dialog-description">{description}</p>
    {editing ? <label id="label-field">Custom labels<input id="label-input" name="labels" autoFocus defaultValue={runnerLabels(runner).filter(l => l.type === 'custom').map(l => l.name).join(', ')} placeholder="Comma-separated labels" spellCheck={false}/></label> : null}
    {retrying ? <label className="create-fields">Registration token (optional)<input name="registration_token" type="password" autoComplete="off"/></label> : null}
    <div className="dialog-actions"><button type="button" autoFocus={!editing} onClick={onClose}>Cancel</button><button type="submit" className={`primary ${action === 'delete' ? 'danger' : ''}`} disabled={locked}>{editing ? 'Save labels' : verb}</button></div>
  </form>}</Dialog>;
}

export function StorageDialog({ path, onClose }: { path: string; onClose: () => void }) {
  return <Dialog title="Data Directory" onClose={onClose}>{titleId => <>
    <h2 id={titleId}>Data Directory</h2><p className="dialog-description">Runner installations, workspaces, and logs are stored here.</p><code id="data-dir">{path}</code><p className="form-help">Closing this web interface leaves runners running.</p><div className="dialog-actions"><button className="primary" onClick={onClose}>Done</button></div>
  </>}</Dialog>;
}
