// Real manager launchd lifecycle in an isolated HOME. No GitHub or runner registration.
// Usage: npm run test:manager -- [PATH_TO_RELEASE_ARCHIVE]
import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

import { bundlePath, packageVersion, repo } from './shared/paths.ts';

interface Health {
  version: string;
  data_dir: string;
  process_id: number;
}

interface ServiceStatus {
  source: string;
  installed: boolean;
  running: boolean;
  address: string;
  label: string;
}

interface Settings {
  lan_access: boolean;
  managed: boolean;
  process_id: number;
  restart_scheduled?: boolean;
}

assert.equal(process.platform, 'darwin', 'This integration test requires macOS');
assert.equal(process.arch, 'arm64', 'This integration test requires an Apple Silicon Mac');
assert(
  process.getuid && process.getuid() !== 0,
  'Run this test as your login account, without sudo',
);
assert(process.argv.length <= 3, 'Usage: npm run test:manager -- [PATH_TO_RELEASE_ARCHIVE]');
const execute = promisify(execFile);
const archive = path.resolve(process.argv[2] ?? `${bundlePath()}.tar.gz`);
assert(fs.existsSync(archive), `Package the release first: missing ${archive}`);
assert(fs.existsSync(`${archive}.sha256`), 'The release archive needs its adjacent .sha256 file');
const domain = `gui/${process.getuid()}`;
await execute('/bin/launchctl', ['print', domain], { timeout: 10_000 }).catch(() => {
  throw new Error('This integration test requires a current macOS GUI login session');
});
await requireFreePort();

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mactions-manager-smoke-')));
const home = path.join(root, 'home');
const data = path.join(home, '.mactions');
fs.mkdirSync(data, { recursive: true });
assert.equal(fs.realpathSync(data), data, 'The integration data directory must be canonical');
const label = `io.mactions.manager.${createHash('sha256').update(data).digest('hex')}`;
const target = `${domain}/${label}`;
const agents = path.join(home, 'Library/LaunchAgents');
const plist = path.join(agents, `${label}.plist`);
const binary = path.join(home, '.local/share/mactions/current/mactions');
const url = 'http://127.0.0.1:8787';
const version = packageVersion();
const ghConfig = path.join(home, '.config/gh');
const env: NodeJS.ProcessEnv = {
  ...process.env,
  HOME: home,
  SHELL: '/bin/zsh',
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  GH_CONFIG_DIR: ghConfig,
  XDG_CONFIG_HOME: path.join(home, '.config'),
};
for (const name of ['GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN'])
  delete env[name];

async function requireFreePort() {
  const probe = net.createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', () =>
      reject(new Error('Port 8787 is occupied; stop its owner before this test')),
    );
    probe.listen({ host: '0.0.0.0', port: 8787, exclusive: true }, () => {
      probe.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });
}

async function cli<T = ServiceStatus>(...args: string[]): Promise<T> {
  const { stdout } = await execute(binary, ['--data-dir', data, ...args], {
    env,
    timeout: 150_000,
  });
  return JSON.parse(stdout) as T;
}

async function http<T>(route: string, payload?: unknown): Promise<T> {
  const options: RequestInit = {
    headers: { 'Content-Type': 'application/json', 'X-Mactions': '1' },
    signal: AbortSignal.timeout(3_000),
  };
  if (payload !== undefined) {
    options.method = 'POST';
    options.body = JSON.stringify(payload);
  }
  const response = await fetch(url + route, options);
  const body: unknown = await response.json();
  assert(response.ok, JSON.stringify(body));
  return body as T;
}

async function healthMatches(previousPid?: number) {
  try {
    const health = await http<Health>('/api/manager/health');
    return (
      health.version === version &&
      health.data_dir === data &&
      health.process_id > 0 &&
      health.process_id !== previousPid
    );
  } catch {
    return false;
  }
}

async function waitFor(description: string, condition: () => Promise<boolean>) {
  const deadline = performance.now() + 40_000;
  while (performance.now() < deadline) {
    if (await condition()) return;
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function managerPid() {
  const { stdout } = await execute('/bin/launchctl', ['print', target], { timeout: 10_000 });
  const pid = stdout.match(/^\s*pid = (\d+)\s*$/m)?.[1];
  assert(pid, 'The isolated manager launchd service has no process');
  return Number(pid);
}

async function confirmRunning(previousPid?: number) {
  await waitFor('the expected manager version/data directory and new process', () =>
    healthMatches(previousPid),
  );
  const health = await http<Health>('/api/manager/health');
  assert.equal(health.process_id, await managerPid(), 'Health came from another manager process');
  const service = await cli('service', 'status');
  assert(service.installed && service.running);
  assert.equal(service.source, 'script');
  assert.equal(service.label, label);
  return health.process_id;
}

async function changeNetwork(lanAccess: boolean, previousPid: number) {
  const response = await http<Settings>('/api/manager/settings', { lan_access: lanAccess });
  assert.equal(response.lan_access, lanAccess);
  assert(
    response.managed && response.restart_scheduled,
    'The managed settings change did not schedule a restart',
  );
  const pid = await confirmRunning(previousPid);
  const saved = await http<Settings>('/api/manager/settings');
  assert.equal(saved.lan_access, lanAccess);
  assert.equal(saved.process_id, pid);
  let address = '127.0.0.1:8787';
  if (lanAccess) address = '0.0.0.0:8787';
  assert.equal((await cli('service', 'status')).address, address);
  return pid;
}

try {
  fs.mkdirSync(ghConfig, { recursive: true });
  fs.mkdirSync(path.join(data, 'retained-runner'), { recursive: true });
  const sentinel = path.join(data, 'preserved.txt');
  const credentials = path.join(data, 'retained-runner/.credentials');
  const ghCredentials = path.join(ghConfig, 'hosts.yml');
  fs.writeFileSync(sentinel, 'preserve manager data');
  fs.writeFileSync(credentials, 'preserve fixture runner credentials');
  fs.writeFileSync(
    ghCredentials,
    'github.com:\n  user: smoke-fixture\n  oauth_token: not-a-real-token\n',
  );
  fs.writeFileSync(path.join(home, '.zshrc'), 'export MACTIONS_SMOKE_SENTINEL=preserve\n');

  await execute('/bin/sh', [path.join(repo, 'install.sh'), '--archive', archive, '--no-open'], {
    env,
    timeout: 150_000,
  });
  assert(fs.existsSync(plist) && plist.startsWith(home + path.sep));
  assert.equal(fs.readlinkSync(path.join(home, '.local/bin/mactions')), binary);
  let pid = await confirmRunning();
  assert.equal((await http<Settings>('/api/manager/settings')).lan_access, false);

  assert.equal((await cli('service', 'stop')).running, false);
  assert.equal((await cli('service', 'status')).running, false);
  assert.equal(await healthMatches(), false, 'The stopped manager still answers health requests');
  const { stdout: disabled } = await execute('/bin/launchctl', ['print-disabled', domain]);
  assert(
    disabled
      .split('\n')
      .some((line) => line.includes(`"${label}"`) && /=>\s*(true|disabled)\b/.test(line)),
    'Manager stop did not persistently disable login startup',
  );
  assert((await cli('service', 'start')).running);
  pid = await confirmRunning(pid);
  assert((await cli('service', 'restart')).running);
  pid = await confirmRunning(pid);

  pid = await changeNetwork(true, pid);
  await changeNetwork(false, pid);

  const removed = await cli<{ removed: boolean }>('uninstall');
  assert(removed.removed);
  assert(!fs.existsSync(plist));
  assert(!fs.existsSync(path.join(home, '.local/share/mactions')));
  assert(
    !fs.readdirSync(path.join(home, '.local/bin')).includes('mactions'),
    'Uninstall left a command wrapper',
  );
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'preserve manager data');
  assert.equal(fs.readFileSync(credentials, 'utf8'), 'preserve fixture runner credentials');
  assert(fs.readFileSync(ghCredentials, 'utf8').includes('not-a-real-token'));
  const profile = fs.readFileSync(path.join(home, '.zshrc'), 'utf8');
  assert(profile.includes('export MACTIONS_SMOKE_SENTINEL=preserve'));
  assert(!profile.includes('# >>> mactions PATH >>>'));
  assert.equal(await healthMatches(), false);
  const unloaded = spawnSync('/bin/launchctl', ['print', target], {
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.notEqual(unloaded.status, 0, 'Uninstall left the manager service loaded');
  console.log(
    'PASS: offline installer, real manager start/stop/restart, persistent stop, version/data/PID health, LAN/local setting restarts, and uninstall preserving data/credentials.',
  );
} finally {
  try {
    if (fs.existsSync(binary)) await cli('service', 'stop').catch(() => undefined);
    spawnSync('/bin/launchctl', ['bootout', target], { stdio: 'ignore', timeout: 15_000 });
    spawnSync('/bin/launchctl', ['enable', target], { stdio: 'ignore', timeout: 10_000 });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
