# Source structure

Read this before moving TS/JS files or adding React components and custom hooks. [Architecture](../architecture.md) describes the concrete directory layout.

- Keep exactly one React component or one custom hook declaration in each production file. A component file may call hooks; declare custom hooks in their own files. Tests may define fixtures, render wrappers, and hook harnesses.
- Use function components with explicit props. Declare components at module scope so rerenders preserve identity, focus, and state.
- Split a view into meaningful sections and loading/error/content states. The parent composes these sections and owns only the state they share. Aim for roughly 150 lines per component; split by responsibility, not by an arbitrary line count.
- Group by feature first, responsibility second, and category within that responsibility: `components/`, `hooks/`, `models/`, `types/`, and `context/`. Create only the categories a feature actually needs. Keep components and hooks in separate directories.
- Group larger component collections by purpose, such as `list/`, `row/`, `overview/`, `logs/`, or `target/`. Reconsider a leaf directory once it has more than eight production component files.
- Keep pure models, transport types, contexts, and configuration out of component files when shared. Small private helpers and a component's own prop types may stay with their owner.
- Keep query subscriptions, cache operations, and external synchronization in feature hooks. Shared code must not depend on app or feature code. App code composes features and owns navigation and shared workspace state.
- Import directly from the owning file. Update callers and tests when moving code; keep no forwarding files or barrels solely to preserve old paths.
- Keep Node command entry points in `scripts/`. Group command support under its command name; shared process/path helpers live in `scripts/shared/`.

The `structure/component-boundaries` ESLint rule enforces production declaration counts, module scope, and separate component/hook directories. Preserve existing behavior and verify the corresponding interaction tests when changing ownership or component identity.
