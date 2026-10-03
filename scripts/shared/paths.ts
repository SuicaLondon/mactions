import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repo = fileURLToPath(new URL('../..', import.meta.url));

export function bundlePath() {
  if (process.platform !== 'darwin' || !['arm64', 'x64'].includes(process.arch)) {
    throw new Error('This script requires an Apple Silicon or Intel Mac');
  }
  return path.join(repo, `dist/mactions-0.1.0-macos-${process.arch}`);
}
