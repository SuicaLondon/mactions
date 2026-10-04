# mactions: Feature Targets

Manage self-hosted GitHub Actions runners on macOS and inspect workflow activity across selected GitHub scopes.

## First: Runner Management

- Keep local management focused on runner CRUD and lifecycle management, alongside on-demand workflow activity inspection. Prefer official runner scripts and documented GitHub Actions APIs, using only the local orchestration needed to manage them.
- Treat registration targets, custom labels, name prefixes, usernames, and machine-specific paths as user or environment configuration, not copied personal defaults. Allocate `actions-runner-N` directories atomically using the highest existing index plus one, without filling gaps or adopting existing installations. Use the official scripts' recorded service identity and preserve independent runner installations.
- Create and configure official GitHub Actions runners for repositories or organizations.
- Download, install, and register runners.
- Start each newly created runner immediately after successful registration.
- Manage runners created by mactions in the first release; importing existing runners is deferred.
- List runners and view their configuration, including name, target, labels, version, and installation path.
- View runner status: stopped, starting, stopping, online, offline, idle, busy, or failed.
- Use official GitHub Actions APIs as the source of truth for GitHub-reported runner connectivity and busy status. Use local service and process state for local lifecycle operations and verification.
- Query status on demand: CLI queries run when requested, and web status refresh runs only while users are viewing it. Do not keep background status polling active without viewers; checks required to complete an in-progress operation still run.
- Keep first-release configuration editing minimal and use documented GitHub Actions operations.
- Edit custom runner labels through GitHub's official API; show GitHub-provided read-only labels without editing controls. See [GitHub's label management documentation](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/apply-labels).
- Keep runner name, registration target, and installation path fixed after creation in the first release; create a new runner when these need to change.
- Start, stop, and restart runners.
- Stop initiates the official runner shutdown immediately, including interruption of an active job, rather than waiting for the job to finish. Allow the official shutdown sequence to run and show stopping until the runner exits.
- Treat runner shutdown separately from GitHub workflow cancellation. Report job conclusions from GitHub rather than inferring them from a local stop operation.
- A manually stopped runner remains stopped across manager restarts and Mac reboots until the user explicitly starts it again.
- Stopping a runner preserves its local installation, workspace, and logs.
- In the first release, automatically start previously enabled runners when the owning macOS user logs in after a reboot, independently of whether the mactions web service is running. Prefer the official macOS service scripts; startup before user login is deferred.
- Deleting a runner removes its GitHub registration, local service configuration, and runner-owned installation, workspace, and logs. Delete does not offer a keep-files option; users who want to preserve the runner and its files should stop it instead.
- Delete must first confirm that the runner has stopped successfully. If stopping fails or the runner is still stopping, do not remove its GitHub registration, service configuration, or local files.
- After confirming the runner is stopped, remove its GitHub registration before deleting local files. If GitHub deregistration fails, preserve the local files, report the failure, and allow retrying the deletion.
- Show operation progress and errors.
- Preserve runner configuration across application restarts.
- Centralize managed runner installations, workspaces, and logs under a fixed data directory. Keep macOS service registration files in their required system locations; management of caches and other workflow output written elsewhere is deferred.
- Leave dependency and build caching to each tool's existing mechanisms in the first release. mactions does not relocate or merge these caches, add tool-specific cache configuration, or run a cache service. Resource reuse follows the tools' own behavior; cross-runner cache sharing is not guaranteed by mactions.
- Preserve independent runner configuration, lifecycle, and deletion. Shared caches are not owned by an individual runner and are not removed when that runner is deleted.

## Access and Usage

- Minimize manual installation prerequisites: distribute a prebuilt Rust application with web assets and a bundled GitHub CLI, and download the official runner when creating one. Users do not need to install Rust or a separate web runtime; workflow-specific build tools remain separate prerequisites.
- Target Apple Silicon Macs running macOS 12 or later for the current distribution. Keep Intel support outside this installation release.
- Provide a SHA-256-verified installer for the current account without sudo, an optional Homebrew tap, and a downloaded-archive path. Register the manager for login startup, start it immediately when a GUI login session is available, and open the dashboard unless disabled by an installer option.
- Start the manager and previously enabled runners after the owning account logs in. Preserve manually stopped runner and manager states across updates and reboots until explicitly started again. Defer startup before login and setup for other accounts to [issue #3](https://github.com/SuicaLondon/mactions/issues/3).
- Provide manager open, install/start/stop/restart/status, manual update/check, and uninstall commands. Use Homebrew for lifecycle, updates, and removal of Homebrew installations.
- Offer manual updates from the dashboard and CLI. Verify script updates before activation, retain the prior release, and restore it when the updated manager fails its startup health check. Preserve runners and active jobs through manager updates or restarts.
- Uninstall only the manager's owned installation and service. Preserve runner installations, services, data, and GitHub credentials.
- Deliver standalone CLI and web management together in the same first iteration, sharing runner-management logic and behavior.
- Use GitHub CLI (`gh`) authentication for the first release. CLI and web operations use the GitHub credentials available to the local macOS account running mactions.
- Reuse existing valid `gh` authentication and respect its configured credential location, including when using a bundled executable. Request login only when needed, and distinguish missing GitHub permissions from missing authentication.
- Automatically obtain registration tokens when GitHub CLI has sufficient access. Also accept a user-supplied registration token in CLI and web creation without requiring GitHub login. Do not persist it; local control and logs remain available without cloud credentials.
- Reuse existing GitHub CLI authentication first. Offer device authorization with a code and link usable from the operator's own browser over SSH, LAN, or Tailscale. Do not require a browser or inbound OAuth callback on the runner host.
- Search loaded repository/organization choices with pagination and accept pasted GitHub URLs. Preserve forms during SSO and organization approval; provide actionable links and a recheck action. Distinguish confirmed read capabilities from unconfirmed write permission.
- Generate default runner names and immediately start successful installations. Keep name prefix and custom labels in advanced settings.
- Support standalone command-line runner CRUD without starting the web service or requiring it to be running.
- Support runner CRUD through a locally hosted web UI, started manually or by the owning account's login service.
- Stopping the web service leaves running runners and their jobs running.
- Default web access to the local Mac. Offer an explicit LAN access setting; saving restarts only the managed dashboard. Manual `serve --bind` overrides the saved setting for that process.
- The first release assumes one operator, with no mactions login, shared access token, or roles. It has no web login or application-level access control. Anyone who can reach the web service has full runner-management permissions, using the host's GitHub authentication.
- Prioritize low RAM overhead for the running web service, including any future workflow status and log watching. Standalone command-line operations are not the focus of this RAM optimization requirement.
- Design for Macs with 8 GB of RAM. Prioritize low resident memory overhead for mactions when choosing the implementation, while keeping the first release simple.
- Implement mactions in Rust, prioritizing low resident memory overhead. See [the language decision](adr/0001-use-rust.md).
- Validate memory use with measurements of idle web service, active viewing, and management-operation peaks, including temporary management subprocesses. Report runner/job and browser memory separately; no numeric memory budget is settled yet.

## Later: Startup Before Login

- Consider running the manager and enabled runners after a Mac reboot before a user logs in, if unattended operation becomes necessary. Track this and installation for other accounts in [issue #3](https://github.com/SuicaLondon/mactions/issues/3).

## Later: Web Access Control

- Design web authentication and access control. Account, password, and permission policies are deferred beyond the first release.

## Later: Import Existing Runners

- Import runners created outside mactions, including those created by the current scripts.
- Preserve their GitHub registration and workspace.
- Support migration into the managed data directory. Consider pre-copying while the original runner is running, followed by a stopped final synchronization and service path cutover; the migration policy is not yet decided.
- Import and migration are outside the first release.

## Later: Cache Management

- View cache locations and disk usage.
- Preview and clean unused caches and runner workspace files.
- Consider explicit configuration of compatible dependency and build cache sharing when needed.
- Configure cache sharing scope and cleanup policies.
- Avoid cleaning data that active jobs are using.

## First: Scoped Workflow Visibility

- Treat organization and repository selection as composable filters for Runners and Runs. Remember the last view and scope filters.
- Default to all managed registration scopes; do not label that default as every repository on the account. Discover accessible repositories when an organization is explicitly selected.
- Show accessible external self-hosted runners with read-only details alongside managed local runners. Distinguish runner type from device location, and preserve unknown classifications when GitHub does not provide enough evidence.
- In Runner rows, summarize current assigned Runs and Jobs without loading steps or logs. A row opens that runner's Runs; its Details button opens the management side panel.
- Show Runs directly from the selected organization or repository, including historical executions and runs on external or GitHub-hosted runners. Provide state and runner filters and paginated loading.
- Opening a Run shows all its Jobs. Highlight assignments to the context Runner while showing other assignments, including jobs without a known runner.
- The Run overview draws declared workflow Job dependencies from the exact executed source, including parallel branches, joins, and matrix groups; unavailable mappings remain explicit.
- Selecting a Job loads its details and Steps within the same Run page. Selecting a Step immediately loads and displays its published logs. Preserve list filters and the navigation context when going Back.
- Show results, runner assignments, attempts, timestamps, Job durations, and Step durations from GitHub without persisting workflow history.
- Provide a separate Job History page from Job details. Match the same exact Job name within its Repository and Workflow, show each execution's result and duration, and fetch Steps when a history row is expanded.
- Retrieve published Job and Step logs on demand for local and external jobs with suitable GitHub access. Show status while output is unavailable and fetch logs when GitHub publishes them. Do not promise an unsupported live stream.
- Refresh only visible activity views; stop polling inactive pages. State scan and pagination limits, partial inventory coverage, and unavailable permissions rather than presenting incomplete data as complete history.
- Keep existing official runner diagnostic logs and service stdout/stderr separate from workflow output. Follow the latest diagnostic output or select an existing historical file, keep reads bounded, and create no log archive or additional persistent data.

## Later: Extended Workflow Visibility

- Support live job output where a stable supported source can provide it.
- Watch live job output only while it is being viewed; stop watching when no viewers remain.
- Add trend charts or comparison tools beyond the per-execution Job History list when useful for performance analysis.
