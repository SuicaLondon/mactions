# mactions

A small native manager for self-hosted GitHub Actions runners on macOS. Manage runners with the CLI or an embedded web UI, inspect workflow Runs and Jobs, and compare Job History. Both interfaces use the same Rust management core.

## Install

Install a `v0.2.0` or later release on an Apple Silicon Mac running macOS 12 or later. Homebrew additionally requires the separate tap to be published. See [validation](docs/validation.md) for remaining native checks.

```sh
curl -fsSL https://github.com/SuicaLondon/mactions/releases/latest/download/install.sh | sh
```

The installer verifies the release checksum, installs for the current account, registers the manager to start at login, starts it now, and opens the dashboard. Use `--no-open` over SSH, or `--no-start` to install without starting the manager. Open a new terminal afterward to use `mactions` from PATH. Run without `sudo`; users need no Rust, Node.js, Homebrew, or separate GitHub CLI. Workflow-specific tools such as Xcode remain your responsibility.

```sh
mactions open
mactions service status
mactions update --check
mactions update
```

Enabled runners start independently when their owning account logs in. Manually stopped runners stay stopped. Startup before login and installation for other accounts are deferred to [issue #3](https://github.com/SuicaLondon/mactions/issues/3).

Homebrew is another installation option after the tap is published:

```sh
brew install SuicaLondon/tap/mactions
brew services start mactions
mactions open
```

Use the installer on macOS 12–14, which are outside [Homebrew's supported macOS versions](https://docs.brew.sh/Installation#macos-requirements). Homebrew installations use `brew services` and `brew upgrade` through the same mactions commands. `mactions uninstall` removes the manager while preserving runners, their services, data, and GitHub credentials.

The dashboard defaults to `127.0.0.1:8787`. **Settings → Network access** can enable other devices; saving restarts the managed dashboard and leaves runners running. There is no application login: anyone who can reach the dashboard can manage runners with the host account's permissions.

For a manually extracted archive, keep `mactions` beside `libexec/gh` and run `./mactions serve`; `--bind ADDRESS:PORT` overrides the saved network setting. Manual bundles do not update themselves. Tagged releases are signed and notarized; local packages are unsigned. Initial macOS Gatekeeper verification requires an internet connection. See the [user guide](docs/user-guide.md) for installer options, service control, updates, and recovery.

## Manage runners

```sh
./mactions create repo owner/repository --prefix build-mac --labels build,apple-silicon
./mactions create org organization --prefix shared-mac
./mactions list
./mactions show 1
./mactions stop 1
./mactions start 1
./mactions delete 1 --yes
```

Commands return JSON and work without a running web server. **Add Runner** also supports GitHub registration tokens when the host has no GitHub authorization. Local start, stop, restart, and diagnostic logs remain available without GitHub authentication.

In the web UI, **Runners** shows managed and permitted external runners; **Runs** opens workflow dependencies, Jobs, Steps, and published output. **Job History** compares the same Job across executions. GitHub authorization and scope filters are shared by the host account.

The default data directory is `~/.mactions`. Use `--data-dir PATH` consistently for CLI and web commands. Configured services contain absolute paths, so preserve that directory's location. See the [user guide](docs/user-guide.md) for authentication, permissions, lifecycle, recovery, logs, and all CLI examples.

## Develop

Use Node.js 22.13+ or Node.js 24+, npm, Rust, and the macOS build tools:

```sh
npm ci
npm --prefix web ci
npm run dev
```

Open the Vite URL printed by the command. Frontend changes use hot module replacement; Rust edits trigger an incremental API rebuild and restart. Set `MACTIONS_DEV_PORT=8788` if port 8787 is occupied. Ctrl-C stops both development servers.

```sh
npm run format       # ESLint fixes, Prettier, and rustfmt
npm run check        # Lint, formatting, and strict TypeScript checks
npm test             # Frontend interaction and model tests
npm run check:all    # Build, frontend/Rust tests, and distribution checks
npm run package      # Unsigned local release with bundled gh and license notices
```

Root installation enables Git hooks: pre-commit formats staged files and checks TS/JS plus frontend tests; pre-push runs the complete validation. The project also includes editor format-on-save settings and a Codex Stop hook for automatic formatting. Review and trust that hook through `/hooks` before its first execution; see [tooling](docs/agents/tooling.md).

GitHub Actions runs the complete checks for pull requests on Apple Silicon macOS. Pushing a new version tag such as `vX.Y.Z` runs the checks again, packages arm64, signs and notarizes the release, and publishes its archive, SHA-256 file, installer, and generated Homebrew formula to GitHub Releases. The tag must match `Cargo.toml`. See [release instructions](docs/development.md#continuous-integration-and-releases) for Apple secrets and tap publishing.

## Source layout

- `web/src/app/` composes pages, providers, navigation, and shared workspace state.
- `web/src/features/` groups Actions, Runners, GitHub, and development replay by responsibility. Components, hooks, models, types, and contexts use separate folders.
- `web/src/shared/` contains transport code, shared hooks, formatting helpers, and UI primitives.
- `web/lint/` contains tested project rules, including one component or custom hook per production file.
- `src/` contains the Rust CLI, installation and manager services, core runner lifecycle, GitHub access, activity, and HTTP server.
- `scripts/` contains Node command entries and grouped command support.

See [architecture](docs/architecture.md) for the detailed layout and [AGENTS.md](AGENTS.md) for task-specific engineering guidance.

## Documentation

- [User guide](docs/user-guide.md): release setup, commands, permissions, lifecycle, and recovery.
- [Development](docs/development.md): scripts, packaging, and recording workflow executions.
- [Validation](docs/validation.md): repeatable checks, native integration, measurements, and remaining release work.
- [Activity navigation](docs/activity-navigation.md): views, history, logs, and request limits.
- [Domain](docs/domain.md), [product scope](docs/product-scope.md), and [Rust decision](docs/adr/0001-use-rust.md).
