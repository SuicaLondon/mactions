import type assertModule from 'node:assert/strict';
import type * as fsModule from 'node:fs';

// These standalone functions are serialized after Node strips their types.
// Each fixture must use only its own locals and Node globals: no runtime imports or closures.
interface FixtureRunner {
  id: number;
  name: string;
  status: string;
  busy: boolean;
  labels: { name: string; type: string }[];
}
interface FixtureState {
  runners: FixtureRunner[];
  release: unknown;
}

export function workerFixture() {
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
  setInterval(() => {}, 1000);
}

export function configFixture() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Serialized fixtures run independently as CommonJS.
  const assert: typeof assertModule = require('node:assert/strict');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Serialized fixtures run independently as CommonJS.
  const fs: typeof fsModule = require('node:fs');
  assert.equal(process.env.ACTIONS_RUNNER_INPUT_TOKEN, 'fixture-registration-token');
  assert.equal(process.env.GH_TOKEN, undefined);
  const statePath = process.env.FIXTURE_STATE;
  assert(statePath, 'Missing fixture state path');
  const args = process.argv.slice(2);
  const name = args[args.indexOf('--name') + 1];
  const url = args[args.indexOf('--url') + 1];
  let labels: string[] = [];
  if (args.includes('--labels')) labels = args[args.indexOf('--labels') + 1].split(',');
  fs.writeFileSync('.runner', JSON.stringify({ agentId: 42, agentName: name, gitHubUrl: url }));
  const data: FixtureState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  data.runners = [
    {
      id: 42,
      name,
      status: 'online',
      busy: false,
      labels: [
        ...labels.map((name) => ({ name, type: 'custom' })),
        { name: 'self-hosted', type: 'read-only' },
      ],
    },
  ];
  fs.writeFileSync(statePath, JSON.stringify(data));
}

export function githubFixture() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Serialized fixtures run independently as CommonJS.
  const assert: typeof assertModule = require('node:assert/strict');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Serialized fixtures run independently as CommonJS.
  const fs: typeof fsModule = require('node:fs');
  const statePath = process.env.FIXTURE_STATE;
  assert(statePath, 'Missing fixture state path');
  const args = process.argv.slice(2);
  const data: FixtureState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const method = args[args.indexOf('--method') + 1];
  const endpoint = args.find((arg) => arg.startsWith('/'));
  assert(endpoint, 'Missing fixture API endpoint');
  if (process.env.FIXTURE_NO_AUTH === '1' && !endpoint.endsWith('/releases/latest')) {
    console.error('gh auth login is required');
    process.exit(1);
  }
  let result: unknown;
  switch (true) {
    case endpoint === '/user':
      result = { login: 'fixture' };
      break;
    case endpoint.endsWith('/releases/latest'):
      result = data.release;
      break;
    case endpoint.endsWith('/registration-token'):
      result = { token: 'fixture-registration-token' };
      break;
    case method === 'PUT': {
      const { labels }: { labels: string[] } = JSON.parse(fs.readFileSync(0, 'utf8'));
      data.runners[0].labels = labels.map((name) => ({ name, type: 'custom' }));
      fs.writeFileSync(statePath, JSON.stringify(data));
      result = { labels: data.runners[0].labels };
      break;
    }
    case method === 'DELETE':
      data.runners = [];
      fs.writeFileSync(statePath, JSON.stringify(data));
      break;
    default:
      result = { runners: data.runners };
  }
  if (result !== undefined) console.log(JSON.stringify(result));
}
