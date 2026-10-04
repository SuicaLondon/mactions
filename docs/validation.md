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

Root installation activates pre-commit and pre-push hooks. The complete check includes ESLint rule tests, formatting, strict types for all nested TS scripts and JavaScript configuration, frontend tests, the production build, rustfmt, Clippy, Rust tests, and installer/Homebrew distribution checks. [Tooling](agents/tooling.md) describes staged formatting and the Codex Stop hook.

## Installation and update checks

```sh
npm run test:install
npm run test:homebrew
cargo test installation::
```

The installer check uses an isolated temporary HOME, locally generated archive/checksum fixtures, and fake manager commands. It covers installer flags, PATH/service command dispatch, archive integrity, unsafe archive paths/links, and conflicting installation ownership. It makes no real GitHub request and installs no real launchd service. The Homebrew checks validate compatibility manifests, final archive checksums, generated formula behavior, and Ruby syntax; they do not install a tap or run `brew services`.

Rust installation tests cover local-default settings, owned service/source validation, stable-release and checksum parsing, archive safety, operation locks, persistent update status, activation, and rollback. Their service/activation fixtures do not establish successful real login, reboot, or network authorization. See the remaining native checks below.

The [v0.1.0 release workflow](https://github.com/SuicaLondon/mactions/actions/runs/37150481955) completed signing/notarization and publishing successfully. Inspection of that arm64 archive found macOS 11.0 as the manager's deployment target and macOS 12.0 for bundled `gh 2.96.0`, making macOS 12 the full bundle's binary floor. That inspection is separate from running the application on macOS 12. CI currently checks macOS 15; the native acceptance checks below remain incomplete, and the separate tap still requires publication.

For an optional real manager-service check, first package a local archive, then run:

```sh
npm run package
npm run test:manager -- dist/mactions-0.2.0-macos-arm64.tar.gz
```

This requires an Apple Silicon Mac with a current GUI login session and refuses to run when port 8787 is occupied. It installs the offline archive into a temporary HOME, uses a unique data directory/launchd label, checks actual manager service and network-setting restarts through version/data-directory/PID health, and verifies that uninstall preserves data and fixture credentials. It registers no real runner and makes no GitHub request. Cleanup removes its service and temporary files; launchd may retain an enabled override for the unique, now-absent label. The test is separate from `check:all`; it does not establish reboot/login or fresh-Mac Gatekeeper behavior.

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
- Test the signed installer on a fresh Apple Silicon Mac without Rust, Node.js, Homebrew, or existing `gh`; verify PATH setup, first authorization, localhost access, and installation over SSH without a GUI login session.
- Verify manager and enabled-runner startup across actual logout/login and reboot; confirm manually stopped runners remain stopped and no pre-login startup is promised.
- Toggle LAN access from the Mac and a remote browser; verify manager reconnection and continued execution of an active runner job.
- Apply a real signed manager update while a runner job is active; verify data/job preservation, expected manager version/data-directory health, and restoration after an intentionally failed manager startup.
- Publish and test the separate Homebrew tap on a supported Mac: install, `brew test mactions`, service startup, upgrade, and manager-only uninstall.
- Test installer reruns, corrupted/incompatible downloads, failed service startup, and uninstall; confirm runner services, data, and GitHub credentials survive.
- Measure successful creation and a representative active multi-runner fleet on an 8 GB Mac.
- Run installation, GitHub authorization, service lifecycle, and update tests on macOS 12–14; the stated minimum is not yet a completed native test matrix. Intel distribution is outside this release.
- Verify Gatekeeper for the signed/notarized release on a fresh Mac with an internet connection.
