# Code structure

The application has one Rust management core shared by the CLI and embedded web server. The React application is organized around the screens and capabilities users work with. File boundaries follow responsibilities; moving a file does not introduce a new runtime service or API.

## Frontend

```text
web/src/
  app/
    components/         Application entry component
    providers/          Separate provider components and shared prop types
    navigation/         components/, hooks/, models/, context/
    pages/components/   Page selection and feature composition
    runners/            components/, hooks/, context/ for shared workspace state
    setup/              hooks/, context/ for GitHub and first-visit state
    shell/components/   Workspace, notices, header/, filters/
  features/
    runners/            activity/, creation/, dialogs/, inspector/, list/, menu/
                        data/hooks/ and shared/{components,models}/
    actions/
      runs/             components/{list,graph,detail}/, hooks/, models/
      jobs/             components/{tree,workspace,logs}/, hooks/, models/, types/
      history/          components/, hooks/, models/
      data/             hooks/, models/, types/
      shared/           components/, models/
    github/             components/{connection,authorization,status,scope,targets}/
                        hooks/{connection,authorization,targets}/, models/
    replay/             components/{player,graph}/, hooks/, models/recording/, types/
  shared/
    api/                HTTP client, wire types, and query configuration
    hooks/              Query visibility, page visibility, and live duration
    lib/                Pure date, status, and duration formatting
    ui/
      access/           components/ and models/ for capability display and links
      controls/         buttons/ and select/{components,models}/
      duration/         LiveDuration component and tests
      icons/            One icon per file, grouped by purpose
      layout/           Shared inventory column utilities
      loading/          components/, grouped placeholders/, models/
  test/                 Shared test setup
  main.tsx              Bootstrap and query provider
  styles/               Tailwind entry point, theme, and element defaults
```

`app` composes features and owns navigation history, saved filters, and return context. Features own their queries and UI. Shared modules have no dependency on application navigation or feature components. Transport types in `shared/api/types.ts` can also be imported by developer scripts without importing React.

`AppProviders` composes separate single-component provider files that create one navigation state, one Runner workspace, and one GitHub setup state. Each has a separate context consumed by the app sections that need it; there is no combined app controller or chain of layout components forwarding the same props. Navigation owns saved filters, page history, selection, and restoration. The Runner workspace owns the single local fleet operation instance, menus, dialogs, and inspector state. GitHub setup owns confirmed connection state and first-visit guidance. Intent actions such as opening details or creating a runner keep focus bookkeeping and dialog setters inside their owner. Reusable feature views and controls keep explicit props and do not import app contexts.

Separate provider components keep Runner polling from recreating the navigation context. A stable inspector-clear action connects navigation to the Runner workspace without merging their state.

App hooks live in a `hooks/` directory within their responsibility; contexts live separately in `context/`. The Runner inspector hook lives with Runner features. Runner snapshot reads, operations, output reads, target discovery, and creation each own their query or mutation lifecycle. Shared query configuration and visibility handling do not depend on Runner or Actions features.

`features/runners/creation` keeps the creation draft, target discovery, registration steps, settings, and action controls together. `CreateDialog` owns one draft for its entire lifetime and provides it through a dialog-scoped context, so moving Back preserves entered settings. Step components read their own fields without forwarding the whole form through intermediate components. Reusable choice and target controls retain explicit props.

Pure feature models own page projection, deduplication, filtering, target parsing, status rules, and graph geometry. Query hooks derive these results from cached responses, and views consume the results. Search and History status filters remain client-side; they do not change the server query or its cache key.

Actions code separates list browsing, Run selection, dependency layout, the selected Job workspace, and published log rendering. The graph layout is a pure function of declared dependencies, while its view owns source loading and Job selection. The log parser and output viewer stay together so consumers do not need to understand ANSI formatting. Runner lifecycle controls live with Runner components rather than the application shell. Layout, spacing, typography, responsive conditions, and component states use static Tailwind utility classes in JSX. There are no feature-level CSS files. `styles/theme.css` defines shared light/dark tokens, and `styles/base.css` contains element defaults, focus behavior, and animation keyframes. Published log colors use static Tailwind class maps; runtime RGB values and graph coordinates remain inline styles because they come from execution data. The shared dropdown uses the react-select unstyled interface with Tailwind class maps; only runtime menu placement uses its style callback. Dropdown menus align with the complete labeled field, including its label, and clamp to the viewport edge when needed.

Tests live beside the code they exercise, with larger feature harnesses in feature test directories. Test filenames do not determine public interfaces, and no forwarding files or barrel exports exist solely to preserve former file paths.

Icons are named function components imported directly from their own files inside the `actions`, `status`, `git`, `navigation`, `system`, and `playback` directories. `SvgIcon` supplies their common decorative SVG frame. Static uses render a specific component, such as `SearchIcon`; icon buttons accept a component rather than a string name. The small typed `StatusIcon` adapter handles the six activity-state shapes, while playback and runner controls select their named components directly. SVG shapes, class overrides, and decorative accessibility behavior are shared across these uses.

### Loading and data ownership

- The active list owns its inventory or Run query. Organization and repository pickers request remote choices only when opened.
- Opening a Run fetches Job summaries and loads the workflow dependency graph in Overview. Selecting a Job fetches its Steps. Selecting a Step automatically fetches and expands its logs; the full Job log is an explicit overview action.
- Each first load uses a placeholder with the shape of its destination: Runner rows, Run rows, the Run workspace, dependency graph, Job Steps, or History rows.
- Existing rows stay visible during background refresh; a refresh does not replace readable data with skeletons.
- Loading placeholders expose one descriptive status to assistive technology and hide decorative bars. Reduced-motion preferences disable their pulse animation.
- The navigation layer preserves loaded parent data and selection for Back without keeping hidden pages polling.

## Backend

```text
src/
  main.rs               Minimal executable entry point
  cli/mod.rs            CLI parsing, prompts, and command dispatch
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
    normalize.rs        GitHub response normalization
    tests.rs
  github/
    mod.rs              Public connection and log operations
    account.rs          Account, target, and capability access
    auth.rs             Device authorization lifecycle
    jobs.rs             Runner Job lookup
    logs.rs             Published GitHub Job and Step output
    tests/              Account, authentication, and log tests
  native/
    mod.rs              Native adapter type and public path helpers
    commands.rs         Subprocess execution
    paths.rs            GitHub CLI lookup and data-directory discovery
    github.rs           GitHub CLI transport
    service.rs          launchd and runner service inspection
    backend.rs          Backend implementation
    tests.rs
  web/
    mod.rs              HTTP server and embedded assets
    routes.rs           Request routing and response mapping
    tests.rs
```

Existing public module paths remain stable through explicit exports from each `mod.rs`. Internal helpers stay private or visible only to their parent module. The web layer maps requests onto operations; it does not duplicate runner lifecycle rules. The native backend owns operating-system and subprocess details behind the existing `Backend` contract.

There is no new database, background polling service, dependency injection framework, or generic repository layer. `core` separates data, adapter contracts, and orchestration; `logs.rs` remains a cohesive module for bounded local file reads.

## Validation and development

The `scripts/record-ci.ts` entry validates command-line arguments. `scripts/record-ci/capture.ts` owns recording, local runner validation, polling, log collection, and atomic persistence; `scripts/record-ci/github.ts` owns GitHub CLI access and response mapping. The recording format and command options remain unchanged.

```sh
npm --prefix web run check
npm --prefix web test
npm --prefix web run build
cargo test --all-targets
cargo clippy --all-targets -- -D warnings
cargo fmt --all -- --check
cargo build
```

Build the frontend before compiling Rust: the Rust build embeds the generated files in `web/dist`. Do not rebuild that directory concurrently with Cargo compilation. For UI iteration, the Vite development server proxies API requests to the loopback Rust server; see the README for startup commands.
