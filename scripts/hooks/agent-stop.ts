import { spawnSync } from 'node:child_process';

import { repo } from '../shared/paths.ts';

// Stop hooks reserve stdout for their JSON response; formatter output stays captured.
const result = spawnSync('npm', ['run', '--silent', 'format'], {
  cwd: repo,
  encoding: 'utf8',
  timeout: 120_000,
  maxBuffer: 4 * 1024 * 1024,
});
if (result.status === 0 && !result.error) {
  process.stdout.write('{}\n');
} else {
  const output = result.error?.message ?? `${result.stdout}\n${result.stderr}`.trim();
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason: `Automatic formatting failed. Fix the reported problems and run npm run format before finishing:\n${output.slice(-12_000)}`,
    }) + '\n',
  );
}
