# Code structure

The application has one Rust management core shared by the CLI and embedded web server. The React application is organized around the screens and capabilities users work with. File boundaries follow responsibilities; moving a file does not introduce a new runtime service or API.

## Frontend

```text
web/src/
  app/
    components/         Application entry component
    session/            startAppSession(), which seeds every app store
    navigation/         components/, hooks/, models/, stores/
    pages/components/   Page selection and feature composition
    runners/            components/, hooks/, models/, stores/ for shared workspace state
    setup/              hooks/, models/, stores/ for GitHub and first-visit state
    shell/              components/ with filters/ and notices/, hooks/, models/
  features/
    runners/            activity/, creation/, dialogs/, inspector/, list/, menu/
                        data/{hooks,models,stores}/ and shared/{components,models}/
    actions/
      runs/             components/{list,graph,detail}/ with graph/layout/, hooks/, models/
      jobs/             components/{card,tree,workspace,logs}/, hooks/, models/, types/
                        workspace/overview/ and logs/{lines,toolbar}/
      history/          components/ with table/ and table/steps/, models/
      data/             hooks/, models/, types/
      shared/           components/ with table/, hooks/, models/, types/
    github/             components/ with account/, connection/, connection/guide/, hooks/, models/
    manager/            Settings, network access, version checks, update progress
                        components/ with update/, hooks/, models/, types/
    replay/             components/{player,graph}/, hooks/, models/, types/
  shared/
    api/                HTTP client, wire types, and query configuration
    hooks/              Query visibility, page visibility, and live duration
    lib/                Pure date, status, and duration formatting
    ui/
      controls/         buttons/ and select/{components,hooks,models}/
      dialog/           ModalDialog and its modal lifecycle hook
      duration/         LiveDuration component and tests
      feedback/         Error states, update-failed indicators, and clamped messages
      icons/            One icon per file and the shared SvgIcon wrapper
      loading/          Skeleton region, skeleton shapes, inline loading, and spinner
  test/                 Shared test setup
  main.tsx              Bootstrap and query provider
  styles/               Tailwind entry point, theme, and element defaults
```

`app` composes features and owns navigation history, saved filters, and return context. Features own their queries and UI. Shared modules have no dependency on application navigation or feature components. Transport types in `shared/api/types.ts` can also be imported by developer scripts without importing React.

Shared client state lives in Zustand stores, one per concern; there are no React contexts or provider components. `startAppSession()` seeds them from saved preferences before `App` renders, and tests call it before each render. The navigation store owns saved filters, page history, and selection; `usePageRestoration` follows its history changes to restore scroll positions and cached page data. The Runner workspace store owns menus and dialogs, and opening Add runner starts the creation store with the list's scope. The welcome store owns first-visit guidance. Features own their own stores: the Runner inspector, the single local fleet operation (its lock, sync window, and notice), and the Add runner draft. Components select only the fields they read. `App` mounts `useRunnerPolling` once, and components read the Runner snapshot through narrow hooks that never fetch (`useRunnersLoading`, `useLocalRunners`, `useRunnerOperationLocked`, `useRunnerSnapshot`), so Runner polling does not rerender navigation consumers. Reusable feature views and controls keep explicit props and do not import app stores.

App hooks, models, and stores live in `hooks/`, `models/`, and `stores/` within their responsibility. Runner snapshot reads, operations, output reads, target discovery, and creation each own their query or mutation lifecycle. Shared query configuration and visibility handling do not depend on Runner or Actions features.

`features/runners/creation` keeps the creation draft, target discovery, registration steps, settings, and action controls together. The opener starts one draft in the creation store for each dialog session, so moving Back preserves entered settings. Step components select their own fields, read the request status through `useMutationState`, and take readiness from the pure `getCreationReadiness` model. Reusable choice and target controls retain explicit props.

Pure feature models own page projection, deduplication, filtering, target parsing, status rules, and graph geometry. Query hooks derive these results from cached responses, and views consume the results. Search and History status filters remain client-side; they do not change the server query or its cache key.

Actions code separates list browsing, Run selection, dependency layout, the selected Job workspace, and published log rendering. The graph layout is a pure function of declared dependencies, while its view owns source loading and Job selection. The log parser and output viewer stay together so consumers do not need to understand ANSI formatting. Runner lifecycle controls live with Runner components rather than the application shell. Layout, spacing, typography, responsive conditions, and component states use static Tailwind utility classes in JSX. There are no feature-level CSS files. `styles/theme.css` defines shared light/dark tokens, and `styles/base.css` contains element defaults, focus behavior, and animation keyframes. Published log colors use static Tailwind class maps; runtime RGB values and graph coordinates remain inline styles because they come from execution data. The shared dropdown uses the react-select unstyled interface with Tailwind class maps; only runtime menu placement uses its style callback. Dropdown menus align with the complete labeled field, including its label, and clamp to the viewport edge when needed.

Tests live beside the file they exercise as `name.test.ts(x)`; a test that composes several sibling areas, such as `features/actions/ActivityViews.test.tsx`, sits in their closest common directory. Test filenames do not determine public interfaces, and no forwarding files or barrel exports exist solely to preserve former file paths.

Icons are named function components, one per file in `shared/ui/icons/`, imported directly. `SvgIcon` supplies their common decorative SVG frame. Static uses render a specific component, such as `SearchIcon`; icon buttons accept a component rather than a string name. The small typed `StatusIcon` adapter handles the six activity-state shapes, while playback and runner controls select their named components directly. SVG shapes, class overrides, and decorative accessibility behavior are shared across these uses.

### Loading and data ownership

- The active list owns its inventory or Run query. Organization and repository pickers request remote choices only when opened.
- Opening a Run fetches Job summaries and loads the workflow dependency graph in Overview. Selecting a Job fetches its Steps. Selecting a Step automatically fetches and expands its logs; the full Job log is an explicit overview action.
- Each first load uses a skeleton with the shape of its destination: Runner rows, Run rows, the Run workspace, dependency graph, Job Steps, or History rows. A skeleton lives beside the component it mirrors, such as `RunnerGridSkeleton` beside `RunnerGrid`; `shared/ui/loading` holds only the `Skeleton` region and generic shapes (`SkeletonLine`, `SkeletonText`, `LogLinesSkeleton`).
- Existing rows stay visible during background refresh; a refresh does not replace readable data with skeletons.
- `Skeleton` exposes one descriptive status to assistive technology and hides the decorative bars. Reduced-motion preferences disable their pulse animation.
- The navigation layer preserves loaded parent data and selection for Back without keeping hidden pages polling.

## Backend

```text
src/
  main.rs               Minimal executable entry point
  cli.rs                CLI parsing, prompts, and command dispatch
  lib.rs                Public module surface
  core/
    mod.rs              Stable public management interface
    model.rs            Runner records, targets, creation input, label validation
    backend.rs          Operating-system and GitHub adapter contract
    manager.rs          Lifecycle orchestration and persistent records
  logs.rs               Bounded local runner diagnostic and service log reads
  activity/
    mod.rs              Public activity operations and Scope export
    scope.rs            Repository scope discovery
    inventory.rs        Scoped runners and current work summaries
    runs.rs             Run listing and attempt selection
    jobs.rs             Job detail and historical execution lookup
    topology/           Immutable workflow source, declared dependencies, Job mapping
    read.rs             Bounded parallel reads, pagination, and refresh cadence
    cache.rs            Bounded memory of completed Run attempts' Job lists
    normalize.rs        GitHub response normalization
    tests.rs
  github/
    mod.rs              Public connection and log operations
    account.rs          Account, target, and capability access
    auth.rs             Device authorization lifecycle
    jobs.rs             Runner Job lookup
    logs.rs             Published GitHub Job and Step output
    {account,auth,jobs,logs}/tests.rs  Unit tests for each GitHub module
  native/
    mod.rs              Native adapter type and public path helpers
    commands.rs         Subprocess execution
    paths.rs            GitHub CLI lookup and data-directory discovery
    api.rs              GitHub REST transport and error mapping
    github.rs           JSON requests and published-log downloads
    service.rs          launchd and runner service inspection
    backend.rs          Backend implementation
    test_api.rs         Loopback REST fixture for tests
    tests.rs
  installation/
    config.rs           Saved manager network settings
    service.rs          Owned manager login service and installation source
    update.rs           Verified manager updates, activation, rollback, status
    uninstall.rs        Manager-only removal that preserves runners and data
  web/
    mod.rs              HTTP server and embedded assets
    manager.rs          Settings, health, and detached manager operations
    routes.rs           Request routing and response mapping
    tests.rs
```

Existing public module paths remain stable through explicit exports from each `mod.rs`. Internal helpers stay private or visible only to their parent module. The web layer maps requests onto operations; it does not duplicate runner lifecycle rules. The native backend owns operating-system and subprocess details behind the existing `Backend` contract.

### GitHub API transport

GitHub CLI owns sign-in and stores the token. The native adapter reads the token with `gh auth token --hostname github.com` and caches it for 60 seconds. It sends REST and GraphQL requests itself through one `ureq` agent that keeps up to 16 connections alive, enough for every parallel activity reader. Connection checks always reread the token. A 401 response to a cached token rereads it once before asking the user to sign in again. Requests keep the earlier headers (`Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`), the 45-second timeout, and the 2 MiB response limit. The error mapping is unchanged: 401 asks the user to run `mactions auth login`. A missing `admin:org` scope, worked out from `X-Accepted-OAuth-Scopes` and `X-OAuth-Scopes` the way GitHub CLI does, explains how to reauthorize. SSO comes from `X-GitHub-SSO` or SAML text, then organization approval, then 403/404 as denied access. Proxy environment variables are honored. Published log downloads and the step-log fallback still run through `gh`, which follows GitHub's signed redirects.

TLS uses `native-tls`, which calls macOS Security.framework and trusts the system keychain like `gh` does. It does not compile a crypto library. Rustls would add `ring` and its C and assembly build. The dependencies are MIT or Apache-2.0, except `webpki-root-certs` (CDLA-Permissive-2.0). ureq's `native-tls` feature pulls that crate in even though the platform roots are used. The license notice generator includes all of them. The arm64 release binary grew from 2.44 MB to 2.81 MB (+0.37 MB). The Homebrew formula still bundles `gh` for sign-in and log downloads.

Measured on 2026-10-15 against an organization runner with seven repositories, using release builds: a runner-filtered Runs page (`/api/activity/runs?runner_id=1`) makes 61 API calls, 7 Run lists and 54 per-Run Job lists. With eight readers that is about seven sequential rounds. The median time stayed the same within noise: 5.91 s before and 5.81 s after (n=8 each; `/api/activity/work` 1.50 s → 1.46 s). TCP and TLS setup to `api.github.com` takes about 22 ms. GitHub's own response time is 0.3–0.8 s per call. Keep-alive therefore saves about 80 ms per call (`/user` 385 → 300 ms; organization runner list 590 → 535 ms), and the page is bound by GitHub latency multiplied by fan-out. Spawning no `gh` processes is the main gain. Five Runs pages and four Work loads used 17.4 s of CPU before and 0.4 s after, about 330 fewer `gh` processes. That matters because visible pages poll. After two Runs pages, the manager's own resident memory rose from 8.8 MiB to 21 MiB (Security.framework plus pooled connections). Before, up to eight concurrent `gh` processes were added on top while a page loaded. Lower page latency needs fewer calls, not a faster transport; the next section removes most of them.

### Completed Job lists

A completed Run attempt's Job list never changes, so the activity layer keeps it in memory instead of asking GitHub again. `activity/cache.rs` holds these lists for the life of the process, owned by `Manager`; the `Backend` contract is unchanged. Each list is keyed by repository (case-insensitive), Run ID, attempt, and whether it covers every attempt (`filter=all`) or one attempt. The latest attempt and the same attempt requested by number share one entry. A list is stored only when the Run or attempt metadata read in the same request reports `completed` and every Job in the list is `completed`. Queued, waiting, and in-progress Runs, and completed Runs whose Jobs are still settling, are read from GitHub every time. A rerun raises `run_attempt`, which is a new key, so the earlier list is never served for it. Lists are stored without Steps, because every Job list reader omits them; a selected Job still reads its Steps directly. The cache holds at most 2,048 Jobs in total and evicts the least recently used lists first; a larger single list is not stored. Runner-filtered Runs, Job History, Run details, and the dependency graph all read through it. Remembered lists cost no reads, so they no longer stretch the refresh interval. Restarting the manager empties it; there is no persistent copy.

Measured on 2026-10-15 with the same runner and release builds, eight loads each of `/api/activity/runs?runner_id=1`: before, the median was 5.47 s (4.94–6.25 s) and every load made 61 calls. After, the first load still takes about 5.9 s and fills the cache; repeated loads take a median of 1.99 s (1.67–2.39 s). What remains is repository discovery plus the 7 Run lists, about two rounds of GitHub latency. The refresh interval reported for this page fell from 126 s to the 30 s default, which still means fewer calls per minute (about 16 instead of 29). `/api/activity/work` reads only active Runs and is unchanged (about 1.2 s). Manager memory after two Runs pages stayed below the earlier figure (12 MiB).

There is no new database, background polling service, dependency injection framework, or generic repository layer. `core` separates data, adapter contracts, and orchestration; `logs.rs` remains a cohesive module for bounded local file reads.

`installation` owns manager configuration and distribution independently of runner lifecycle. Script installations use a stable `current/mactions` entrypoint under `~/.local/share/mactions`; updates stage and verify an entire bundle before an atomic link switch. Failed startup restores the prior release. Homebrew sources delegate file ownership and service commands to Homebrew. The manager's operation lock prevents its update or restart from interrupting pending runner mutations.

Manager settings default to loopback access and are saved under the selected data directory. Web mutations launch a detached CLI helper for restarts and updates so the request can finish before the serving process exits. The updater persists progress and errors, and the UI reconnects only after the new manager reports its version and data directory. Runner services remain separate launchd jobs throughout these operations.

## Validation and development

The `scripts/record-ci.ts` entry validates command-line arguments. `scripts/record-ci/capture.ts` owns recording, local runner validation, polling, log collection, and atomic persistence; `scripts/record-ci/github.ts` owns GitHub CLI access and response mapping. The recording format and command options remain unchanged.

```sh
npm run check
npm test
npm run build
cargo test --all-targets
cargo clippy --all-targets -- -D warnings
cargo fmt --all -- --check
cargo build
```

Build the frontend before compiling Rust: the Rust build embeds the generated files in `web/dist`. Do not rebuild that directory concurrently with Cargo compilation. For UI iteration, the Vite development server proxies API requests to the loopback Rust server; see the README for startup commands.
