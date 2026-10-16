# Tooling and automatic formatting

Read this before changing developer scripts, lint, formatting, Git hooks, or Codex automation.

## Installation and commands

Run `npm ci` at the repository root. One `package.json` and lockfile cover the frontend, lint rules, and developer scripts. Installation runs Husky's `prepare` step and enables the versioned hooks.

`npm run format` runs safe ESLint fixes, Prettier, and rustfmt, using the ESLint and Prettier caches. It covers frontend code, lint/configuration, developer scripts, and repository Markdown. Agents must run it after editing, before checks, including when lifecycle hooks are unavailable or awaiting trust.

`npm run check` verifies lint, formatting, and strict types for frontend, lint tooling, JavaScript configuration, and all nested developer scripts. `npm test` runs frontend tests with two workers to keep DOM-heavy interactions stable while retaining the normal test timeout. `npm run check:all` builds assets, runs frontend tests, then checks Rust formatting, Clippy, and tests.

## Git hooks

- `.husky/pre-commit` runs lint-staged, the complete TS/JS check, and frontend tests. lint-staged formats only staged files and preserves unstaged hunks using its normal backup/hiding behavior. Rust staged files use rustfmt with child-module traversal disabled, so formatting a staged module does not modify unstaged sibling modules.
- `.husky/pre-push` runs the complete frontend/Rust validation.
- The `lint-staged` key in `package.json` runs ESLint fixes and Prettier on staged TS/JS files and Prettier on other staged text files.
- `.vscode/settings.json` enables formatting on save with the Prettier and Rust Analyzer extensions and ESLint fixes when saving explicitly.

## Agent formatting hooks

The `PostToolUse` hooks in `.claude/settings.json` and `.codex/hooks.json` run `npm run format` after each agent file edit; there is no separate hook script. ESLint and Prettier use their `--cache` options, so repeated runs only process files that changed since the last run. The root `format` scripts add the rustup locations to `PATH` for `cargo fmt`. If formatting or a lint fix fails, the hook exits with code 2 and returns the output to the agent. It does not undo the edit, stage, or commit files.

Codex requires the project configuration and exact hook definition to be trusted before running non-managed hooks. Review the hook with `/hooks` in a new or resumed Codex CLI session; a changed definition needs review again. Hook execution depends on the active Codex environment. See [OpenAI's hooks documentation](https://learn.chatgpt.com/docs/hooks) for the runtime and trust requirements.

## Implementation

Write scripts and configuration in TypeScript, never `.mjs` or `.js`; the `structure/typescript-only` lint rule rejects JavaScript sources. Use Node.js 22.18+ or Node.js 24+ with built-in type stripping for TypeScript scripts and the ESLint and Prettier configurations. Type stripping does not check types; the strict script compiler includes nested support files. Resolve script-owned paths from `scripts/shared/paths.ts` and caller-supplied paths from the caller's directory. Keep `.ts` extensions in imports executed directly by Node. The root `tsconfig.json` checks scripts, lint rules, and root configuration with Node options; `web/tsconfig.json` checks the app and its Vite configuration.

`eslint.config.ts` at the root is the only ESLint configuration; its file patterns are relative to the root, and `npm run lint` checks the whole repository in one run. Do not add another ESLint configuration file. Prettier formats every file that `.gitignore` and `.prettierignore` do not exclude.

Vite and Vitest keep their configuration in `web/` and run with `web` as their root (`vite web`, `vitest --root web`). Tailwind scans for class names from the Vite root, so keep it there; a repository-root Vite root would also scan Rust sources, docs, and lint fixtures.

Local ESLint rules live under `lint/{cn,control-flow,date,structure}/`, with rule tests beside each implementation. Keep rule tests meaningful: include rejected cases, accepted cases, and integration with the real configuration. Use the existing configured tools rather than adding duplicate formatting or type systems.
