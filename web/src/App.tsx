import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent, type CSSProperties } from 'react';
import { GitHubConnection, GitHubStatus, useConnection } from './GitHubConnection';
import { RunnerMenu } from './RunnerMenu';
import { RunnerActivity } from './RunnerActivity';
import { RunnerAccess } from './RunnerAccess';
import { Icon } from './Icon';
import { ActionDialog, CreateDialog, StorageDialog, WelcomeDialog } from './dialogs';
import { filterRunners, runnerLabels, statusFor } from './model';
import { useRunners } from './use-runners';
import type { Action, Filter, Operation, Runner } from './types';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All Runners' }, { value: 'active', label: 'Active' },
  { value: 'stopped', label: 'Stopped' }, { value: 'attention', label: 'Needs Attention' },
];
const EMPTY_RUNNERS: Runner[] = [];

function Status({ runner }: { runner: Runner }) {
  const status = statusFor(runner);
  return <span className={`status ${status.style}`}>{status.text}</span>;
}

const RunnerRow = memo(function RunnerRow({ runner, selected, onSelect, onMenu }: { runner: Runner; selected: boolean; onSelect: (id: number) => void; onMenu: (runner: Runner, x: number, y: number) => void }) {
  const labelText = runnerLabels(runner).filter(l => l.type === 'custom').map(l => l.name).join(', ');
  return <tr onContextMenu={event => { event.preventDefault(); onSelect(runner.id); event.currentTarget.focus(); onMenu(runner, event.clientX, event.clientY); }} onKeyDown={event => { if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); const box = event.currentTarget.getBoundingClientRect(); onMenu(runner, box.left + 24, box.bottom); } }} data-id={runner.id} tabIndex={selected ? 0 : -1} aria-selected={selected} onClick={event => { onSelect(runner.id); event.currentTarget.focus({ preventScroll: true }); }}>
    <td title={runner.name}><div className="runner-name"><Icon name="server" className="row-icon"/><span>{runner.name}</span></div></td>
    <td title={statusFor(runner).text}><Status runner={runner}/></td>
    <td title={runner.target.name}>{runner.target.name}</td>
    <td className="muted-cell" title={labelText}>{labelText || '—'}</td>
  </tr>;
});

function Inspector({ runner, locked, connected, onAction }: { runner: Runner | undefined; locked: boolean; connected: boolean; onAction: (r: Runner, action: Action) => void }) {
  if (!runner) return <div id="inspector-empty"><Icon name="info"/><p>Select a runner to view its<br/>configuration and controls.</p></div>;
  const r = runner;
  const unregistered = !r.github_id || r.deregistered;
  const action = r.local_status === 'stopped' ? 'start' : 'stop';
  const errors = [r.error, connected ? r.github_error : null, r.local_error].filter(Boolean);
  const details = [
    ['Target', r.target.name], ['Scope', r.target.kind === 'repo' ? 'Repository' : 'Organization'],
    ['Installed', r.version || 'Not installed'], ['Local state', (r.local_status || 'unknown').replaceAll('_', ' ')],
    ['GitHub', r.local_status === 'stopped' && r.github_status === 'online' ? 'Online · awaiting GitHub update' : (r.github_status || 'unknown').replaceAll('_', ' ')], ['Login startup', r.enabled ? 'Enabled' : 'Disabled'],
  ];
  return <div id="inspector-content">
    <div className="identity"><h3>{r.name}</h3><Status runner={r}/>
      <div className="runner-controls">
        <button disabled={locked || (action === 'start' && unregistered)} onClick={() => onAction(r, action)}><Icon name={action === 'start' ? 'play' : 'stop'}/>{action === 'start' ? 'Start' : 'Stop'}</button>
        <button disabled={locked || unregistered} onClick={() => onAction(r, 'restart')}><Icon name="refresh"/>Restart</button>
      </div>
    </div>
    {r.interrupted || (!r.github_id && !r.deregistered) ? <div className="recovery-note"><p>{r.interrupted ? 'An operation was interrupted. Retry the intended action.' : 'Setup is incomplete.'}</p>{!r.github_id && !r.deregistered ? <button disabled={locked} onClick={() => onAction(r, 'retry')}>Resume Setup</button> : null}</div> : null}
    {errors.length ? <section className="detail-section"><p className="error-message">{errors.join('\n')}</p></section> : null}
    <section className="detail-section"><div className="section-title"><h4>Labels</h4><button className="text-button" disabled={locked || unregistered || !connected} title={!connected ? "Connect GitHub to edit labels" : undefined} onClick={() => onAction(r, 'labels')}>Edit…</button></div>
      <div className="labels">{runnerLabels(r).length ? runnerLabels(r).map(l => <span key={l.name} className="label" title={l.type === 'custom' ? 'Custom label' : 'GitHub default · read-only'}>{l.type === 'custom' ? null : <Icon name="lock"/>}{l.name}</span>) : <span className="detail-help">No custom labels</span>}</div>
    </section>
    <details className="detail-section runner-configuration"><summary>Configuration & location</summary><dl>{details.map(([label, value]) => <div className="detail-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="location">{r.path}</div></details>
    <RunnerAccess key={r.id} runnerId={r.id} connected={connected}/>
    <section className="detail-section destructive-section"><button className="danger" disabled={locked || (!connected && !r.deregistered)} title={!connected ? "Connect GitHub to deregister this runner" : undefined} onClick={() => onAction(r, 'delete')}><Icon name="trash"/>Delete Runner…</button><p className="detail-help">Removes this runner and its workspace.<br/>Stop it to keep its files.</p></section>
  </div>;
}

type Modal = { type: 'create'; initialMode?: 'token' } | { type: 'storage' } | { type: 'action'; runner: Runner; action: Action } | null;

export default function App() {
  const fleet = useRunners();
  const connection = useConnection();
  const [menu, setMenu] = useState<{ runner: Runner; x: number; y: number } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const openMenu = useCallback((runner: Runner, x: number, y: number) => setMenu({ runner, x, y }), []);
  const [listPercent, setListPercent] = useState(42);
  const pane = useRef<HTMLElement>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try { return localStorage.getItem('mactions.welcome.v1') === 'seen'; }
    catch { return false; }
  });
  const [setupOpen, setSetupOpen] = useState(false);
  const disconnected = connection.isSuccess && !connection.data.connected && connection.data.state !== 'unavailable';
  const welcome = setupOpen || (!welcomeDismissed && disconnected);
  useEffect(() => {
    if (connection.data?.connected && !welcomeDismissed) {
      try { localStorage.setItem('mactions.welcome.v1', 'seen'); } catch { /* Continue without browser storage. */ }
      setWelcomeDismissed(true);
    }
  }, [connection.data?.connected, welcomeDismissed]);
  function dismissWelcome() {
    try { localStorage.setItem('mactions.welcome.v1', 'seen'); } catch { /* Continue when browser storage is unavailable. */ }
    setWelcomeDismissed(true);
    setSetupOpen(false);
  }
  const table = useRef<HTMLTableSectionElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const rows = fleet.data?.runners ?? EMPTY_RUNNERS;
  const visible = filterRunners(rows, filter, search);
  const selected = visible.find(r => r.id === selectedId) ?? visible[0];
  const notice = fleet.data && fleet.error ? { message: fleet.error.message, error: true } : fleet.notice;

  function run(operation: Operation) {
    setModal(null);
    fleet.run(operation);
  }
  function onAction(runner: Runner, action: Action) {
    if (fleet.locked) return;
    if (action === 'start') {
      run({ path: `/api/runners/${runner.id}/${action}`, payload: {}, message: `Starting ${runner.name}…` });
    } else setModal({ type: 'action', runner, action });
  }
  function navigateRows(event: KeyboardEvent<HTMLTableSectionElement>) {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || !visible.length) return;
    event.preventDefault();
    const current = visible.findIndex(r => r.id === selected?.id);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : Math.max(0, Math.min(visible.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    setSelectedId(visible[index].id);
    table.current?.querySelector<HTMLElement>(`tr[data-id="${visible[index].id}"]`)?.focus();
  }
  const add = () => setModal({ type: 'create' });
  const locked = fleet.locked;
  const initializing = fleet.isPending;
  return <>
    <main className="app flex h-dvh min-h-[450px] flex-col">
      <header className="toolbar flex items-center justify-between gap-5 px-[16px] py-2">
        <div className="app-title flex shrink-0 items-center gap-[11px]"><span className="app-icon"><Icon name="server"/></span><div><h1>mactions</h1></div></div>
        <div className="toolbar-controls flex items-center gap-2.5">
          <GitHubStatus interactive={!initializing} onOpen={() => setSetupOpen(true)}/>
          {!initializing ? <>
          <label className="search-field"><Icon name="search"/><input ref={searchInput} type="search" placeholder="Search runners" aria-label="Search runners" autoComplete="off" spellCheck={false} value={search} onChange={event => setSearch(event.target.value)}/></label>
          <button className="icon-button" title="Refresh runners" aria-label="Refresh runners" onClick={fleet.refresh} disabled={fleet.isFetching}><Icon name="refresh"/></button>
          <span className="toolbar-divider" aria-hidden="true"/>
          <button className="primary" onClick={add} disabled={locked}><Icon name="plus"/><span>Add Runner</span></button>
          </> : null}
        </div>
      </header>
      {!initializing && !welcome && disconnected ? <GitHubConnection guide onUseToken={() => setModal({ type: 'create', initialMode: 'token' })}/> : null}
      {!initializing ? <div className="view-bar flex items-center justify-between gap-2.5"><div className="segments" role="group" aria-label="Filter runners">
        {FILTERS.map(item => <button key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}{item.value === 'all' ? <span>{rows.length}</span> : null}</button>)}
      </div><span className="view-caption"/></div> : null}
      {notice ? <div id="notice" className={notice.error ? 'error' : ''} role="status" aria-live="polite">{notice.message}</div> : null}
      {initializing ? <section className="app-loading" role="status" aria-busy="true"><span className="loading-spinner" aria-hidden="true"/><p>Loading runners…</p><div className="loading-preview" aria-hidden="true"><span/><span/><span/></div></section> : <div className={`workspace min-h-0 flex-1 ${selected ? 'has-selection' : 'no-selection'}`}>
        <section ref={pane} style={{ '--list-height': `${listPercent}%` } as CSSProperties} className="list-pane min-w-0" aria-label="Managed runners">
          <div className="table-scroll relative overflow-auto">
            <table role="grid" aria-label="Runners" aria-multiselectable="false"><thead><tr><th scope="col" className="name-column">Name</th><th scope="col" className="status-column">Status</th><th scope="col" className="target-column">GitHub Target</th><th scope="col" className="labels-column">Labels</th></tr></thead>
              <tbody ref={table} onKeyDown={navigateRows}>{visible.map(runner => <RunnerRow key={runner.id} runner={runner} selected={selected?.id === runner.id} onSelect={setSelectedId} onMenu={openMenu}/>)}</tbody>
            </table>
            {!rows.length ? fleet.error ? <div className="empty"><Icon name="info"/><h2>Unable to load runners</h2><p>{fleet.error.message}</p><button onClick={fleet.refresh} disabled={fleet.isFetching}>Try again</button></div> : <div className="empty"><Icon name="server"/><h2>No Runners</h2><p>Add a runner for a GitHub repository or organization.</p><button className="primary" onClick={add} disabled={locked}>Add Runner</button></div>
              : !visible.length ? <div className="empty"><Icon name="search"/><h2>No Matching Runners</h2><p>Try a different search or filter.</p><button onClick={() => { setSearch(''); setFilter('all'); searchInput.current?.focus(); }}>Show All Runners</button></div> : null}
          </div>
          {selected ? <div className="pane-divider" role="separator" tabIndex={0} aria-label="Resize terminal" aria-orientation="horizontal" aria-valuemin={20} aria-valuemax={75} aria-valuenow={Math.round(listPercent)} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) { const box = pane.current!.getBoundingClientRect(); setListPercent(Math.max(20, Math.min(75, (event.clientY - box.top) / box.height * 100))); } }} onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onKeyDown={event => { if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) { event.preventDefault(); setListPercent(value => event.key === 'Home' ? 20 : event.key === 'End' ? 75 : Math.max(20, Math.min(75, value + (event.key === 'ArrowUp' ? -5 : 5)))); } }} /> : null}
          {selected ? <RunnerActivity key={selected.id} runner={selected} connected={Boolean(connection.data?.connected)}/> : null}
        </section>
        {selected ? <aside className="inspector" aria-label="Runner details"><Inspector runner={selected} connected={Boolean(connection.data?.connected)} locked={fleet.locked} onAction={onAction}/></aside> : null}
      </div>}
      <footer className="app-footer flex items-center justify-between gap-3"><span>This Mac</span>{!initializing ? <button className="text-button" onClick={() => setModal({ type: 'storage' })}>Data Directory…</button> : null}</footer>
    </main>
    {menu ? <RunnerMenu runner={rows.find(r => r.id === menu.runner.id) ?? menu.runner} x={menu.x} y={menu.y} locked={fleet.locked} connected={Boolean(connection.data?.connected)} onAction={onAction} onClose={closeMenu}/> : null}
    {!initializing && welcome ? <WelcomeDialog onClose={dismissWelcome} onUseToken={() => { dismissWelcome(); setModal({ type: 'create', initialMode: 'token' }); }}/> : null}
    {modal?.type === 'create' ? <CreateDialog initialMode={modal.initialMode} locked={fleet.locked || fleet.isPending} initializing={fleet.isPending} onClose={() => setModal(null)}/> : null}
    {modal?.type === 'action' ? <ActionDialog runner={modal.runner} action={modal.action} locked={fleet.locked} onClose={() => setModal(null)} onRun={run}/> : null}
    {modal?.type === 'storage' ? <StorageDialog path={fleet.data?.data_directory || 'Unavailable'} onClose={() => setModal(null)}/> : null}
  </>;
}
