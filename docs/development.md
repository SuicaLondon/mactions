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

The packaging script rebuilds the frontend, pins and verifies an official GitHub CLI distribution, and includes GitHub CLI, Rust, and frontend dependency notices. The bundle contains `manifest.json` with its Cargo version, `arch: "arm64"`, and `min_macos: 12`; installer and update checks reject incompatible or incomplete bundles. The current distribution targets Apple Silicon. Build tools are developer prerequisites only. See [code structure](architecture.md) for module responsibilities and [validation](validation.md) for measured memory, executed checks, and remaining live-runner validation.

Developer build and test scripts use TypeScript (`.ts`) and Node.js built-ins, using the frontend toolchain plus root Git-hook dependencies. The end-user `install.sh` uses POSIX shell and macOS utilities, so installation does not require Node.js. TypeScript scripts share the frontend’s installed compiler and Node types. `npm run typecheck` checks both the frontend and scripts; frontend and release builds also run this check. Node executes scripts using [built-in type stripping](https://nodejs.org/download/release/v22.14.0/docs/api/typescript.html#type-stripping), which does not itself check types. The npm commands include `--experimental-strip-types` for compatibility with Node.js 22.13+ or Node.js 24+; Node 22.14 prints an experimental warning. No `tsx` or `ts-node` dependency is needed.

Use `npm run package`, `npm run smoke -- SERVICE_TEMPLATE PLIST_TEMPLATE`, or `npm run --silent memory` from the repository root. To invoke any script directly, including from another directory, use `node --experimental-strip-types /path/to/mactions/scripts/<name>.ts`. Script-owned paths are resolved from the repository; template arguments are resolved from the caller’s directory. Packaging calls the Rust/frontend build tools and built-in macOS utilities such as `curl`, `ditto`, and `tar`.

| Script                     | Purpose                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dev.ts`                   | Start Vite and the Rust API together, rebuilding and restarting Rust on changes.                                                                                   |
| `package.ts`               | Build and package the native release, bundled GitHub CLI, and license notices.                                                                                     |
| `homebrew.ts`              | Generate the separate tap's formula and exact SHA-256 from a final arm64 release archive.                                                                          |
| `homebrew.test.ts`         | Validate generated formula contents, Ruby syntax, and rejection of incompatible archive fixtures.                                                                  |
| `install-smoke.ts`         | Exercise installer integrity, ownership, flags, and archive safety with isolated HOME and fake service commands.                                                   |
| `manager-smoke.ts`         | Optionally test a packaged manager through real launchd lifecycle, network restarts, and preserving uninstall in a temporary HOME.                                 |
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

## Installation and manager operations

`install.sh` installs for the current account under `~/.local/share/mactions`, retains the complete bundle, creates a stable `current` link and an owned `~/.local/bin/mactions` command, and records installer ownership. It supports `--no-open`, `--no-start`, `--version X.Y.Z`, and `--archive FILE.tar.gz` with an adjacent checksum. It refuses unrelated paths and conflicting installations. Existing default installations delegate updates to the Rust CLI.

`src/installation` owns saved network settings, the manager's login service, update transactions, and manager-only uninstall. Runner launchd services remain managed by the official runner adapter. The manager defaults to loopback access; enabling LAN access in Settings persists configuration and restarts only the serving manager through a detached CLI helper. Explicit `serve --bind` overrides the saved address.

Script updates download the latest stable release from the official repository, verify its archive/checksum/manifest and executables, then switch the stable link atomically. A startup failure restores the previous manager. Homebrew updates and services delegate to Homebrew, without manipulating its managed files. Both sources preserve runner services, active jobs, and data. Updates and service changes use the management-operation lock; browser helpers persist progress/logs and reconnect through the version/data-directory health endpoint. Startup before login and setup for other accounts remain in [issue #3](https://github.com/SuicaLondon/mactions/issues/3).

Run the distribution checks independently with:

```sh
npm run test:install
npm run test:homebrew
```

The installer check uses archive fixtures and a fake executable, without real GitHub or launchd operations. Rust installation tests cover settings, service ownership/source detection, archive checks, update locking, and activation rollback. These checks do not establish actual logout/login, reboot, GitHub authorization, or older-macOS behavior.

## Continuous integration and releases

`.github/workflows/ci.yml` runs `npm run check:all` only for pull requests on `macos-15` (Apple Silicon). This includes lint and lint-rule tests, formatting, TypeScript checks, the frontend build and tests, Rust formatting/Clippy/tests, and the installer/Homebrew distribution checks. The job uses Node.js 24 and stable Rust. A macOS 15 build is not evidence of native validation on macOS 12–14.

`.github/workflows/release.yml` runs when a `v*` tag is pushed. The tag must exactly match `v` followed by the package version in `Cargo.toml`. The Apple Silicon build job runs the complete checks before packaging, signing, and notarizing. After Apple returns `Accepted`, it regenerates the archive/checksum and derives the Homebrew formula from those final signed bytes. GitHub Releases receives the arm64 `.tar.gz`, `.sha256`, `install.sh`, and `mactions.rb` files. Versions with a prerelease suffix are published as prereleases; default installer and manager updates select stable releases. A rerun uploads the files to an existing release and publishes it if necessary.

Configure these repository secrets under **Settings → Secrets and variables → Actions** before publishing:

| Secret                         | Value                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `APPLE_CERTIFICATE_P12_BASE64` | Base64-encoded `.p12` containing a valid Developer ID Application certificate and its private key.            |
| `APPLE_CERTIFICATE_PASSWORD`   | The password used when exporting the `.p12` file.                                                             |
| `APPLE_ID`                     | The Apple account email used for notarization.                                                                |
| `APPLE_TEAM_ID`                | The developer team ID matching the Developer ID Application certificate.                                      |
| `APPLE_APP_SPECIFIC_PASSWORD`  | An app-specific password generated for that Apple account at [account.apple.com](https://account.apple.com/). |

The release step trims leading and trailing whitespace from all five Apple secrets before using them. The workflow imports the certificate into a temporary keychain and signs `mactions` with the hardened runtime and a secure timestamp. It preserves and verifies the bundled GitHub CLI's upstream signature. A temporary ZIP is submitted with `notarytool`; after acceptance, the workflow regenerates the `.tar.gz` and its checksum from the signed bundle. The temporary keychain and certificate file are always removed and are never included in the bundle. No private key or password should be committed to the repository.

Command-line binaries cannot have a notarization ticket stapled to them. The first Gatekeeper verification therefore requires an internet connection. Local `npm run package` output remains unsigned. The [v0.1.0 release workflow](https://github.com/SuicaLondon/mactions/actions/runs/37150481955) completed signing and notarization successfully. Its success does not establish fresh-Mac Gatekeeper, login/reboot, or macOS 12 testing for this installation release.

For releases, update the package version in `Cargo.toml`, refresh `Cargo.lock` with Cargo, and commit the changes. Merge the workflow and version changes into `main`, then check out the latest `main`. Replace `X.Y.Z` below with the package version and create a new, unused tag from the intended release commit:

```sh
version=X.Y.Z
git tag "v$version"
git push origin "v$version"
```

Bundle filenames read the Cargo package version automatically. Download the archive and its checksum into the same directory and verify with `shasum -a 256 -c "mactions-$version-macos-arm64.tar.gz.sha256"` before extraction.

`npm run homebrew -- dist/mactions-X.Y.Z-macos-arm64.tar.gz` writes `dist/homebrew/Formula/mactions.rb`; an optional second argument changes the output path. Run this only against the final signed/notarized release archive when preparing a public formula. A local unsigned archive is suitable for generation tests, but its checksum must never be used for the public release.

The `homebrew/` directory is a template for the separate `SuicaLondon/homebrew-tap` repository. Publish its README, workflow, and generated `Formula/mactions.rb` there before advertising `brew install SuicaLondon/tap/mactions`. Its manual update workflow downloads the `mactions.rb` asset from a stable release and commits it with the tap's own `GITHUB_TOKEN`, without credentials that can write both repositories. See the [tap instructions](../homebrew/README.md). The installer URL `https://github.com/SuicaLondon/mactions/releases/latest/download/install.sh` becomes usable after the new release publishes that asset.

The workflow uses GitHub's automatic `GITHUB_TOKEN` to publish; no personal GitHub token is required. Apple secrets are available only to the signing and notarization step. The build job has read-only repository permissions, and only the publishing job can write release contents.

## Development-only CI recordings

The recorder, recording parser, and playback component are retained for development and debugging. Replay is not exposed in the product UI; normal history and published logs come from GitHub. Recorded snapshots are samples, not a live-stream archive.

To record a run assigned to a local runner, start the manager on port 8787 and run:

```sh
node --experimental-strip-types scripts/record-ci.ts OWNER/REPO RUN_ID LOCAL_RUNNER_ID recordings/run.json
```

Add `--rerun` to explicitly rerun that existing workflow and capture the new attempt. The recorder polls the selected run about every three seconds, saves intermediate snapshots, and downloads complete job and step logs after completion. A 20-minute timeout preserves a partial recording. Recordings are kept locally under the ignored `recordings/` directory and may contain workflow output. They can be used with the retained development playback component and parser tests; the dashboard has no recording import control.
