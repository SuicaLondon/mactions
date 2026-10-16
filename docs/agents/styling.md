# Styling

Read this before editing JSX classes or shared CSS. ESLint and Prettier are the executable rules: `eslint-plugin-better-tailwindcss` rejects unknown, conflicting, deprecated, and non-canonical classes, `prettier-plugin-tailwindcss` sorts them, and the local `cn/*` rules enforce the conventions below.

- Use Tailwind v4 standard utilities, shared theme colors, and named viewport/container breakpoints. Use `h-8`, `gap-1.5`, `md:`, `max-md:`, and `@max-xl/panel:`; shared CSS uses `@variant` rather than raw media queries.
- Use flex/grid and standard sizing for available space. `calc()` geometry is rejected in classes, static CSS, and theme tokens. Classes use theme values only; see [Theme values](#theme-values).
- Put utilities on the element they style. Pass contextual classes through props instead of arbitrary selector variants that reach parents, descendants, siblings, or state classes. Use supported styling APIs for third-party controls and built-in variants such as `hover:`, `enabled:`, `aria-expanded:`, and `after:`.
- Compose classes with `cn` from `web/src/shared/lib/cn.ts`. Pass base strings, condition objects, and external `className` as separate arguments. Use explicit maps for variants and keep full utility names statically discoverable.
- Keep class groups at utility boundaries and at most 80 characters, except one indivisible utility. Give each group its own string. `npm run format` applies safe splitting before Prettier sorts classes; condition-object keys and JSX attributes may need manual fixes.
- Use inline `style` only for runtime geometry or data-driven custom properties. Pass class variables through `cn`, not string interpolation. Keep application colors in the shared theme.
- `className` holds Tailwind utilities only; every class must be a theme utility or one registered with `@utility` in `src/styles/`. Mark state or test targets with `data-*` attributes (`data-wrapped`, `data-selected-runner`) or roles, not marker classes. Name class maps `…Classes` so the Tailwind rules check them.

```tsx
className={cn(
  'flex items-center gap-2 rounded-md border border-line',
  'bg-surface px-4 py-2 text-sm',
  {
    'border-accent ring-2 ring-focus': selected,
    'cursor-default opacity-50': disabled,
  },
  className,
)}
```

## Theme values

Classes reuse theme values, so one utility serves the whole app and the CSS bundle stays small. `cn/no-arbitrary-values` rejects arbitrary syntax in class strings, and a lint test applies the same check to `@apply`: `[...]` values, properties, variants, and modifiers, and `(--name)` shorthands. When the value is a spacing step, the error names the replacement and offers it as a suggestion.

| Instead of                                  | Use                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `h-[20px]`, `p-[2px]`, `-mt-[6px]`          | Spacing steps: `h-5`, `p-0.5`, `-mt-1.5`. Any 0.25 step, such as `h-7.25`, is fine.         |
| `w-[1px]`, `w-[100%]`, `text-[12px]`        | Named values: `w-px`, `w-full`, `text-xs`. Prefer a name when one fits.                     |
| `max-[45rem]:`, `@max-[36rem]/panel:`       | Named breakpoints and container sizes: `max-md:`, `@max-5xl:`, `@max-xl/panel:`.            |
| `[&_svg]:size-3`, `group-[.selected]:`      | The class on the element it styles, or a named variant such as `aria-selected:`.            |
| `grid-cols-[auto_1fr]` beside fluid content | Flex: `w-19 shrink-0` on the fixed item and `min-w-0 flex-1` on the fluid one.              |
| `grid-cols-[minmax(--spacing(40),_.8fr)_…]` | A `--grid-template-columns-*` token in `src/styles/theme.css`, used as `grid-cols-runners`. |
| `before:content-[attr(data-number)]`        | An `@utility` in `src/styles/`, such as `before:content-line-number`.                       |
| `before:content-['']`                       | Nothing: `before:` and `after:` utilities already set an empty `content`.                   |
| `bg-accent/[0.3]`                           | A numeric modifier: `bg-accent/30`.                                                         |

Add a theme token or `@utility` only when no existing value fits. Name it for its role and reuse it instead of adding a near-duplicate. Grid templates live in `@theme inline`, so they compile into their utilities and unused ones add nothing to the bundle.
