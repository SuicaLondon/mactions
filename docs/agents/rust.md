# Rust

Read this before editing Rust code.

- Follow the configured Rust 2021 rustfmt style and Clippy checks in `Cargo.toml`.
- Use snake_case for functions/modules and PascalCase for types. Keep modules focused on one responsibility.
- Prefer owned values at boundaries and borrowed arguments within modules. Propagate recoverable failures with `Result` and `?`, adding useful context.
- Keep `unsafe` blocks narrow and explain their safety assumptions. Use assertions and unwraps for tests or established invariants, not recoverable runtime failures.
- Run `cargo fmt --all -- --check`, `cargo clippy --all-targets -- -D warnings`, and relevant Rust tests. Build the frontend before Cargo when embedded assets change; `npm run check:all` performs these steps in order.
- Put unit tests in a `#[cfg(test)] mod tests;` module. Inline small suites; move a larger suite to `module/tests.rs` beside `module.rs` (or `tests.rs` beside `mod.rs`). Do not use `#[path]` attributes. Integration tests that use only the public crate API live in the top-level `tests/` directory.
