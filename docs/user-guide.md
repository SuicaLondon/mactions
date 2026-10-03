# User guide

A small native manager for self-hosted GitHub Actions runners on macOS, with on-demand GitHub workflow activity and job history. Use the CLI directly, or start the embedded web UI when you need it. Both use the same management core.

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

**Add Runner** starts with the current repository or organization filter as its registration target; the target remains editable. It preserves the registration method, target selection, and creation-progress steps. Back preserves the form. With a GitHub connection, choose a repository or organization from an on-demand searchable list; the chosen target is shown as a summary. Registration-token mode opens the manual target field directly and accepts GitHub URLs. A missing target may require SSO or organization approval; it is not proof that the target does not exist. Automatic creation checks registration permission when you submit the final target step, before allocating a local runner directory. The form preserves entries if GitHub requires SSO or organization approval; complete authorization, then retry. Organization access can be explicitly requested in connection settings.

The runner details side panel contains a collapsed **GitHub access** section showing which capabilities have been confirmed. Read success never implies registration, label-editing, or deletion permission; the real operation verifies write permission. Failed checks retain their explanation without treating every failure as an expired login. Name prefix and custom labels are optional advanced settings; successful creation starts the runner.

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

Local process state and GitHub state are separate. Local lifecycle checks remain available independently; the scoped activity inventory supplies GitHub connectivity, busy state, and labels to both the runner list and its open details panel. A running process is not proof that GitHub sees the runner online. `busy`, `online`, and `offline` come from GitHub. Network or permission failures are shown as unknown, not as offline. GitHub determines the final result of an interrupted job.

The web UI refreshes local runner state every 15 seconds while visible and shows progress during mutations. Activity lists and the selected job refresh only while their page is visible. Larger scopes and accumulated pages refresh less frequently according to their read cost; the view shows that interval and provides manual refresh. Job details, steps, and published logs are fetched when opened; hidden or inactive views do not poll. Runner diagnostic logs refresh every 2 seconds while live updates are enabled and the log view is visible. The server has no background GitHub poller or log watcher; only an explicitly started device authorization waits in the background until completion, cancellation, or timeout. Four HTTP workers bound concurrent handling; a cross-process file lock serializes mutations. Long-running operations continue if a browser disconnects.

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

## Runners, Runs, and Job History

Organization and repository filters narrow both **Runners** and **Runs**, and mactions remembers the last view and filters. The default **Managed scopes** covers this Mac's runner registration targets. External self-hosted runners are visible when permitted and remain read-only.

Click a Runner row to inspect its associated Run attempts; its **Details** button opens local management. Open a Run to view all Jobs and declared workflow dependencies, with the originating Runner's Jobs highlighted. Select a Job or Step to load its details and published output. **Job History** compares executions with the same exact Job name in the same repository and workflow, including results and Job or Step durations.

See [activity navigation](activity-navigation.md) for navigation, runner classification, request behavior, and pagination limits. GitHub-backed history does not require a local recording archive or database.

## Workflow output and runner logs

Job details show GitHub's job and step status, conclusions, workflow, branch, commit, actors, runner assignment, attempts, timestamps, and durations. Select a step to automatically load and display its published log, or choose **Full job log** from the Job overview. Step timing appears beside its title, and output uses the remaining workspace height. Published logs are available for local and external jobs when GitHub permits reading the repository's Actions data; runner management access is not required. Downloads larger than 16 MiB are reported explicitly and can be viewed on GitHub. Pending, expired, or unavailable logs are identified clearly. mactions does not promise live streaming: where GitHub cannot supply output during execution, the page shows status and fetches the log after publication. Temporary download archives are removed after the request.

The runner details side panel also exposes local diagnostic and service logs. These are read directly from existing `_diag/Runner_*.log`, `_diag/Worker_*.log`, `logs/stdout.log`, and `logs/stderr.log`. The default follows the latest runner diagnostic file. You can pause updates, turn off automatic scrolling, or choose an existing historical file. Each response is limited to the last 64 KiB. No log copies, archive, or database is created; files removed by the runner are no longer available. Paths outside these managed logs, symlinks, and non-regular files are rejected.

Diagnostic and service logs are not the complete stdout/stderr transcript of workflow steps. Workflow output comes from GitHub's published job logs; mactions does not read the runner's transient upload spool.

The bundled GitHub CLI can also inspect repository history directly:

```sh
gh run list --repo OWNER/REPO
gh run view RUN_ID --repo OWNER/REPO --log
```

`gh run list` returns the latest 20 runs by default; add `--limit 100` or filters such as `--branch` and `--status` when needed. GitHub controls log availability and retention. The release bundle's `./libexec/gh` supports the same commands when a separate `gh` is not installed. No local recording is needed.
