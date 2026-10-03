# mactions

A small native manager for self-hosted GitHub Actions runners on macOS. Manage runners with the CLI or an embedded web UI, inspect workflow Runs and Jobs, and compare Job History. Both interfaces use the same Rust management core.

## Run a release

Extract the release archive and keep `mactions` beside its bundled `libexec/gh`:

```sh
./mactions auth status
./mactions serve --bind 127.0.0.1:8787
```

Open <http://localhost:8787>. If GitHub authentication is missing, choose **Connect GitHub** or run `./mactions auth login`. Release users need no Rust, Node.js, Homebrew, or separate GitHub CLI installation. Workflow-specific tools such as Xcode remain your responsibility.

`./mactions serve` listens on `0.0.0.0:8787`, allowing LAN access. There is no application login: anyone who can reach the service can manage runners with the host account's permissions. Use the loopback bind above for access from this Mac only. Run as the owning macOS user, without `sudo`.

The current development release targets Apple Silicon and is not Developer ID signed or notarized. Native Intel packaging is supported by the script but remains untested.

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
npm run check:all    # Build, frontend tests, Rust formatting/Clippy/tests
npm run package      # Native release with bundled gh and license notices
```

Root installation enables Git hooks: pre-commit formats staged files and checks TS/JS plus frontend tests; pre-push runs the complete validation. The project also includes editor format-on-save settings and a Codex Stop hook for automatic formatting. Review and trust that hook through `/hooks` before its first execution; see [tooling](docs/agents/tooling.md).

## Source layout

- `web/src/app/` composes pages, providers, navigation, and shared workspace state.
- `web/src/features/` groups Actions, Runners, GitHub, and development replay by responsibility. Components, hooks, models, types, and contexts use separate folders.
- `web/src/shared/` contains transport code, shared hooks, formatting helpers, and UI primitives.
- `web/lint/` contains tested project rules, including one component or custom hook per production file.
- `src/` contains the Rust CLI, core lifecycle, GitHub access, native services, activity, and HTTP server.
- `scripts/` contains Node command entries and grouped command support.

See [architecture](docs/architecture.md) for the detailed layout and [AGENTS.md](AGENTS.md) for task-specific engineering guidance.

## Documentation

- [User guide](docs/user-guide.md): release setup, commands, permissions, lifecycle, and recovery.
- [Development](docs/development.md): scripts, packaging, and recording workflow executions.
- [Validation](docs/validation.md): repeatable checks, native integration, measurements, and remaining release work.
- [Activity navigation](docs/activity-navigation.md): views, history, logs, and request limits.
- [Domain](docs/domain.md), [product scope](docs/product-scope.md), and [Rust decision](docs/adr/0001-use-rust.md).
