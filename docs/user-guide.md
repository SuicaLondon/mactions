# User guide

A small native manager for self-hosted GitHub Actions runners on macOS, with on-demand GitHub workflow activity and job history. Use the CLI directly or the embedded web UI. Both use the same management core.

## Install for your account

The distribution targets Apple Silicon and macOS 12 or later. Use a `v0.2.0` or later release for the installer command; Homebrew additionally requires its separate tap. These entry points are not available in the older `v0.1.0` release. Native macOS 12, fresh-Mac, and reboot validation remains listed in [validation](validation.md).

```sh
curl -fsSL https://github.com/SuicaLondon/mactions/releases/latest/download/install.sh | sh
```

Run as your current macOS account, without `sudo`. The installer downloads a stable release, verifies SHA-256 and the compatibility manifest, retains the bundled GitHub CLI, installs a command in `~/.local/bin`, and adds that directory to the supported shell configuration. It registers the manager's login service, starts it when a GUI login session is available, and opens the dashboard. Over SSH without a GUI login session, the service starts at the next login. First-time GitHub authorization and runner registration remain separate steps.

Download the installer to pass options or inspect it first:

```sh
curl -fsSL https://github.com/SuicaLondon/mactions/releases/latest/download/install.sh -o install.sh
sh install.sh --no-open
```

| Option                  | Behavior                                                                   |
| ----------------------- | -------------------------------------------------------------------------- |
| `--no-open`             | Install and start without opening a browser.                               |
| `--no-start`            | Install and register the login service without starting or opening it now. |
| `--version X.Y.Z`       | Select a stable release for a new installation.                            |
| `--archive FILE.tar.gz` | Install a downloaded bundle using its adjacent `FILE.tar.gz.sha256`.       |

The installer keeps application releases under `~/.local/share/mactions/releases/VERSION`, with `current` and, after an update, `previous` links. Runner data remains in `~/.mactions`. It refuses conflicting manual or Homebrew installations. Rerunning the default installer for an owned installation delegates to `mactions update`; explicit archive/version options do not replace an existing managed installation.

Homebrew installation, after the tap is published:

```sh
brew install SuicaLondon/tap/mactions
brew services start mactions
mactions open
```

Installing the formula alone does not start the service. `brew services start` starts it now and at login for the current account. Use the installer on macOS 12–14; those versions are outside [Homebrew's supported macOS versions](https://docs.brew.sh/Installation#macos-requirements). Homebrew manager services use the default `~/.mactions` data directory.

## Manager service and network access

```sh
mactions open
mactions service install
mactions service start
mactions service stop
mactions service restart
mactions service status
```

`open` starts the manager if needed and opens its local dashboard. `service install` registers the service; `start` enables it and starts it when a login session is available. `stop` stops the manager and disables its login startup until explicitly started again. Homebrew installations delegate lifecycle commands to `brew services`. These commands control only the manager: runners and active jobs remain independent.

Automatic startup begins when the owning account logs in. Enabled runners retain their own login services and start independently of the dashboard; manually stopped runners stay stopped. Startup before login and setup for another account are deferred to [issue #3](https://github.com/SuicaLondon/mactions/issues/3).

The dashboard uses `http://localhost:8787` and defaults to local access through `127.0.0.1:8787`. In **Settings → Network access**, enable **Allow access from other devices** to listen on `0.0.0.0:8787`. Saving a changed setting restarts the managed dashboard without stopping runners or their jobs. Turning off LAN access from another device closes that connection; reopen the dashboard on the Mac. A manually started dashboard needs a manual restart after saving.

There is no mactions login or application-level access control. Every device that can reach the dashboard receives full management access using the host account's GitHub permissions.

## Update and uninstall

```sh
mactions update --check
mactions update
mactions uninstall
```

Updates are manual. **Settings → Version and updates** shows the installed version and source, checks the latest stable release when opened, and offers an update button. The dashboard briefly disconnects while its manager service restarts, then reconnects after a health check. Update status and the helper's log remain available in Settings. Pending runner mutations block a manager update; wait for them to finish and retry.

Script installations verify the new archive, its compatibility manifest, and both executables before atomically switching `current`. Only an already running manager service restarts. If the replacement manager fails its health check, the updater restores the prior release and restarts it. It keeps the previous release and preserves all runner installations, services, workspaces, logs, and GitHub credentials. The official runner continues to own its own automatic updates.

Homebrew installations delegate updates to `brew upgrade mactions`, then restart an already running manager service. You can also run `brew update`, `brew upgrade mactions`, and `brew services restart mactions` yourself. A Homebrew failure is reported for retry through Homebrew; mactions does not rewrite or roll back Homebrew's files. Manual extracted bundles cannot update themselves; use the installer or Homebrew for managed updates. Browser updates require the managed dashboard opened with `mactions open`.

`uninstall` removes only the manager and its owned login service, command wrapper, and installer PATH entries. Homebrew removal delegates to `brew services stop` and `brew uninstall mactions`. All runner services and data, including `~/.mactions` and GitHub credentials, remain. Delete unwanted runners through mactions before uninstalling the manager.

## Run the release bundle

Keep `mactions` and `libexec/gh` together after extracting the release archive. Users do not need Rust, Node.js, Homebrew, or a separate GitHub CLI. Workflow-specific tools such as Xcode remain the user's responsibility.

```sh
./mactions auth status
./mactions serve
```

Open `http://localhost:8787`. `serve` uses the saved network setting, defaulting to `127.0.0.1:8787`; `./mactions serve --bind ADDRESS:PORT` overrides it for that process. Keep a manually extracted bundle at a fixed path if registering it with `service install`.

The bundled `gh` reuses the current macOS user's normal GitHub CLI configuration and credential storage, including `GH_CONFIG_DIR` and `XDG_CONFIG_HOME`. If authentication is missing or expired, use **Connect GitHub** in the web UI or run `./mactions auth login` on the host Mac. Browser authorization shows a device code and GitHub link: open it on your own computer or phone, including when managing this Mac through SSH, LAN, or Tailscale. No inbound GitHub callback is needed. A permission failure does not require logging in again; check repository Administration or organization Self-hosted runners permissions. Do not run the manager with `sudo`.

Tagged release archives are Developer ID signed and notarized; initial Gatekeeper verification requires an internet connection because a notarization ticket cannot be stapled to a bare CLI. Local `npm run package` output is unsigned. The earlier `v0.1.0` signing/notarization workflow succeeded; this does not establish fresh-Mac or older-macOS validation for `v0.2.0`. Intel releases are outside the current distribution target.

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

The web UI refreshes local runner state every 15 seconds while visible and shows progress during mutations. Activity lists and the selected job refresh only while their page is visible. Larger scopes and accumulated pages refresh less frequently according to their read cost; the view shows that interval and provides manual refresh. Job details, steps, and published logs are fetched when opened; hidden or inactive views do not poll. Runner diagnostic logs refresh every 2 seconds while live updates are enabled and the log view is visible. The server does not poll GitHub or watch logs without viewers. Explicit device authorization and manager update/restart helpers can continue after a browser disconnects. Four HTTP workers bound concurrent handling; a cross-process file lock serializes mutations. Long-running operations continue if a browser disconnects.

## Data and recovery

The default data directory for new installations is `~/.mactions`. Set another fixed directory with `--data-dir PATH` before the command. Use the same directory for CLI and web access. New runners require a path without whitespace because the official runner passes temporary script paths to its default shell without quotes. Do not move a configured data directory: service definitions contain absolute paths.

Existing installations at `~/Library/Application Support/mactions` are still detected when `~/.mactions` does not exist. They remain manageable, but creating new runners there is blocked. Migrating requires stopping runners, updating record paths and LaunchAgent paths, and restarting their services; do not simply rename the directory. Other previous locations can be selected explicitly with `--data-dir PATH`.

The official service scripts use shell text substitution. To avoid corrupting their generated plist, custom data paths containing `&`, `<`, `>`, `@`, backslashes, or control characters are rejected before setup.

```text
mactions/
  manager.lock
  manager.json
  manager-logs/stdout.log
  manager-logs/stderr.log
  update.lock
  update.json
  update.log
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
