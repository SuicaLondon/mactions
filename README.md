# mactions

A small native manager for self-hosted GitHub Actions runners on macOS. Use the CLI directly, or start the embedded web UI when you need it. Both use the same management core.

## Run the release bundle

Keep `mactions` and `libexec/gh` together after extracting the release archive. Users do not need Rust, Node.js, Homebrew, or a separate GitHub CLI. Workflow-specific tools such as Xcode remain the user's responsibility.

```sh
./mactions auth status
./mactions serve
```

Open `http://localhost:8787`, or `http://<your-mac-lan-address>:8787` from another device. Web mode listens on `0.0.0.0:8787` by default. There is no application login: everyone who can reach the service can manage runners with the host user's GitHub permissions. For local-only access, use `./mactions serve --bind 127.0.0.1:8787`.

The bundled `gh` reuses the current macOS user's normal GitHub CLI configuration and credential storage, including `GH_CONFIG_DIR` and `XDG_CONFIG_HOME`. If authentication is missing or expired, use **Connect GitHub** in the web UI or run `./mactions auth login` on the host Mac. Browser authorization shows a device code and GitHub link: open it on your own computer or phone, including when managing this Mac through SSH, LAN, or Tailscale. No inbound GitHub callback is needed. A permission failure does not require logging in again; check repository Administration or organization Self-hosted runners permissions. Do not run the manager with `sudo`.

This development release is not Developer ID signed or notarized. Downloaded copies may require approval through macOS Privacy & Security. The currently built artifact targets Apple Silicon; the packaging script also supports native Intel Mac builds, which have not yet been tested.

## GitHub connection and Add Runner

The first release assumes one operator and has no mactions login, access token, or roles. The GitHub connection is the host account's shared `gh` authorization, not a separate web-user identity. Existing `GH_TOKEN`/`GITHUB_TOKEN` environment credentials take precedence; browser authorization does not overwrite them. `gh` owns credential storage. Its usual system credential store is preferred, with its documented file fallback when unavailable.

**Add Runner** uses three steps: choose a registration method, choose a scope and target, then review the runner and create it. Back preserves the form. With a GitHub connection, choose a repository or organization from an on-demand searchable list; the chosen target is shown as a summary. Use **Enter Target Manually** when the target is missing or you have a GitHub URL. Registration-token mode opens the manual target field directly. A missing target may require SSO or organization approval; it is not proof that the target does not exist. Automatic creation checks registration permission when you select **Create & Start**, before allocating a local runner directory. The form preserves entries if GitHub requires SSO or organization approval; complete authorization, then retry. Organization access can be explicitly requested in connection settings.

The right-hand runner inspector contains a collapsed **GitHub access** section showing which capabilities have been confirmed. Read success never implies registration, label-editing, or deletion permission; the real operation verifies write permission. Failed checks retain their explanation without treating every failure as an expired login. Name prefix and custom labels are optional advanced settings; successful creation starts the runner.

Alternatively choose **Registration token**, enter the target and the short-lived token supplied by GitHub's **New self-hosted runner** page. No `gh` login is required. mactions does not persist this token or use it as a general GitHub API credential. The official runner owns its post-registration credentials. If setup needs to register again, supply a fresh token; uncertain prior registrations are preserved for inspection rather than replaced.

Local start, stop, restart, and logs work without GitHub authentication or even an installed `gh`. Viewing remote runner/job state, editing remote labels, and deregistering a runner require suitable GitHub access. Connecting GitHub later adds these capabilities to existing runners without recreating them. Without authentication, public runner-release metadata is fetched directly from GitHub and the archive is still checksum-verified.

## CLI

```sh
./mactions create repo owner/repository --prefix build-mac --labels build,apple-silicon
./mactions create org organization --prefix shared-mac
# Interactive target/token prompts when needed:
./mactions create repo
# Token-only creation; stdin avoids putting a secret in command arguments:
printf '%s' "$RUNNER_REGISTRATION_TOKEN" | ./mactions create repo owner/repository --registration-token-stdin
./mactions list
./mactions list --local
./mactions show 1
./mactions labels 1 build,release
./mactions labels 1 ''
./mactions stop 1
./mactions start 1
./mactions restart 1
./mactions delete 1 --yes
```

Commands return JSON. `list --local` does not query GitHub. No web service is needed for CLI commands. In this release targets are repositories or organizations on `github.com`; GitHub Enterprise Server is not supported.

CLI creation also accepts `--registration-token TOKEN`; interactive token entry hides input. Retry can accept a fresh token with `retry ID --registration-token TOKEN`. Never paste tokens into bug reports.

Names use `<prefix>-N`, with neutral default prefix `mactions`. Installation directories use `actions-runner-N`, where `N` is the highest existing index plus one. Gaps are not filled. Existing directories are never automatically adopted, and a matching GitHub runner name is never replaced.

Only custom labels can be edited. Names, targets, and paths are fixed after creation. GitHub's automatic labels remain read-only.

## Lifecycle

- Creating downloads a SHA-256-verified official runner archive, configures it, installs its official macOS user service, and starts it immediately.
- Starting enables the service for subsequent macOS logins. A reboot requires the owning user to log in before enabled runners start.
- Stopping immediately begins official shutdown and may interrupt an active job. It preserves the installation, workspace, and logs, and persistently disables automatic startup until an explicit start.
- Deleting first verifies shutdown, then removes the GitHub registration, then removes the exact managed service and runner-owned files. Failures preserve remaining files for retry. Shared caches are not deleted.
- Closing a browser does not cancel an operation. Ctrl-C stops the web server after in-flight requests finish and leaves runner services running.

Local process state and GitHub state are separate. A running process is not proof that GitHub sees the runner online. `busy`, `online`, and `offline` come from GitHub. Network or permission failures are shown as unknown, not as offline. GitHub determines the final result of an interrupted job.

The web UI refreshes every 15 seconds while visible and shows local progress during mutations. Hidden pages do not poll. Jobs refresh every 30 seconds only while their tab is visible. Local logs refresh every 2 seconds while live updates are enabled and the tab is visible. The server has no background GitHub poller or log watcher; only an explicitly started device authorization waits in the background until completion, cancellation, or timeout. Four HTTP workers bound concurrent handling; a cross-process file lock serializes mutations. Long-running operations continue if a browser disconnects.

## Data and recovery

The default data directory for new installations is `~/.mactions`. Set another fixed directory with `--data-dir PATH` before the command. Use the same directory for CLI and web access. New runners require a path without whitespace because the official runner passes temporary script paths to its default shell without quotes. Do not move a configured data directory: service definitions contain absolute paths.

Existing installations at `~/Library/Application Support/mactions` are still detected when `~/.mactions` does not exist. They remain manageable, but creating new runners there is blocked. Migrating requires stopping runners, updating record paths and LaunchAgent paths, and restarting their services; do not simply rename the directory. Other previous locations can be selected explicitly with `--data-dir PATH`.

The official service scripts use shell text substitution. To avoid corrupting their generated plist, custom data paths containing `&`, `<`, `>`, `@`, backslashes, or control characters are rejected before setup.

```text
mactions/
  manager.lock
  records/1.json
  downloads/actions-runner-osx-arm64-VERSION.tar.gz
  actions-runner-1/
    .runner, .credentials, .service, ...
    bin/, externals/, ...
    _work/
    _diag/
    logs/stdout.log
    logs/stderr.log
```

Runner installation, workspace, diagnostic files, and service logs live under the data directory. LaunchAgent plists live in macOS's required `~/Library/LaunchAgents` location. Workflow tools may still write caches or output elsewhere according to their own settings; this release does not relocate them. Live runner installations are independent because the official updater modifies their contents. Only verified download archives are shared by mactions.

Mutation checkpoints are written atomically. If setup fails, use `./mactions retry ID` to resume registration/service installation and start the runner, or `delete ID --yes` to clean it up. A failed stop or delete should be retried with the same action. `retry` means resume creation; it is not a generic undo or retry-delete command.

If registration was interrupted, mactions recovers the ID from `.runner`. If that identity is missing but a matching name exists on GitHub, it preserves files instead of claiming or deleting an unproven registration. Inspect that registration on GitHub before retrying. An authenticated runner list with no matching name permits cleanup/re-registration. Losing GitHub access never counts as proof that registration was removed.

The displayed version is the version initially installed by mactions. The official runner may subsequently update itself. Its updater, job execution, and logs are not replaced by this manager.

## Local logs and assigned jobs

Select a runner to open **Jobs** or **Logs** in the resizable lower panel. Jobs initially shows the workflow graph; click a job to open its details and steps, and click it again to collapse them. The right-hand inspector contains runner controls, labels, configuration, and the collapsed **GitHub access** section. Logs are read directly from existing `_diag/Runner_*.log`, `_diag/Worker_*.log`, `logs/stdout.log`, and `logs/stderr.log`. The default follows the latest runner diagnostic file. You can pause live updates, turn off automatic scrolling, or choose an existing historical file. Each response is limited to the last 64 KiB. No log copies, archive, or database is created; files removed by the runner are no longer available. Paths outside these managed logs, symlinks, and non-regular files are rejected.

Diagnostic and service logs are not the complete stdout/stderr transcript of workflow steps. Workflow output is available through the Jobs view after GitHub publishes it; mactions does not read the runner's transient upload spool.

**Jobs** shows only jobs assigned to the selected runner's recorded GitHub ID. Repository runners use their own repository; organization runners ask which repository in that organization to inspect. This is a bounded live view of up to 10 active and 10 recent workflow runs, with the first 100 jobs per run. The UI states this window rather than presenting it as complete history. Queued jobs without a runner assignment cannot be attributed to this Mac. Job status, conclusion, workflow, branch, timestamps, and step progress come from GitHub. The workflow graph connects runs to their assigned jobs; these edges show membership, not inferred job dependencies. Select a job to inspect its commit, event, actor, attempt, runner, timestamps, and step durations. Expand a step to fetch its complete published log, or choose **Full job log**. Downloads larger than 16 MiB are reported explicitly and can be viewed on GitHub. Pending or expired logs remain clearly identified; the UI does not promise live streaming. Step downloads fall back to GitHub CLI only when the job and step can be identified unambiguously. Temporary archives are removed after the request.

For repository workflow history, use the authenticated GitHub CLI directly:

```sh
gh run list --repo OWNER/REPO
gh run view RUN_ID --repo OWNER/REPO --log
```

`gh run list` returns the latest 20 runs by default; add `--limit 100` or filters such as `--branch` and `--status` when needed. These commands cover repository runs rather than only jobs assigned to one local runner. GitHub controls log availability and retention. The release bundle's `./libexec/gh` supports the same commands when a separate `gh` is not installed. No local recording is needed.

## Development-only CI recordings

The recorder, recording parser, and playback component are retained for development and debugging. Replay is not exposed in the product UI; normal history and published logs come from GitHub. Recorded snapshots are samples, not a live-stream archive.

To record a run assigned to a local runner, start the manager on port 8787 and run:

```sh
node --experimental-strip-types scripts/record-ci.ts OWNER/REPO RUN_ID LOCAL_RUNNER_ID recordings/run.json
```

Add `--rerun` to explicitly rerun that existing workflow and capture the new attempt. The recorder polls the selected run about every three seconds, saves intermediate snapshots, and downloads complete job and step logs after completion. A 20-minute timeout preserves a partial recording. Recordings are kept locally under the ignored `recordings/` directory and may contain workflow output. They can be used with the retained development playback component and parser tests; the dashboard has no recording import control.

## Development and validation

```sh
npm --prefix web ci
npm --prefix web test
npm --prefix web run build
cargo test --locked
cargo build --release --locked
npm run package
```

The frontend uses React, TypeScript, Tailwind CSS, and Vite. TanStack Query handles request deduplication, mutation refresh, and visible-page polling. Native dialogs and existing controls keep this small dashboard independent of a component library. Vite builds static files that Cargo embeds in the Rust executable; production does not run Node.js, Vite, or server-side React. Static responses borrow embedded bytes without copying an entire asset per request.

For frontend development, first build the assets once, then run `cargo run -- serve --bind 127.0.0.1:8787` and `npm --prefix web run dev` in separate terminals. Open the Vite URL. Its development-only proxy forwards `/api` to Rust and rewrites the Origin header to the backend origin; production retains the normal same-origin mutation checks. Rebuild the frontend before rebuilding Rust to embed changes. Use Node.js 22.12+ or a compatible newer release for development.

The packaging script rebuilds the frontend, pins and verifies an official GitHub CLI distribution, and includes GitHub CLI, Rust, and frontend dependency notices. Build tools are developer prerequisites only. See [validation](docs/validation.md) for measured memory, executed checks, and remaining live-runner validation.

All developer scripts use TypeScript (`.ts`) and Node.js built-ins, with no separate script dependencies or Python requirement. They share the frontend’s installed TypeScript compiler and Node types. `npm run typecheck` checks both the frontend and scripts; frontend and release builds also run this check. Node executes scripts using [built-in type stripping](https://nodejs.org/download/release/v22.14.0/docs/api/typescript.html#type-stripping), which does not itself check types. The npm commands include `--experimental-strip-types` for compatibility with Node.js 22.12+; Node 22.14 prints an experimental warning. No `tsx` or `ts-node` dependency is needed.

Use `npm run package`, `npm run smoke -- SERVICE_TEMPLATE PLIST_TEMPLATE`, or `npm run --silent memory` from the repository root. To invoke any script directly, including from another directory, use `node --experimental-strip-types /path/to/mactions/scripts/<name>.ts`. Script-owned paths are resolved from the repository; template arguments are resolved from the caller’s directory. Packaging calls the Rust/frontend build tools and built-in macOS utilities such as `curl`, `ditto`, and `tar`.

| Script | Purpose |
| --- | --- |
| `package.ts` | Build and package the native release, bundled GitHub CLI, and license notices. |
| `record-ci.ts` | Record one workflow run on a local runner, optionally rerunning it, for development playback and debugging. |
| `native-smoke.ts` | Test real launchd lifecycle behavior with isolated TypeScript fixtures and official service templates. Pass the service and plist template paths as two arguments. |
| `measure-memory.ts` | Print release-server RSS measurements as JSON, including transient child processes. |
| `generate-notices.ts` | Generate Rust dependency license notices after fetching/building dependencies. |
| `frontend-notices.ts` | Generate frontend license notices after installing frontend dependencies. |
| `lib.ts` | Shared path, static-asset, and test-server helpers; not a command. |
| `fixtures.ts` | Typed configuration, GitHub API, and worker fixtures used by the smoke test; not a command. |

The manager uses GitHub's official [runner REST API](https://docs.github.com/en/rest/actions/self-hosted-runners) and the runner's `config.sh`/`svc.sh`. It supplements the official scripts with persistent `launchctl enable/disable`, process-exit verification, centralized log paths, and a 45-second launchd exit allowance for the official shutdown handler. Service identity comes from the generated plist, never a guessed organization prefix. A stopped service's exact plist is removed after deregistration because official uninstall also attempts to unload the already stopped service.

Import/migration, pre-login startup, multi-user web authentication/roles, cache management, and full workflow log viewing remain in [TARGET.md](TARGET.md) as later iterations.
