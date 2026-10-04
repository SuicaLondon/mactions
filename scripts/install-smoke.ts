// Exercise the installer without GitHub access or real manager/runner services.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { repo } from './shared/paths.ts';

interface Entry {
  name: string;
  content?: string;
  type?: '0' | '1' | '2' | '5';
  link?: string;
}

const version = '0.2.0';
const bundle = `mactions-${version}-macos-arm64`;
const fixture = `#!/bin/sh
if [ "$1" = --version ]; then printf 'mactions ${version}\\n'; exit 0; fi
printf '%s\\n' "$*" >> "$HOME/manager-actions"
`;

function tarEntry(entry: Entry) {
  const content = Buffer.from(entry.content ?? '');
  const header = Buffer.alloc(512);
  header.write(entry.name, 0, 100);
  header.write('0000755\0', 100, 8);
  header.write('0000000\0', 108, 8);
  header.write('0000000\0', 116, 8);
  header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124, 12);
  header.write('00000000000\0', 136, 12);
  header.fill(32, 148, 156);
  header.write(entry.type ?? '0', 156, 1);
  header.write(entry.link ?? '', 157, 100);
  header.write('ustar\0', 257, 6);
  header.write('00', 263, 2);
  const checksum = header.reduce((sum, value) => sum + value, 0);
  header.write(checksum.toString(8).padStart(6, '0'), 148, 6);
  header[154] = 0;
  return Buffer.concat([header, content, Buffer.alloc((512 - (content.length % 512)) % 512)]);
}

function archive(
  directory: string,
  name: string,
  extra: Entry[] = [],
  manager = fixture,
  githubCli = '#!/bin/sh\nexit 0\n',
) {
  const entries: Entry[] = [
    { name: `${bundle}/`, type: '5' },
    { name: `${bundle}/mactions`, content: manager },
    { name: `${bundle}/libexec/`, type: '5' },
    { name: `${bundle}/libexec/gh`, content: githubCli },
    {
      name: `${bundle}/manifest.json`,
      content: JSON.stringify({ version, arch: 'arm64', min_macos: 12 }),
    },
    ...extra,
  ];
  const file = path.join(directory, `${name}.tar.gz`);
  const bytes = gzipSync(Buffer.concat([...entries.map(tarEntry), Buffer.alloc(1024)]));
  fs.writeFileSync(file, bytes);
  fs.writeFileSync(
    `${file}.sha256`,
    `${createHash('sha256').update(bytes).digest('hex')}  ${path.basename(file)}\n`,
  );
  return file;
}

function install(home: string, args: string[], shell = '/bin/zsh') {
  fs.mkdirSync(home, { recursive: true });
  return spawnSync('/bin/sh', [path.join(repo, 'install.sh'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, SHELL: shell, PATH: '/usr/bin:/bin:/usr/sbin:/sbin' },
    timeout: 20_000,
  });
}

function success(result: ReturnType<typeof install>) {
  assert.equal(
    result.status,
    0,
    result.stderr || result.error?.message || 'Installer did not succeed',
  );
}

function actions(home: string) {
  const file = path.join(home, 'manager-actions');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n');
}

function main() {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    console.log('SKIP: Installer smoke tests require an Apple Silicon Mac.');
    return;
  }
  execFileSync('/bin/sh', ['-n', path.join(repo, 'install.sh')]);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mactions-install-smoke-'));
  try {
    const valid = archive(root, 'valid');
    const corrupt = archive(root, 'corrupt');
    fs.writeFileSync(`${corrupt}.sha256`, `${'0'.repeat(64)}  corrupt.tar.gz\n`);
    const rejectedHome = path.join(root, 'rejected');
    const rejected = install(rejectedHome, ['--archive', corrupt, '--no-start']);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /checksum mismatch/);
    assert.deepEqual(fs.readdirSync(rejectedHome), []);

    for (const [name, manager, githubCli] of [
      ['wrong-version', '#!/bin/sh\nprintf "mactions 0.1.0\\n"\n', '#!/bin/sh\nexit 0\n'],
      ['unusable-gh', fixture, '#!/bin/sh\nexit 1\n'],
    ]) {
      const unusable = archive(root, name, [], manager, githubCli);
      const unusableHome = path.join(root, name);
      const result = install(unusableHome, ['--archive', unusable, '--no-start']);
      assert.notEqual(result.status, 0, `${name} was accepted`);
      assert.match(result.stderr, /version does not match|GitHub CLI could not run/);
      assert.deepEqual(fs.readdirSync(unusableHome), []);
    }

    for (const [name, entry] of [
      ['traversal', { name: `${bundle}/../escaped`, content: 'outside' }],
      ['symlink', { name: `${bundle}/linked`, type: '2', link: '/tmp' }],
      ['hardlink', { name: `${bundle}/hard`, type: '1', link: `${bundle}/mactions` }],
    ] satisfies [string, Entry][]) {
      const unsafe = archive(root, name, [entry]);
      const unsafeHome = path.join(root, name);
      const result = install(unsafeHome, ['--archive', unsafe, '--no-start']);
      assert.notEqual(result.status, 0, `${name} was accepted`);
      assert.match(result.stderr, /Unsafe archive path|links and special files/);
      assert.deepEqual(fs.readdirSync(unsafeHome), []);
    }

    const home = path.join(root, 'installed');
    success(install(home, ['--archive', valid, '--no-start']));
    const base = path.join(home, '.local/share/mactions');
    assert.equal(fs.readlinkSync(path.join(base, 'current')), `releases/${version}`);
    assert.equal(
      fs.readlinkSync(path.join(home, '.local/bin/mactions')),
      path.join(base, 'current/mactions'),
    );
    assert.equal(
      fs.readFileSync(path.join(base, 'current/libexec/gh'), 'utf8'),
      '#!/bin/sh\nexit 0\n',
    );
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(base, 'install.json'), 'utf8')), {
      schema: 1,
      source: 'script',
    });
    assert.deepEqual(actions(home), ['service install']);
    const profile = fs.readFileSync(path.join(home, '.zshrc'), 'utf8');
    assert.match(profile, /export PATH="\$HOME\/\.local\/bin:\$PATH"/);
    success(install(home, ['--archive', valid, '--no-open']));
    assert.equal(fs.readFileSync(path.join(home, '.zshrc'), 'utf8'), profile);
    assert.deepEqual(actions(home), ['service install', 'service install', 'service start']);
    success(install(home, ['--no-start']));
    assert.deepEqual(actions(home).slice(-2), ['update', 'service install']);

    const browserHome = path.join(root, 'browser');
    success(install(browserHome, ['--archive', valid]));
    assert(process.getuid);
    const login = spawnSync('/bin/launchctl', ['print', `gui/${process.getuid()}`], {
      stdio: 'ignore',
    });
    if (login.status === 0) {
      assert.deepEqual(actions(browserHome), ['service install', 'service start', 'open']);
    } else {
      assert.deepEqual(actions(browserHome), ['service install', 'service start']);
    }
    const bashHome = path.join(root, 'bash');
    success(install(bashHome, ['--archive', valid, '--no-start'], '/bin/bash'));
    assert(fs.existsSync(path.join(bashHome, '.bash_profile')));
    assert(!fs.existsSync(path.join(bashHome, '.zshrc')));

    const unrelated = path.join(root, 'unrelated');
    fs.mkdirSync(path.join(unrelated, '.local/bin'), { recursive: true });
    fs.writeFileSync(path.join(unrelated, '.local/bin/mactions'), 'preserve');
    const refused = install(unrelated, ['--archive', valid, '--no-start']);
    assert.notEqual(refused.status, 0);
    assert.equal(fs.readFileSync(path.join(unrelated, '.local/bin/mactions'), 'utf8'), 'preserve');
    assert(!fs.existsSync(path.join(unrelated, '.local/share/mactions')));
    console.log(
      'PASS: checksum, executable compatibility and traversal/link rejection, isolated installation, bundled gh, PATH idempotence, startup/browser flags, and unrelated file preservation.',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();
