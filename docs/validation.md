# Validation

Validated on an Apple Silicon Mac running macOS 27.0, using a release build of mactions 0.1.0 and bundled GitHub CLI 2.96.0. The application itself does not require the development toolchain.

## Automated checks

- 27 Rust tests pass: lifecycle ordering, persistent desired state, partial-registration recovery, collision detection, cross-process mutation exclusion, custom-label rules, GitHub status uncertainty, path/symlink protection, API pagination, inaccessible-target deletion protection, token redaction, bounded subprocess output, web mutation checks, token-only local lifecycle, safe bounded log reads, device-code login state, and assigned-job filtering without inferring write permission.
- `cargo clippy --all-targets -- -D warnings` passes.
- `cargo fmt --check` passes.
- 18 frontend tests pass: search and keyboard selection, preserving form edits during refresh, custom-label clearing, deletion confirmation/cancellation, create payloads, failed-stop handling, visible-only polling, mutation deduplication/completion while hidden, token-only creation, retained forms after SSO/registration denial, disconnected local logs, device authorization links, three-step Add Runner navigation with retained form values, on-demand target selection, separate manual entry, scope-aware URL validation, and automatic registration without a separate read access check.
- `npm --prefix web run build` passes strict TypeScript checking and produces the Vite production assets.
- The release archive includes the native executable, the checksum-verified official GitHub CLI, and third-party license notices.
- All developer scripts and typed fixtures pass strict TypeScript checking via `npm run typecheck`. The TypeScript packaging entry point, isolated native smoke test, and RSS harness have been executed successfully; the test and measurement commands also work from outside the repository.

## Native integration smoke test

`npm run smoke -- PATH_TO_DARWIN_SVC_TEMPLATE PATH_TO_PLIST_TEMPLATE` runs with an isolated temporary HOME and data directory. It uses fixtures authored and type-checked in TypeScript for GitHub API responses, runner configuration, and the worker, while installing the actual upstream macOS `svc.sh` and LaunchAgent plist template into a real user launchd domain. Fixture entrypoints retain the required upstream filenames (`config.sh` and `runsvc.sh`) but execute generated JavaScript through a Node.js shebang. The test serializes the fixture functions after Node removes their type annotations. No live GitHub runner is registered and no existing runner is touched.

Verified: token-only creation and local start/stop without API authentication, registration tokens absent from saved records, GitHub connection status, local log responses, embedded Vite HTML/JavaScript/CSS responses (matching built asset bytes and MIME types), cached archive checksum/reuse, automatic start after creation, service restart, persistent launchd disable on stop, label changes shared between CLI and Web, web-server shutdown leaving the worker running, and ordered deletion preserving the shared archive. Paths containing spaces are exercised. The script removes its temporary service and files on exit. launchd may retain an enabled override entry for the unique, now-absent test service.

The service templates used for this test came from the official `actions/runner` repository:

- https://github.com/actions/runner/blob/main/src/Misc/layoutbin/darwin.svc.sh.template
- https://github.com/actions/runner/blob/main/src/Misc/layoutbin/actions.runner.plist.template

## Browser checks

The following manual browser checks describe the earlier dashboard baseline. The new onboarding and activity views are covered by the automated React tests above; a live GitHub authorization/SSO flow has not been performed with a real account.

The embedded React production UI was opened in a real browser. Checked the empty state, create form, invalid-target error, populated runner table and inspector, keyboard selection, search, deletion confirmation, Escape cancellation with focus restoration, and a 390-pixel-wide layout without horizontal overflow. No browser console warnings or errors were observed. Browser testing used disposable local fixture data.

## Memory

Measurements are sampled resident set size (RSS), not allocation counts or binary size. Run `npm run --silent memory`; see [raw measurements](memory-measurements.json). The harness launches the actual release bundle with an empty managed fleet and isolated, unauthenticated GitHub CLI configuration. It samples the manager and all its descendant processes approximately every 20 ms plus `ps` overhead. The Node.js measurement harness and its `ps` processes are excluded. Shorter peaks can be missed, and summed RSS may count shared pages more than once.

Earlier baseline maxima from the packaged React/Vite build run, before the onboarding, device authorization, jobs, and local-log views. These paths have not been remeasured. The active phase requests the HTML and its actual hashed JavaScript/CSS assets, then repeatedly queries the empty fleet. Production runs only the Rust server, with no Node.js or Vite process:

| Scenario | Manager RSS | Manager plus transient subprocesses |
| --- | ---: | ---: |
| Idle, empty fleet | 2.14 MiB | 2.14 MiB |
| Repeated empty-fleet HTTP requests | 2.92 MiB | 2.92 MiB |
| Create request, missing authentication | 3.41 MiB | 5.78 MiB |

These are baseline smoke measurements, not a full-fleet memory guarantee. Transient subprocess maxima vary considerably between samples and runs; differences from prior runs do not establish a memory optimization. The create measurement exercises an authentication failure with the real bundled `gh`; it does not measure a successful runner download, registration, or official runner startup. Those operation peaks remain to be measured against an authorized live target.

Official runner and job processes: none were running in the memory harness, so their memory is not included. Browser memory: excluded and not separately measured because the preview uses a browser shared with the host application. Neither category should be attributed to the manager's idle RSS.

## Remaining release checks

- Complete real GitHub device authorization through SSH/LAN/Tailscale and verify SSO/organization approval against an authorized test organization. Automated auth tests use a fixture CLI.
- Validate the new onboarding/activity layout in a browser at desktop and mobile widths.

- Register a real runner against an authorized test repository/organization; run and interrupt a job; verify GitHub's reported job conclusion and remote label changes.
- Verify startup across an actual macOS logout/login and reboot. The smoke test verifies the persisted launchd disable override, but does not reboot the host.
- Measure a representative multi-runner fleet, successful creation peaks, and active jobs on an 8 GB Mac.
- Build/test Intel macOS and older supported macOS versions; this artifact is Apple Silicon only.
- Developer ID signing and notarization are not included in this development release.
