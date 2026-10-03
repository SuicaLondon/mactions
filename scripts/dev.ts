import { type ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { repo } from './shared/paths.ts';

const port = process.env.MACTIONS_DEV_PORT ?? '8787';
const children = new Set<ChildProcess>();
let poll: ReturnType<typeof setInterval> | undefined;
let stopping = false;
let pending = true;
let building = false;
let backend: ChildProcess | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

function start(command: string, args: string[]) {
  const child = spawn(command, args, { cwd: repo, stdio: 'inherit', detached: true });
  children.add(child);
  child.once('error', (error) => {
    console.error(error.message);
    shutdown(1);
  });
  child.once('close', () => children.delete(child));
  return child;
}

function signal(child: ChildProcess, name: NodeJS.Signals) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  try {
    process.kill(-child.pid, name);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error;
  }
}

async function stop(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const closed = once(child, 'close');
  const timeout = setTimeout(() => signal(child, 'SIGKILL'), 5_000);
  signal(child, 'SIGTERM');
  try {
    await closed;
  } finally {
    clearTimeout(timeout);
  }
}

function shutdown(code: number) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  clearTimeout(timer);
  clearInterval(poll);
  void Promise.all([...children].map(stop)).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}

async function rebuild() {
  if (building || stopping) return;
  building = true;
  try {
    while (pending && !stopping) {
      pending = false;
      await stop(backend);
      if (stopping) break;
      const build = start('cargo', ['build', '--locked']);
      const [code] = await once(build, 'close');
      if (stopping) break;
      if (code !== 0) {
        console.error('Rust build failed; waiting for changes.');
        continue;
      }
      backend = start(path.join(repo, 'target/debug/mactions'), [
        'serve',
        '--bind',
        `127.0.0.1:${port}`,
      ]);
      backend.once('close', (exitCode, exitSignal) => {
        if (!stopping && exitCode !== 0 && exitSignal === null) {
          console.error(`Rust server exited (${exitCode}); waiting for changes.`);
        }
      });
    }
  } finally {
    building = false;
  }
}

function scheduleBuild() {
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    void rebuild().catch((error: unknown) => {
      console.error(error);
      shutdown(1);
    });
  }, 200);
}

function rustFiles(): string {
  const source = path.join(repo, 'src');
  const files = readdirSync(source, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.rs'))
    .map((entry) => path.join(entry.parentPath, entry.name));
  files.push(...['Cargo.toml', 'Cargo.lock', 'build.rs'].map((file) => path.join(repo, file)));
  return files
    .sort()
    .map((file) => {
      const stat = statSync(file, { throwIfNoEntry: false });
      return `${file}:${stat?.mtimeMs}:${stat?.size}`;
    })
    .join('\n');
}

async function main() {
  process.once('SIGINT', () => shutdown(0));
  process.once('SIGTERM', () => shutdown(0));
  if (!existsSync(path.join(repo, 'web/dist/index.html'))) {
    console.log('Building initial embedded assets; subsequent frontend edits use Vite HMR.');
    const [code] = await once(start('npm', ['--prefix', 'web', 'run', 'build']), 'close');
    if (code !== 0 || stopping) {
      if (code === 0) shutdown(0);
      else shutdown(1);
      return;
    }
  }
  let previous = rustFiles();
  poll = setInterval(() => {
    try {
      const current = rustFiles();
      if (current !== previous) {
        previous = current;
        scheduleBuild();
      }
    } catch (error) {
      console.error(error);
      shutdown(1);
    }
  }, 500);
  const frontend = start('npm', ['--prefix', 'web', 'run', 'dev']);
  frontend.once('close', (code) => {
    if (code === 0) shutdown(0);
    else shutdown(1);
  });
  console.log('Open the Vite URL. Rust changes rebuild and restart the API automatically.');
  await rebuild();
}

void main().catch((error: unknown) => {
  console.error(error);
  shutdown(1);
});
