# Validation

## Repeatable checks

Run these checks against the current checkout rather than relying on historical test counts:

```sh
npm ci
npm --prefix web ci
npm run format
npm run check:all
```

Build the frontend before compiling Rust, which embeds `web/dist`. See [architecture](architecture.md) for module boundaries and the [README](../README.md) for development startup and packaging.

Root installation activates pre-commit and pre-push hooks. The complete check includes ESLint rule tests, formatting, strict types for all nested TS scripts and JavaScript configuration, frontend tests, the production build, rustfmt, Clippy, and Rust tests. [Tooling](agents/tooling.md) describes staged formatting and the Codex Stop hook.

## Native integration smoke test

`npm run smoke -- PATH_TO_DARWIN_SVC_TEMPLATE PATH_TO_PLIST_TEMPLATE` uses an isolated temporary HOME and data directory, typed API and runner fixtures, and the official macOS service templates in a real user launchd domain. It exercises creation, local lifecycle, persistent stop state, labels, logs, embedded assets, archive reuse, and ordered deletion. It registers no live GitHub runner and removes its temporary service and files on exit. launchd may retain an override for the unique, now-absent test service.

Use the upstream [service script](https://github.com/actions/runner/blob/main/src/Misc/layoutbin/darwin.svc.sh.template) and [LaunchAgent template](https://github.com/actions/runner/blob/main/src/Misc/layoutbin/actions.runner.plist.template).

## Historical memory baseline

The [raw measurements](memory-measurements.json) describe an earlier Apple Silicon release build with an empty fleet, before the current onboarding and activity views. They are not measurements of the current UI or a representative runner fleet.

| Scenario                               | Manager RSS | Manager plus transient subprocesses |
| -------------------------------------- | ----------: | ----------------------------------: |
| Idle, empty fleet                      |    2.14 MiB |                            2.14 MiB |
| Repeated empty-fleet HTTP requests     |    2.92 MiB |                            2.92 MiB |
| Create request, missing authentication |    3.41 MiB |                            5.78 MiB |

Run `npm run --silent memory` to repeat the measurement. The harness samples resident set size approximately every 20 ms plus `ps` overhead; short peaks can be missed and shared pages can be counted more than once. The Node.js harness and its `ps` processes are excluded. No official runner or job was started, and browser memory was excluded. The create case measures authentication failure, not download, registration, or startup.

## Remaining release validation

- Complete real GitHub device authorization through SSH/LAN/Tailscale and verify organization SSO approval against an authorized test organization.
- Exercise real runner registration, interruption of an active job, GitHub's final job conclusion, and remote label changes.
- Verify enabled runners across an actual macOS logout/login and reboot.
- Measure successful creation and a representative active multi-runner fleet on an 8 GB Mac.
- Build and test Intel macOS and older supported macOS versions.
- Complete Developer ID signing and notarization before a signed release.
