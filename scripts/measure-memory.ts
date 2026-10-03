// Measure release server RSS and its transient children; no live GitHub changes.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

import { assetsFromHtml } from './shared/assets.ts';
import { bundlePath } from './shared/paths.ts';
import { startServer, stopServer, type TestServer } from './shared/server.ts';

const execute = promisify(execFile);
const binary = path.join(bundlePath(), 'mactions');
assert(
  fs.existsSync(binary),
  'Build the release bundle first; this measurement uses the bundled gh.',
);
const env = { ...process.env };
for (const key of ['GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN'])
  delete env[key];
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mactions-memory-'));
env.GH_CONFIG_DIR = path.join(root, 'empty-gh-config');
let server: TestServer | undefined;
let finished = false;
let sampling: Promise<void> | undefined;
let samplingError: unknown;
interface MemorySample {
  manager_kib: number;
  tree_kib: number;
}
const samples: MemorySample[] = [];
const measurements: Record<string, MemorySample & { samples: number }> = {};

async function sample(pid: number) {
  while (!finished) {
    const { stdout } = await execute('/bin/ps', ['-axo', 'pid=,ppid=,rss=,comm='], {
      maxBuffer: 16 * 1024 * 1024,
    });
    const rows = stdout.split('\n').flatMap((line) => {
      const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+/);
      if (!match) return [];
      return [{ pid: Number(match[1]), parent: Number(match[2]), rss: Number(match[3]) }];
    });
    const descendants = new Set([pid]);
    let previous;
    do {
      previous = descendants.size;
      for (const row of rows) if (descendants.has(row.parent)) descendants.add(row.pid);
    } while (previous !== descendants.size);
    samples.push({
      manager_kib: rows.find((row) => row.pid === pid)?.rss ?? 0,
      tree_kib: rows
        .filter((row) => descendants.has(row.pid))
        .reduce((sum, row) => sum + row.rss, 0),
    });
    await delay(20);
  }
}

function summarize(name: string, start: number) {
  if (samplingError) throw samplingError;
  const readings = samples.slice(start);
  assert(readings.length, `No memory samples for ${name}`);
  measurements[name] = {
    manager_kib: Math.max(...readings.map((row) => row.manager_kib)),
    tree_kib: Math.max(...readings.map((row) => row.tree_kib)),
    samples: readings.length,
  };
}

async function request(route: string, payload?: unknown) {
  assert(server, 'Server must be started before making requests');
  const options: RequestInit = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'X-Mactions': '1' },
    signal: AbortSignal.timeout(20_000),
  };
  if (payload !== undefined) {
    options.method = 'POST';
    options.body = JSON.stringify(payload);
  }
  const response = await fetch(server.url + route, options);
  const text = await response.text();
  let expected = response.ok;
  if (payload !== undefined) expected = response.status === 400;
  assert(expected, `${route}: ${response.status} ${text}`);
  return text;
}

try {
  server = await startServer(binary, path.join(root, 'data'), env);
  assert(server.child.pid, 'Server PID is required for memory sampling');
  sampling = sample(server.child.pid).catch((error) => {
    samplingError = error;
  });
  let start = samples.length;
  await delay(2_000);
  summarize('idle_empty_fleet', start);
  start = samples.length;
  const assets = assetsFromHtml(await request('/'));
  assert(assets.length >= 2, 'Expected production JavaScript and CSS assets');
  for (const asset of assets) await request(asset.path);
  for (let i = 0; i < 20; i++) {
    await request('/api/runners');
    await delay(100);
  }
  summarize('active_empty_fleet_http', start);
  start = samples.length;
  for (let i = 0; i < 10; i++) {
    const result = await request('/api/runners', {
      kind: 'repo',
      target: 'example/fixture',
    });
    assert(result.includes('authentication'), result);
  }
  summarize('create_missing_authentication', start);
  console.log(
    JSON.stringify(
      {
        platform: os.type(),
        architecture: process.arch,
        sampling: 'ps RSS, approximately 20 ms plus ps overhead; maxima may miss short spikes',
        measurements,
        limitations: [
          'No actual runner registration, download, configuration, or job was measured.',
          'Create measurement is the missing-authentication failure path with the real bundled gh.',
          'Browser RSS is excluded and not separately measured.',
          'No official runner or job process was started for this measurement.',
          'The Node.js measurement harness and its ps processes are excluded from the server process tree.',
        ],
      },
      null,
      2,
    ),
  );
} finally {
  finished = true;
  await sampling;
  try {
    await stopServer(server?.child);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
