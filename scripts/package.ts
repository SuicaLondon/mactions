// Developer packaging entry point. End users do not need Node.js or the build tools.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { bundlePath, packageVersion, repo } from './shared/paths.ts';

const ghVersion = '2.96.0';
let ghArch = 'amd64';
if (process.arch === 'arm64') ghArch = 'arm64';
const bundle = bundlePath();
const run = (command: string, args: string[]) =>
  execFileSync(command, args, { cwd: repo, stdio: 'inherit' });
const checksum = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function buildRelease() {
  run('npm', ['--prefix', 'web', 'ci']);
  run('npm', ['--prefix', 'web', 'run', 'build']);
  run(process.execPath, ['--experimental-strip-types', 'scripts/frontend-notices.ts']);
  run('cargo', ['build', '--release', '--locked']);
  run(process.execPath, ['--experimental-strip-types', 'scripts/generate-notices.ts']);
}

function downloadGitHubCli(): string {
  const downloads = path.join(repo, 'dist/downloads');
  fs.mkdirSync(downloads, { recursive: true });
  const archiveName = `gh_${ghVersion}_macOS_${ghArch}.zip`;
  const checksumsName = `gh_${ghVersion}_checksums.txt`;
  const base = `https://github.com/cli/cli/releases/download/v${ghVersion}`;
  for (const name of [checksumsName, archiveName]) {
    const destination = path.join(downloads, name);
    if (fs.existsSync(destination)) continue;
    const partial = `${destination}.partial`;
    try {
      run('/usr/bin/curl', [
        '--fail',
        '--location',
        '--proto',
        '=https',
        '--proto-redir',
        '=https',
        '--silent',
        '--show-error',
        `${base}/${name}`,
        '-o',
        partial,
      ]);
      fs.renameSync(partial, destination);
    } finally {
      fs.rmSync(partial, { force: true });
    }
  }
  const expected = fs
    .readFileSync(path.join(downloads, checksumsName), 'utf8')
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .find(([, name]) => name === archiveName)?.[0];
  const archive = path.join(downloads, archiveName);
  if (!expected || checksum(archive) !== expected) throw new Error('GitHub CLI checksum mismatch');
  return archive;
}

function copyDocumentation() {
  const files = [
    'README.md',
    'docs/user-guide.md',
    'docs/development.md',
    'docs/product-scope.md',
    'docs/domain.md',
    'docs/activity-navigation.md',
    'docs/architecture.md',
    'docs/validation.md',
    'docs/adr/0001-use-rust.md',
  ];
  if (fs.existsSync(path.join(repo, 'docs/memory-measurements.json')))
    files.push('docs/memory-measurements.json');
  for (const file of files) fs.copyFileSync(path.join(repo, file), path.join(bundle, file));
  for (const name of [
    'THIRD-PARTY-NOTICES.md',
    'DEPENDENCY-LICENSES.txt',
    'FRONTEND-LICENSES.txt',
  ]) {
    let directory = 'dist/licenses';
    if (name === 'THIRD-PARTY-NOTICES.md') directory = 'docs';
    fs.copyFileSync(path.join(repo, directory, name), path.join(bundle, 'licenses', name));
  }
}

function writeManifest() {
  for (const executable of ['mactions', 'libexec/gh']) {
    const metadata = execFileSync('/usr/bin/otool', ['-l', path.join(bundle, executable)], {
      encoding: 'utf8',
    });
    const minimum = metadata.match(/\bminos\s+(\d+)\.(\d+)/);
    if (
      !minimum ||
      Number(minimum[1]) > 12 ||
      (Number(minimum[1]) === 12 && Number(minimum[2]) > 0)
    )
      throw new Error(`${executable} is incompatible with macOS 12.0`);
  }
  fs.writeFileSync(
    path.join(bundle, 'manifest.json'),
    `${JSON.stringify({ version: packageVersion(), arch: process.arch, min_macos: 12 }, null, 2)}\n`,
  );
}

function main() {
  buildRelease();
  fs.rmSync(bundle, { recursive: true, force: true });
  for (const directory of ['libexec', 'licenses', 'docs/adr'])
    fs.mkdirSync(path.join(bundle, directory), { recursive: true });
  const archive = downloadGitHubCli();
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'mactions-package-'));
  try {
    run('/usr/bin/ditto', ['-x', '-k', archive, stage]);
    const ghRoot = path.join(stage, `gh_${ghVersion}_macOS_${ghArch}`);
    for (const [source, target] of [
      [path.join(repo, 'target/release/mactions'), 'mactions'],
      [path.join(ghRoot, 'bin/gh'), 'libexec/gh'],
    ]) {
      fs.copyFileSync(source, path.join(bundle, target));
      fs.chmodSync(path.join(bundle, target), 0o755);
    }
    fs.copyFileSync(path.join(ghRoot, 'LICENSE'), path.join(bundle, 'licenses/GitHub-CLI-LICENSE'));
    copyDocumentation();
    writeManifest();
    const release = `${bundle}.tar.gz`;
    run('/usr/bin/tar', ['-czf', release, '-C', path.dirname(bundle), path.basename(bundle)]);
    fs.writeFileSync(`${release}.sha256`, `${checksum(release)}  ${path.basename(release)}\n`);
    fs.copyFileSync(path.join(repo, 'install.sh'), path.join(repo, 'dist/install.sh'));
    console.log(`Created ${path.relative(repo, release)}`);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

main();
