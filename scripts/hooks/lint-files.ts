import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { repo } from '../shared/paths.ts';

const web = path.join(repo, 'web');
const frontend: string[] = [];
const tooling: string[] = [];
for (const file of process.argv.slice(2)) {
  const absolute = path.resolve(file);
  if (absolute.startsWith(`${web}${path.sep}`)) frontend.push(absolute);
  else tooling.push(absolute);
}
for (const [cwd, files] of [
  [web, frontend],
  [repo, tooling],
] as const) {
  if (files.length === 0) continue;
  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      path.join(web, 'node_modules/eslint/bin/eslint.js'),
      '--fix',
      '--max-warnings=0',
      ...files,
    ],
    { cwd, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
