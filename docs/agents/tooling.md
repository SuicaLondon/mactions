# Tooling and automatic formatting

Read this before changing developer scripts, lint, formatting, Git hooks, or Codex automation.

## Installation and commands

Run `npm ci` at the root and `npm --prefix web ci`. Root installation runs Husky's `prepare` step and enables the versioned hooks. Keep both lockfiles updated with their corresponding manifests.

`npm run format` runs safe ESLint fixes, Prettier, and rustfmt. It covers frontend code, lint/configuration, developer scripts, and repository Markdown. Agents must run it after editing, before checks, including when lifecycle hooks are unavailable or awaiting trust.

`npm run check` verifies lint, formatting, and strict types for frontend, lint tooling, JavaScript configuration, and all nested developer scripts. `npm test` runs frontend tests with two workers to keep DOM-heavy interactions stable while retaining the normal test timeout. `npm run check:all` builds assets, runs frontend tests, then checks Rust formatting, Clippy, and tests.

## Git hooks

- `.husky/pre-commit` runs lint-staged, the complete TS/JS check, and frontend tests. lint-staged formats only staged files and preserves unstaged hunks using its normal backup/hiding behavior. Rust staged files use rustfmt with child-module traversal disabled, so formatting a staged module does not modify unstaged sibling modules.
- `.husky/pre-push` runs the complete frontend/Rust validation.
- `lint-staged.config.mjs` uses the existing web ESLint/Prettier installation. `scripts/hooks/lint-files.ts` runs ESLint from the appropriate configuration directory.
- `.vscode/settings.json` enables formatting on save with the Prettier and Rust Analyzer extensions and ESLint fixes when saving explicitly.

## Codex Stop hook

`.codex/hooks.json` invokes `scripts/hooks/agent-stop.ts` when the main agent finishes. The script captures formatter output, emits only the JSON required by the Stop protocol, and asks the agent to continue if formatting fails. It does not stage or commit files. Finish parallel subagent edits before the main agent stops.

Codex requires the project configuration and exact hook definition to be trusted before running non-managed hooks. Review the hook with `/hooks` in a new or resumed Codex CLI session; a changed definition needs review again. Hook execution depends on the active Codex environment. See [OpenAI's hooks documentation](https://learn.chatgpt.com/docs/hooks) for the runtime and trust requirements.

## Implementation

Use Node.js 22.13+ or Node.js 24+ with built-in type stripping for TypeScript scripts. Type stripping does not check types; the strict script compiler includes nested support files. Resolve script-owned paths from `scripts/shared/paths.ts` and caller-supplied paths from the caller's directory. Keep `.ts` extensions in imports executed directly by Node.

Local ESLint rules live under `web/lint/{cn,control-flow,date,structure}/`, with rule tests beside each implementation. Keep rule tests meaningful: include rejected cases, accepted cases, and integration with the real configuration. Use the existing configured tools rather than adding duplicate formatting or type systems.
