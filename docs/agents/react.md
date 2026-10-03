# React and TypeScript

Read this before editing frontend components or hooks.

- Use strict TypeScript, explicit props, type-only imports, and stable list keys. Handle rejected promises and retain checked types; use no `any` or unchecked assertions to conceal errors.
- Keep rendering pure. Derive values during rendering; use effects only to synchronize with external systems. Follow the configured React Hooks rules.
- Choose alternative JSX trees with early returns in a small named component. Use boolean `&&` for optional content.
- Keep data subscriptions and cache operations in feature hooks. Preserve query keys, visibility gating, polling intervals, cancellation, and mutation refresh when splitting them.
- Preserve provider ownership and component identity. A file extraction should not reset form drafts, navigation history, selection, or focus. Keep stable memoized provider boundaries where they already prevent unrelated polling updates.
- Extract navigation, forms, lists, and loading/error/content states with explicit props. Reusable feature components consume props rather than app contexts; app composition components may consume their app contexts directly.
- Keep tests beside the code they exercise and test the user's interactions instead of the extraction's implementation details.
