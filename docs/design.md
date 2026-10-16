# Design

The web UI looks and behaves like a small macOS utility window: the system font, 12px UI text, light grey chrome around a white content surface, native-style buttons, and a segmented control for Runners and Runs. Hierarchy comes from weight, surface tone, and hairline dividers rather than colour or size. Read [styling](agents/styling.md) for how these rules are written in Tailwind.

## Layout stability

User actions and background refreshes never move surrounding content.

- Button busy states use `PendingLabel` (`web/src/shared/ui/controls/buttons/PendingLabel.tsx`), which stacks the idle and busy labels in one grid cell so the button keeps its width.
- Dialogs are anchored near the top, so content growth extends downward. Errors appear below the dialog actions; in Add runner, a creation failure covers the target step inside the step's reserved box, like the setup progress notice, so the dialog keeps its size and the footer never moves. Edit settings returns to the form; Create runner retries.
- Settings keeps Check for updates, Save, and Done in place when an update appears, and a failed save fills a reserved line, so the dialog keeps its height.
- The GitHub device-code grant box keeps one height through authorize, code, and cancel.
- In the runner details panel, an error never moves the sections below it; a long error is clamped, with the full text in a Details popover.
- Load-more failures appear below the Load more button.
- `UpdateFailedIndicator` always reserves its space in a header row and is invisible when there is no error. On phones, list headers keep that line, which doubles as the gap above the table.
- Operation results appear in the fixed bottom-right status toast, not in the page flow.
- Below the `xl` breakpoint, the runner details panel overlays the list instead of narrowing it.
- Skeletons match the size and layout of the content they replace.

## Colors

Color tokens are defined in `web/src/styles/theme.css`, with dark values under `@variant dark`. The UI follows the system appearance.

| Token         | Use                                                 | Constraint                                       |
| ------------- | --------------------------------------------------- | ------------------------------------------------ |
| `accent`      | Links, accent text, selected-row tint               | At least 4.5:1 for 12px text on light surfaces   |
| `accent-fill` | Primary button backgrounds                          | At least 4.5:1 with white button labels          |
| `muted`       | Secondary text, table headers, labels, placeholders | At least 4.5:1 on every surface; no extra fading |
| `danger`      | Errors and destructive actions                      |                                                  |
| `canvas`      | Page background                                     |                                                  |
| `surface`     | Lists, tables, inputs, toasts                       |                                                  |
| `toolbar`     | App header, dialogs, history table header           |                                                  |
| `inspector`   | Runner details panel                                |                                                  |
| `line`        | 1px dividers and container borders                  |                                                  |

Use `accent` for blue text and `accent-fill` for blue backgrounds under white text; each is tuned for its own contrast pair. The GitHub-style status colours (`activity-*`) apply only inside the Runs, Jobs, and History views.

## Typography

The UI uses the system font stack with `font-synthesis: none`, and the Tailwind monospace stack for logs and identifiers.

| Role     | Size and weight | Use                                               |
| -------- | --------------- | ------------------------------------------------- |
| Headline | 16px, 600       | Page and view headings, empty states              |
| Title    | 14px, 600       | App title, dialog titles                          |
| Body     | 12px, 400       | Tables, forms, buttons, panels, toasts            |
| Label    | 12px, 500       | Table headers, segmented control, primary buttons |
| Mono     | 12px, 400       | Log lines and identifiers                         |

Emphasis within content uses weight, not a larger size.

## Layout

- The header holds the title, the Runners/Runs segmented control, and the account, shortcuts, settings, and data directory actions. Detail pages add a row below it with Back and breadcrumbs. Below md the row shows Back and the full title of the selected Job or Step instead of breadcrumbs; on a Run overview the compact run header directly below names the Run, so the row holds Back alone.
- Add runner is the primary button in the Runners table header, beside Refresh.
- The runner details panel is 320px wide. It sits beside the list at `xl` (1280px) and wider, overlays the list below `xl`, and fills the width on phones.
- Spacing follows a 4px base: 4–12px gaps, 12px horizontal table padding (8px below `md`), 38px single-line table rows (two-line list rows are 56px for runners and 64px for runs and history), and 24px dialog padding.
- Selection uses the accent tint on the row; never a side stripe. A row assigned to the selected runner gets a fainter tint and a "Selected runner" tag.
- Tables use fixed layout, sticky headers, and ellipsis truncation. Names whose ending identifies them, such as runner names, truncate in the middle.

## Surfaces and shapes

- Surfaces are flat. Depth comes from surface tone and 1px hairlines.
- Shadows: `shadow-xs` on resting buttons, `shadow-lg` on toasts and the overlaid details panel, and `shadow-xl` on dialogs over a `#0000004d` backdrop.
- Radii: 4px for skeleton bars, 6px for buttons and inputs, 8px for the segmented control track and toasts, 12px for dialogs, and full circles only for status dots, avatars, and job symbols.

## Components

- **Buttons:** 28px minimum height, 6px radius, translucent border. Primary buttons use `accent-fill` with a white 500-weight label; destructive primary buttons use `danger`. Disabled buttons are 40% opacity. Focus shows a 2px translucent blue outline.
- **Segmented control:** a 32px tinted track with 28px segments, exposed as a group of `aria-pressed` buttons.
- **Inputs:** surface background, control border, 6px radius, 28px minimum height; inputs and filter selects are 40px tall below md and on touch screens.
- **Dialogs:** toolbar background, 12px radius, up to 512px wide and five sixths of the viewport tall with contained scrolling. Actions are right-aligned with Cancel before the primary action.
- **Status toast:** fixed bottom-right, 320px wide. Errors use `role="alert"` and stay until dismissed; progress and success use `role="status"`, and success clears after four seconds.
- **Feedback:** first-load failures show a title, the message, and Retry. A failed refresh keeps the loaded data and shows "Update failed · Retry" in the header row.
- **Disclosures:** `<summary>` rows show the app's drawn chevron, rotated when open, instead of the browser triangle (`styles/base.css`).

## Copy

- Error messages state the problem and then the next step, for example "Could not load targets. Check the GitHub connection, then retry."
- Buttons name their action ("Create runner", "Grant organization access").
- Use sentence case for headings, dialog titles and labels.
- Confirmation titles ask a question ("Restart mactions-1?"); forms state their task ("Edit labels for mactions-1").
- Toolbar labels name what they show without repeating the heading above them: the log toolbar says "Full job log", not the Job and Step names.
- Headings stand alone; do not add small labels above them.

## Verification

Check visual changes against live data in light and dark at 1280×800 and in a 375×812 phone viewport, including dialogs and failure states. For failure layouts, make write requests fail (for example with HTTP 500) and confirm that buttons, footers, and section headings keep their positions and sizes.
