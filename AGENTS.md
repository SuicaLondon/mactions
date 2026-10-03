# Working conventions

Keep changes small and direct. Preserve unrelated work. Write code, comments, and repository documents in English; explain technical terms to the user in both Chinese and English.

Prefer `if` / `else`, early returns, and `switch`. Use `switch` for chains with more than four conditional branches; a final `else` does not count. A ternary is allowed only when a statement is impractical, with a narrowly scoped `eslint-disable-next-line no-ternary` comment explaining why.

## Read before editing

- **TS/JS structure or React:** read [structure](docs/agents/structure.md) and [React](docs/agents/react.md).
- **JSX classes or CSS:** also read [styling](docs/agents/styling.md).
- **Rust:** read [Rust](docs/agents/rust.md).
- **Scripts, lint, Git hooks, or agent automation:** read [tooling](docs/agents/tooling.md).
- **Domain behavior:** read [domain](docs/domain.md); for navigation, history, or logs, also read [activity navigation](docs/activity-navigation.md).

## Finish every editing task

Run `npm run format` after editing and before validation. Run `npm run check` and the relevant tests for TS/JS changes; run `npm run check:all` for changes spanning frontend and Rust or repository-wide refactors. Fix failures before finishing and report what was verified. [Validation](docs/validation.md) covers native integration and release checks.
