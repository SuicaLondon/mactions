# Styling

Read this before editing JSX classes or shared CSS. ESLint and Prettier are the executable rules.

- Use Tailwind v4 standard utilities, shared theme colors, and named viewport/container breakpoints. Use `h-8`, `gap-1.5`, `md:`, `max-md:`, and `@max-xl/panel:`; shared CSS uses `@variant` rather than raw media queries.
- Use flex/grid and standard sizing for available space. Arbitrary sizing and `calc()` utilities, including `--spacing()` calculations, are rejected. Do not hide them in static CSS or custom tokens. Complex grid templates may reference `--spacing()` without calculations.
- Put utilities on the element they style. Pass contextual classes through props instead of arbitrary selector variants that reach parents, descendants, siblings, or state classes. Use supported styling APIs for third-party controls and built-in variants such as `hover:`, `enabled:`, `aria-expanded:`, and `after:`.
- Compose classes with `cn` from `web/src/shared/lib/cn.ts`. Pass base strings, condition objects, and external `className` as separate arguments. Use explicit maps for variants and keep full utility names statically discoverable.
- Keep class groups at utility boundaries and at most 80 characters, except one indivisible utility. Give each group its own string. `npm run format` applies safe splitting before Prettier sorts classes; condition-object keys and JSX attributes may need manual fixes.
- Use inline `style` only for runtime geometry or data-driven custom properties. Pass class variables through `cn`, not string interpolation. Keep application colors in the shared theme.

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
