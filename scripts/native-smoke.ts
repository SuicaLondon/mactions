// Fake GitHub and worker, real official svc.sh and macOS launchd. No live registration.
// Usage: npm run smoke -- PATH_TO_DARWIN_SVC_TEMPLATE PATH_TO_PLIST_TEMPLATE
import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import type { Runner, Snapshot } from '../web/src/shared/api/types.ts';
import { configFixture, githubFixture, workerFixture } from './native-smoke/fixtures.ts';
import { assetsFromHtml } from './shared/assets.ts';
import { repo } from './shared/paths.ts';
import { startServer, stopServer, type TestServer } from './shared/server.ts';

assert.equal(process.platform, 'darwin', 'This integration test requires macOS');
const [svcTemplate, plistTemplate] = process.argv.slice(2);
assert(
  svcTemplate && plistTemplate,
  'Usage: npm run smoke -- PATH_TO_DARWIN_SVC_TEMPLATE PATH_TO_PLIST_TEMPLATE',
);
const svc = fs.readFileSync(svcTemplate, 'utf8');
const plistSource = fs.readFileSync(plistTemplate);
// macOS launchd does not inherit the developer's Node.js PATH.
assert(
  !/\s/.test(process.execPath),
  'The fixture shebang requires a Node.js path without whitespace',
);
const execute = promisify(execFile);
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mactions-native-smoke-')));
const home = path.join(root, 'home');
const managed = path.join(root, 'managed-data');
const app = path.join(root, 'app');
const packageRoot = path.join(root, 'package');
const label = `actions.runner.mactions-smoke.${randomUUID().replaceAll('-', '').slice(0, 12)}`;
assert(process.getuid, 'A macOS user ID is required');
const uid = process.getuid();
const serviceTarget = `gui/${uid}/${label}`;
const statePath = path.join(root, 'github.json');
const env = {
  ...process.env,
  HOME: home,
  FIXTURE_STATE: statePath,
  GH_CONFIG_DIR: path.join(root, 'gh-config'),
  GH_TOKEN: 'must-not-reach-config',
  FIXTURE_NO_AUTH: '0',
};
let server: TestServer | undefined;

function fixture(file: string, main: () => void) {
  fs.writeFileSync(file, `#!${process.execPath}\n(${main.toString()})();\n`, {
    mode: 0o755,
  });
}
async function cli<T = unknown>(...args: string[]): Promise<T> {
  const { stdout } = await execute(path.join(app, 'mactions'), ['--data-dir', managed, ...args], {
    env,
    timeout: 100_000,
  });
  return JSON.parse(stdout);
}
async function http<T = unknown>(route: string, payload?: unknown): Promise<T> {
  assert(server, 'Server must be started before making requests');
  const options: RequestInit = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'X-Mactions': '1' },
    signal: AbortSignal.timeout(100_000),
  };
  if (payload !== undefined) {
    options.method = 'POST';
    options.body = JSON.stringify(payload);
  }
  const response = await fetch(server.url + route, options);
  const body = await response.json();
  assert(response.ok, JSON.stringify(body));
  return body as T;
}

try {
  // Official svc.sh expects the standard macOS ~/Library parent to exist.
  for (const directory of [
    path.join(home, 'Library'),
    managed,
    path.join(app, 'libexec'),
    path.join(packageRoot, 'bin'),
    path.join(managed, 'downloads'),
  ]) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.copyFileSync(path.join(repo, 'target/release/mactions'), path.join(app, 'mactions'));
  fs.chmodSync(path.join(app, 'mactions'), 0o755);
  fs.writeFileSync(
    path.join(packageRoot, 'svc.sh'),
    svc
      .replaceAll('{{SvcNameVar}}', label)
      .replaceAll('{{SvcDescription}}', 'mactions isolated integration fixture'),
    { mode: 0o755 },
  );
  fs.writeFileSync(path.join(packageRoot, 'bin/actions.runner.plist.template'), plistSource);
  // Keep the official filenames, but run the fixture implementations with Node.js.
  fixture(path.join(packageRoot, 'bin/runsvc.sh'), workerFixture);
  fixture(path.join(packageRoot, 'config.sh'), configFixture);
  const filename = `actions-runner-osx-${process.arch}-2.999.0.tar.gz`;
  const archive = path.join(managed, 'downloads', filename);
  await execute('/usr/bin/tar', [
    '-czf',
    archive,
    '-C',
    packageRoot,
    ...fs.readdirSync(packageRoot),
  ]);
  const digest = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  fs.writeFileSync(
    statePath,
    JSON.stringify({
      runners: [],
      release: {
        tag_name: 'v2.999.0',
        assets: [
          {
            name: filename,
            browser_download_url: `https://github.com/actions/runner/releases/download/v2.999.0/${filename}`,
            digest: `sha256:${digest}`,
          },
        ],
      },
    }),
  );
  fixture(path.join(app, 'libexec/gh'), githubFixture);

  const runner = await cli<Runner>(
    'create',
    'repo',
    'example/fixture',
    '--prefix',
    'integration',
    '--labels',
    'test',
  );
  assert(runner.enabled && runner.github_id === 42);
  assert.equal((await cli<Snapshot>('list', '--local')).runners[0].local_status, 'running');
  const plist = fs.readFileSync(path.join(runner.path, '.service'), 'utf8').trim();
  assert(fs.existsSync(plist) && plist.startsWith(home + path.sep));
  server = await startServer(path.join(app, 'mactions'), managed, env);
  const page = await fetch(server.url, { signal: AbortSignal.timeout(10_000) });
  assert(page.ok && page.headers.get('content-type')?.startsWith('text/html'));
  assert(page.headers.get('content-security-policy')?.includes("script-src 'self'"));
  const assets = assetsFromHtml(await page.text());
  assert(assets.length >= 2);
  for (const asset of assets) {
    const response = await fetch(server.url + asset.path, {
      signal: AbortSignal.timeout(10_000),
    });
    assert(response.ok && response.headers.get('content-type')?.startsWith(asset.mime));
    const content = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(content, fs.readFileSync(path.join(repo, 'web/dist', asset.path.slice(1))));
    assert(content.length);
  }
  assert.equal((await http<Snapshot>('/api/runners')).runners[0].github_status, 'online');
  assert.equal((await http<{ connected: boolean }>('/api/github/connection')).connected, true);
  fs.mkdirSync(path.join(runner.path, '_diag'), { recursive: true });
  fs.writeFileSync(path.join(runner.path, '_diag/Runner_fixture.log'), 'Listening for Jobs');
  const logs = await http<{ content: string }>('/api/runners/1/logs');
  assert.equal(logs.content, 'Listening for Jobs');
  await http('/api/runners/1/labels', { labels: ['updated'] });
  assert.deepEqual((await cli<Runner>('show', '1')).labels, ['updated']);
  await http('/api/runners/1/restart', {});
  assert.equal(await stopServer(server.child), 0);
  server = undefined;
  assert.equal(
    (await cli<Snapshot>('list', '--local')).runners[0].local_status,
    'running',
    'Stopping web mode stopped the runner',
  );
  await cli('stop', '1');
  const stopped = (await cli<Snapshot>('list', '--local')).runners[0];
  assert(stopped.local_status === 'stopped' && !stopped.enabled);
  const { stdout: disabled } = await execute('/bin/launchctl', ['print-disabled', `gui/${uid}`]);
  assert(
    ['true', 'disabled'].some((value) => disabled.includes(`"${label}" => ${value}`)),
    'Stop did not persistently disable the service',
  );
  assert(fs.existsSync(runner.path));
  await cli('start', '1');
  await cli('delete', '1', '--yes');
  assert(!fs.existsSync(plist) && !fs.existsSync(runner.path));
  assert.deepEqual((await cli<Snapshot>('list', '--local')).runners, []);
  assert.deepEqual(JSON.parse(fs.readFileSync(statePath, 'utf8')).runners, []);
  assert(fs.existsSync(archive), 'Deleting a runner removed the shared archive');
  env.FIXTURE_NO_AUTH = '1';
  const tokenRunner = await cli<Runner>(
    'create',
    'repo',
    'example/fixture',
    '--prefix',
    'token',
    '--registration-token',
    'fixture-registration-token',
  );
  assert.equal(tokenRunner.github_id, 42);
  const record = fs.readFileSync(path.join(managed, 'records', `${tokenRunner.id}.json`), 'utf8');
  assert(!record.includes('fixture-registration-token'));
  await cli('stop', String(tokenRunner.id));
  await cli('start', String(tokenRunner.id));
  assert.equal((await cli<Snapshot>('list', '--local')).runners[0].local_status, 'running');
  env.FIXTURE_NO_AUTH = '0';
  await cli('delete', String(tokenRunner.id), '--yes');
  console.log(
    'PASS: token-only creation/local controls, local log API, GitHub connection, verified embedded production assets, archive reuse, real launchd start/restart/stop, persistent disable, CLI/Web shared state, label update, server independence, and ordered delete.',
  );
} finally {
  try {
    await stopServer(server?.child);
  } finally {
    spawnSync('/bin/launchctl', ['bootout', serviceTarget], {
      stdio: 'ignore',
      timeout: 10_000,
    });
    spawnSync('/bin/launchctl', ['enable', serviceTarget], {
      stdio: 'ignore',
      timeout: 10_000,
    });
    fs.rmSync(root, { recursive: true, force: true });
  }
}
