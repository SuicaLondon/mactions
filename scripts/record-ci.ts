import { recordCi } from './record-ci/capture.ts';

const [repository, runText, runnerText, outputPath, rerun] = process.argv.slice(2);
const runId = Number(runText),
  runnerId = Number(runnerText);
if (
  !repository ||
  !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
  !Number.isSafeInteger(runId) ||
  runId < 1 ||
  !Number.isSafeInteger(runnerId) ||
  runnerId < 1 ||
  !outputPath ||
  (rerun && rerun !== '--rerun')
) {
  throw new Error('Usage: record-ci.ts OWNER/REPO RUN_ID LOCAL_RUNNER_ID OUTPUT.json [--rerun]');
}

await recordCi({ repository, runId, runnerId, outputPath, rerun: rerun === '--rerun' });
