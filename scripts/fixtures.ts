// These standalone functions are serialized after Node strips their types.
// Each fixture must use only its own locals and Node globals: no runtime imports or closures.
interface FixtureRunner {
  id: number; name: string; status: string; busy: boolean;
  labels: { name: string; type: string }[];
}
interface FixtureState { runners: FixtureRunner[]; release: unknown }

export function workerFixture() {
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
  setInterval(() => {}, 1000);
}

export function configFixture() {
  const assert: typeof import('node:assert/strict') = require('node:assert/strict');
  const fs: typeof import('node:fs') = require('node:fs');
  assert.equal(process.env.ACTIONS_RUNNER_INPUT_TOKEN, 'fixture-registration-token');
  assert.equal(process.env.GH_TOKEN, undefined);
  const statePath = process.env.FIXTURE_STATE;
  assert(statePath, 'Missing fixture state path');
  const args = process.argv.slice(2);
  const name = args[args.indexOf('--name') + 1];
  const url = args[args.indexOf('--url') + 1];
  const labels = args.includes('--labels') ? args[args.indexOf('--labels') + 1].split(',') : [];
  fs.writeFileSync('.runner', JSON.stringify({ agentId: 42, agentName: name, gitHubUrl: url }));
  const data: FixtureState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  data.runners = [{ id: 42, name, status: 'online', busy: false, labels: [...labels.map(name => ({ name, type: 'custom' })), { name: 'self-hosted', type: 'read-only' }] }];
  fs.writeFileSync(statePath, JSON.stringify(data));
}

export function githubFixture() {
  const assert: typeof import('node:assert/strict') = require('node:assert/strict');
  const fs: typeof import('node:fs') = require('node:fs');
  const statePath = process.env.FIXTURE_STATE;
  assert(statePath, 'Missing fixture state path');
  const args = process.argv.slice(2);
  const data: FixtureState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const method = args[args.indexOf('--method') + 1];
  const endpoint = args.find(arg => arg.startsWith('/'));
  assert(endpoint, 'Missing fixture API endpoint');
  if (process.env.FIXTURE_NO_AUTH === '1' && !endpoint.endsWith('/releases/latest')) { console.error('gh auth login is required'); process.exit(1); }
  let result: unknown;
  if (endpoint === '/user') result = { login: 'fixture' };
  else if (endpoint.endsWith('/releases/latest')) result = data.release;
  else if (endpoint.endsWith('/registration-token')) result = { token: 'fixture-registration-token' };
  else if (method === 'PUT') {
    const { labels }: { labels: string[] } = JSON.parse(fs.readFileSync(0, 'utf8'));
    data.runners[0].labels = labels.map(name => ({ name, type: 'custom' }));
    fs.writeFileSync(statePath, JSON.stringify(data));
    result = { labels: data.runners[0].labels };
  } else if (method === 'DELETE') {
    data.runners = [];
    fs.writeFileSync(statePath, JSON.stringify(data));
  } else result = { runners: data.runners };
  if (result !== undefined) console.log(JSON.stringify(result));
}
