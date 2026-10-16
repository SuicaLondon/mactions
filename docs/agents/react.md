# React and TypeScript

Read this before editing frontend components or hooks.

- Use strict TypeScript, explicit props, type-only imports, and stable list keys. Handle rejected promises and retain checked types; use no `any` or unchecked assertions to conceal errors.
- Keep rendering pure. Derive values during rendering; use effects only to synchronize with external systems such as the DOM, timers, or browser storage, and avoid them whenever an event handler or derived value works. Follow the configured React Hooks rules.
- Choose between alternative JSX trees inside the component with an early return, or assign the default tree to a `let` and replace it in an `if`. Never add a component only to avoid a ternary. Use boolean `&&` for optional content.
- Keep data subscriptions and cache operations in feature hooks. Preserve query keys, visibility gating, polling intervals, cancellation, and mutation refresh when splitting them.
- Preserve component identity. A file extraction should not reset form drafts, navigation history, selection, or focus.
- Give each hook and component one responsibility. A hook owns one concern and returns only what its callers read; move derived values into pure, tested functions in `models/` instead of returning them from a hook. Split a component whose props serve more than one purpose. Decide the split case by case; there is no size threshold.
- Pass consumers what they read. Do not pass a whole hook result down as a prop; give the child explicit props, or let it call the narrow hook it needs.
- Never use React Context; `createContext` and `useContext` are lint errors. Share complex client state across a subtree with a Zustand store in `stores/`: state and actions together, read through selectors (`useStore((state) => state.field)`, `useShallow` for objects). Seed and reset dialog- or session-scoped stores in an explicit action, such as `open` or `start`, that the opener calls; never in an effect.
- Keep server state in TanStack Query. Share a mutation's status between components with a `mutationKey` and `useMutationState`, not a store.
- Extract navigation, forms, lists, and loading/error/content states with explicit props. Reusable feature components consume props or their own feature's stores, never app stores.
- Keep tests beside the code they exercise and test the user's interactions instead of the extraction's implementation details.
- Prefer `if` / `else`, early returns, and `switch`. Use `switch` for chains with more than four conditional branches; a final `else` does not count. A ternary is allowed only when a statement is impractical, with a narrowly scoped `eslint-disable-next-line no-ternary` comment explaining why.
