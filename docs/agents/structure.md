# Source structure

Read this before moving TS files or adding React components, custom hooks, or stores. [Architecture](../architecture.md) describes the concrete directory layout.

- Declare at most one React component, custom hook, or Zustand store in each production file, exported or not. Plain helper functions are unlimited. A second component gets its own file, even when only one parent renders it. When a component would only choose between elements, choose inside the parent instead, as [React and TypeScript](react.md) describes. Tests may define fixtures, render wrappers, and hook harnesses.
- Use function components with explicit props. Declare components at module scope so rerenders preserve identity, focus, and state.
- Split a view into meaningful sections and loading/error/content states. The parent composes these sections and owns only the state they share. Aim for roughly 150 lines per component; split by responsibility, not by an arbitrary line count.
- Group by feature first, responsibility second, and category within that responsibility: `components/`, `hooks/`, `stores/`, `models/`, and `types/`. Create only the categories a feature actually needs. Keep components, hooks, and stores in separate directories.
- Group larger component collections by purpose, such as `list/`, `row/`, `logs/`, or `target/`. Add a purpose directory only once it holds at least three files, and reconsider a leaf directory once it has more than eight production component files.
- Keep pure models, transport types, and configuration out of component files when shared. Small private helpers and a component's own prop types may stay with their owner.
- Keep query subscriptions, cache operations, and external synchronization in feature hooks. Shared code must not depend on app or feature code. App code composes features and owns navigation and shared workspace state.
- Colocate tests with the file they exercise and name them after it, such as `RunnerList.test.tsx` beside `RunnerList.tsx`. Do not create `tests/` directories inside features.
- Import directly from the owning file. Update callers and tests when moving code; keep no forwarding files or barrels solely to preserve old paths.
- Keep a loading skeleton beside the component whose layout it mirrors, wrapped in the shared `Skeleton` region with its own label. Shared loading code holds only generic shapes; never add a `kind` switch of feature layouts to it.
- Keep Node command entry points in `scripts/`. Group command support under its command name; shared process/path helpers live in `scripts/shared/`.

The `structure/component-boundaries` ESLint rule enforces one component, custom hook, or store per production file, private ones included. It also enforces module scope and separate component, hook, and store directories. Preserve existing behavior and verify the corresponding interaction tests when changing ownership or component identity.
