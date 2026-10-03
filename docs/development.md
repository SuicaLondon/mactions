# Development

```sh
npm ci
npm --prefix web ci
npm --prefix web test
npm --prefix web run build
cargo test --locked
cargo build --release --locked
npm run package
```

Frontend quality checks use type-aware TypeScript ESLint, React JSX and Hooks rules, Fast Refresh boundaries, sorted imports, and Prettier with Tailwind class sorting. ESLint's `no-ternary` rule checks frontend code, tests, lint tooling, configuration, and developer scripts. See [working conventions](../AGENTS.md) for the conditional-logic policy and [component conventions](agents/react.md) for rendering guidance. Tests use the non-type-aware lint preset for mocks, while strict TypeScript compilation still covers them. Run `npm --prefix web run check` to verify lint, formatting, and types. Run `npm --prefix web run format` to format the frontend and developer scripts, or `npm --prefix web run lint:fix` for supported lint fixes. Frontend builds run the checks before generating assets. TypeScript is pinned to 6.0.3, within the supported typescript-eslint version range.

The local `control-flow/prefer-switch` rule requires `switch` when an `if` / `else if` chain has more than four conditional branches. A final `else` is the default and does not count. It applies to frontend code, tests, lint tooling, configuration, and developer scripts; its `maxBranches` option controls the limit.

The frontend uses React, TypeScript, Tailwind CSS, and Vite. TanStack Query handles request deduplication, mutation refresh, and visible-page polling. Date parsing, formatting, comparison, arithmetic, and duration conversions use `date-fns`. Shared date helpers preserve browser locale and local time displays; `@date-fns/utc` preserves UTC recording timestamps with millisecond precision. The recording script shares the web dependency installation through these helpers. Clock reads use the shared `currentDate()` helper backed by `date-fns`'s `constructNow`. Lint rejects native date parsing, formatting, and construction in frontend code, tests, and developer scripts. Native dialogs and existing controls keep this small dashboard independent of a component library. Vite builds static files that Cargo embeds in the Rust executable; production does not run Node.js, Vite, or server-side React. Static responses borrow embedded bytes without copying an entire asset per request.

Run `npm run dev` from the repository root to start Rust and Vite together. Open the Vite URL. Frontend edits use hot module replacement without rebuilding embedded assets. Rust source or Cargo manifest/lockfile changes automatically trigger an incremental debug build and restart the API on `127.0.0.1:8787`; compilation errors leave the watcher running so the next edit retries. The script builds frontend assets once only if `web/dist/index.html` is missing, since Cargo requires embedded assets. Press Ctrl-C to stop both servers. If port 8787 is already occupied, use `MACTIONS_DEV_PORT=8788 npm run dev`; the Vite proxy uses the same port. For frontend-only development with an existing backend, use `npm --prefix web run dev`. Its development-only proxy forwards `/api` to Rust and rewrites the Origin header to the backend origin; production retains the normal same-origin mutation checks. Rebuild the frontend before rebuilding Rust to embed changes. Use Node.js 22.13+ or Node.js 24+ or a compatible newer release for development.

The packaging script rebuilds the frontend, pins and verifies an official GitHub CLI distribution, and includes GitHub CLI, Rust, and frontend dependency notices. Build tools are developer prerequisites only. See [code structure](architecture.md) for module responsibilities and [validation](validation.md) for measured memory, executed checks, and remaining live-runner validation.

All developer scripts use TypeScript (`.ts`) and Node.js built-ins, using the frontend toolchain plus root Git-hook dependencies. They share the frontend’s installed TypeScript compiler and Node types. `npm run typecheck` checks both the frontend and scripts; frontend and release builds also run this check. Node executes scripts using [built-in type stripping](https://nodejs.org/download/release/v22.14.0/docs/api/typescript.html#type-stripping), which does not itself check types. The npm commands include `--experimental-strip-types` for compatibility with Node.js 22.13+ or Node.js 24+; Node 22.14 prints an experimental warning. No `tsx` or `ts-node` dependency is needed.

Use `npm run package`, `npm run smoke -- SERVICE_TEMPLATE PLIST_TEMPLATE`, or `npm run --silent memory` from the repository root. To invoke any script directly, including from another directory, use `node --experimental-strip-types /path/to/mactions/scripts/<name>.ts`. Script-owned paths are resolved from the repository; template arguments are resolved from the caller’s directory. Packaging calls the Rust/frontend build tools and built-in macOS utilities such as `curl`, `ditto`, and `tar`.

| Script                     | Purpose                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dev.ts`                   | Start Vite and the Rust API together, rebuilding and restarting Rust on changes.                                                                                   |
| `package.ts`               | Build and package the native release, bundled GitHub CLI, and license notices.                                                                                     |
| `record-ci.ts`             | Record one workflow run on a local runner, optionally rerunning it, for development playback and debugging.                                                        |
| `native-smoke.ts`          | Test real launchd lifecycle behavior with isolated TypeScript fixtures and official service templates. Pass the service and plist template paths as two arguments. |
| `measure-memory.ts`        | Print release-server RSS measurements as JSON, including transient child processes.                                                                                |
| `generate-notices.ts`      | Generate Rust dependency license notices after fetching/building dependencies.                                                                                     |
| `frontend-notices.ts`      | Generate frontend license notices after installing frontend dependencies.                                                                                          |
| `shared/`                  | Shared path, static-asset, and test-server helpers; not a command.                                                                                                 |
| `notices/licenses.ts`      | Shared license-file discovery and text assembly; not a command.                                                                                                    |
| `native-smoke/fixtures.ts` | Typed configuration, GitHub API, and worker fixtures used by the smoke test; not a command.                                                                        |

The manager uses GitHub's official [runner REST API](https://docs.github.com/en/rest/actions/self-hosted-runners) and the runner's `config.sh`/`svc.sh`. It supplements the official scripts with persistent `launchctl enable/disable`, process-exit verification, centralized log paths, and a 45-second launchd exit allowance for the official shutdown handler. Service identity comes from the generated plist, never a guessed organization prefix. A stopped service's exact plist is removed after deregistration because official uninstall also attempts to unload the already stopped service.

Import/migration, pre-login startup, multi-user web authentication/roles, cache management, and guaranteed live workflow output remain in [product scope](product-scope.md) as later iterations.

## Development-only CI recordings

The recorder, recording parser, and playback component are retained for development and debugging. Replay is not exposed in the product UI; normal history and published logs come from GitHub. Recorded snapshots are samples, not a live-stream archive.

To record a run assigned to a local runner, start the manager on port 8787 and run:

```sh
node --experimental-strip-types scripts/record-ci.ts OWNER/REPO RUN_ID LOCAL_RUNNER_ID recordings/run.json
```

Add `--rerun` to explicitly rerun that existing workflow and capture the new attempt. The recorder polls the selected run about every three seconds, saves intermediate snapshots, and downloads complete job and step logs after completion. A 20-minute timeout preserves a partial recording. Recordings are kept locally under the ignored `recordings/` directory and may contain workflow output. They can be used with the retained development playback component and parser tests; the dashboard has no recording import control.
