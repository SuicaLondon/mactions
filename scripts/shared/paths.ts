import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repo = fileURLToPath(new URL('../..', import.meta.url));

export function packageVersion() {
  const manifest = fs.readFileSync(path.join(repo, 'Cargo.toml'), 'utf8');
  const packageSection = manifest.split(/^\[/m).find((section) => section.startsWith('package]'));
  const version = packageSection?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  if (!version) throw new Error('Could not find the package version in Cargo.toml');
  return version;
}

export function bundlePath() {
  if (process.platform !== 'darwin' || !['arm64', 'x64'].includes(process.arch)) {
    throw new Error('This script requires an Apple Silicon or Intel Mac');
  }
  return path.join(repo, `dist/mactions-${packageVersion()}-macos-${process.arch}`);
}
