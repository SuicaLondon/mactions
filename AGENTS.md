# Working conventions

Read the documents for each field a change touches before editing.

## Frontend

- **TS/JS structure or React:** [structure](docs/agents/structure.md) and [React and TypeScript](docs/agents/react.md).
- **JSX classes or CSS:** [styling](docs/agents/styling.md).
- **UI layout, states, copy, or visual changes:** [design](docs/design.md).

## Backend

- **Rust:** [Rust](docs/agents/rust.md).
- **Module boundaries or new services:** [architecture](docs/architecture.md).

## Tooling

- **Scripts, lint, Git hooks, or agent automation:** [tooling](docs/agents/tooling.md).
- **Dev server or local setup:** [development](docs/development.md).

## Product and domain

- **Product decisions or user-facing behavior:** [product](docs/product.md) and [feature targets](docs/product-scope.md).
- **Domain terms and rules:** [domain](docs/domain.md); for navigation, history, or logs, also [activity navigation](docs/activity-navigation.md).

## Finish every editing task

Run `npm run format` after editing and before validation. Run `npm run check` and the relevant tests for TS/JS changes; run `npm run check:all` for changes spanning frontend and Rust or repository-wide refactors. Fix failures before finishing and report what was verified. [Validation](docs/validation.md) covers native integration and release checks.
