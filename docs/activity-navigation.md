# Activity navigation

## Scope and views

Organization and repository choices are filters shared by the Runners and Runs views. Select an organization, then optionally narrow it to one of its repositories. A scope filter changes what is being viewed; it does not change any runner's registration target. Selecting Add Runner prefills the current repository or organization, while preserving the registration method wizard and editable target.

Root lists use a compact, always-visible toolbar with search, organization, repository, status, and device controls. Controls have bounded widths and wrap on smaller screens; they are not hidden behind a Filters button. Organization, repository, result, and device controls belong to these lists; Run, Job, and History details do not retain the global filter controls or Runners/Runs tabs. Runner-associated Runs keep their own result and search controls, with the runner identity as navigation context.

The initial unfiltered scope is **Managed scopes**: repositories and organizations used by this Mac's managed runner registrations. It is not every repository accessible to the account. Explicit organization selection discovers repositories accessible with the host's current GitHub authorization. The last Runners/Runs choice and scope filters are remembered. During a detail visit, loaded parent-list summaries remain in the navigation context so Back can restore every loaded page even after its request cache expires. These temporary summaries have no active observers, steps, or logs, and are discarded when navigation scope or view resets; they are not an archived history.

Runners and Runs are parallel views beneath these filters. Runner inventory may require more GitHub permissions than workflow activity. A missing inventory permission produces an incomplete-coverage explanation; it must not prevent viewing readable Runs.

## Navigation

| Starting point           | Interaction                          | Destination                                                               |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------------- |
| Runners                  | Click a runner row                   | Runs associated with that runner                                          |
| Runners                  | Click a runner's Details button      | Runner management side panel                                              |
| Runs                     | Open a Run                           | Run overview with a dependency pipeline and all Jobs                      |
| Run details              | Select a Job                         | Job details and Steps alongside the Job list                              |
| Job explorer or overview | Select a Step                        | Step timing and automatically loaded, expanded logs in the execution pane |
| Job details              | Open Job History                     | Standalone list of that Job's historical executions                       |
| Job History              | Expand an execution                  | Its Steps and Step durations                                              |
| Any detail page          | Back to the named parent             | Previous view with its selection and filter context                       |
| Any detail page          | Select an ancestor in the breadcrumb | That ancestor with its preserved context                                  |

The runner-associated Runs list includes a row for each Run attempt containing at least one Job assigned to that Runner. Other Jobs in the same Run may use other Runners. Run details always display the complete Job list; entry through a Runner highlights only the Jobs it handled. Runner inventory identities, rather than runner names alone, establish local ownership.

The detail breadcrumb names the originating list, an optional Runner, the Run, and the selected Job, Step, or History. Earlier pages are actionable. Selecting the Run or Job in the current execution breadcrumb returns to that overview without discarding the parent list. The Back control visibly names its destination instead of requiring users to infer the parent from a generic icon.

Jobs and Steps are selections within the Run workspace rather than separate pages. Back returns to the originating Runs list; use the Run or Job breadcrumb to move up within the workspace. Back from Job History restores the selected execution inside its Run.

The Details button does not activate row navigation. Managed runners retain start, stop, restart, resume setup, custom label editing, deletion, and local diagnostic logs. Other runners have read-only details. Runner names, registration targets, and installation paths remain fixed after creation.

Runner type and device location answer different questions. Self-hosted runners can be local or external; GitHub-hosted runners are external to the managed Mac. Jobs without assignment data remain unassigned or unknown. Missing a self-hosted label does not prove that a runner is GitHub-hosted.

## Details and output

Runner rows use aligned columns for identity, registration scope, status, labels, current work, and actions. Idle runners say No active jobs; unavailable work data is distinguished from an empty result. Rows show assigned Run and Job summaries. They do not load Job details, Steps, or logs. Opening a Run loads its Jobs; selecting a Job loads its Steps and execution details. Selecting a Step immediately fetches and displays its published output; no additional open-log action is required. The full Job log remains available from the Job overview. Activity requests and refreshes belong to the active visible view; hidden or inactive detail views do not keep polling. Broad scopes and accumulated pages use a longer refresh interval based on their read cost, with that interval shown in the view. Manual refresh remains available.

The Run workspace presents Jobs and their loaded Steps as a collapsible explorer beside the current execution details. Selecting Overview returns to the dependency pipeline. Expanding a Job fetches Steps without loading logs; selecting a Step loads only that Step's output. Job progress is right-aligned, and Step timing shares the heading row so output starts near the top of the workspace.

The dependency pipeline uses declared `jobs.<job_id>.needs` from the workflow file used by the Run. The [GitHub Jobs REST response](https://docs.github.com/en/rest/actions/workflow-jobs) does not expose those edges, so the backend resolves the executed file through [GraphQL WorkflowRunFile](https://docs.github.com/en/graphql/reference/actions#workflowrunfile) and reads that immutable revision. Nodes are arranged by dependency level, including parallel branches and joins. Matrix executions are grouped under their declared workflow Job. Unknown runtime mappings and unavailable source data are explicitly marked; timestamps, array order, and literal slashes in Job names never establish dependencies. Reusable workflow internals and unsupported dynamic names are not guessed.

Graph data is requested only while Overview is visible and cached by Repository, Run, attempt, and reported Job IDs. Opening a Job or Step does not keep fetching the workflow source. A source link lets the user inspect the definition behind the diagram.

Published output is readable for managed and external Jobs when the GitHub authorization can read that repository's Actions data. Runner management permission is separate. While output is unavailable, show Job/Step status and the availability explanation, then load it after GitHub publishes it. Complete Job and Step downloads remain subject to GitHub's retention and the existing 16 MiB download limit. This feature does not read internal runner upload-spool files or promise a live log stream.

Runner diagnostics and service stdout/stderr open in a full-width workspace from the management panel, above the deletion action, and retain Back navigation. They describe runner operation, not the complete Job output. Reads follow existing files, return a bounded 64 KiB tail, and do not create a recording archive. Diagnostic output wraps long lines by default; the toolbar exposes wrapping, following output, live updates, and log-file selection.

First loads reserve the destination layout with accessible skeleton placeholders. Background refresh keeps existing rows readable. Run lists separate workflow identity, repository and branch, result, duration, and start time into consistent columns. Long titles remain available in tooltips and the Run detail.

## Job History

Job History compares the same Repository, numeric Workflow identity, and exact Job name. Each item is a Job execution, showing conclusion, Run, attempt, runner assignment, and elapsed time. Expanding an item retrieves its Steps so their durations can be inspected. A rerun attempt stays distinguishable from another Run. Entering a historical Run and returning keeps the History result filter and its expanded rows.

The comparison identity is intentionally simple: a renamed Job or differently named matrix Job has a separate history. There is no heuristic name normalization, dependency inference, local recorder, or history database. GitHub is the source of the historical results and timing.

## Coverage and pagination

- Runs return up to 20 Workflow Runs **per repository per page** and merge those results by recency. The active filter separately searches running, queued, waiting, pending, and requested Runs, with up to 20 per status per repository per page, then merges and deduplicates them. Success, failure, cancelled, and skipped filters apply at GitHub before paging for the global Runs list. A multi-repository or active page can contain more than 20 Runs; it is not one globally paginated stream.
- Runner work summaries inspect the first 20 in-progress and first 20 queued Runs per repository. Summary responses omit Steps and logs. An empty summary describes that window, not a proof that no matching work exists elsewhere.
- Job History searches 20 Workflow Runs per page and checks all their Job attempts for the exact Job name. Reruns can make the result larger than 20 Job items. It returns execution summaries until a row is expanded.
- Runner-filtered Runs inspect all Job attempts and show one row for each matching attempt, including the attempt's status and conclusion. Opening the row loads that attempt's full Run detail. Multiple matching attempts can produce more than 20 rows, and later pages may contain additional matching Runs.
- Unfiltered Runs and Job History stop at 100 pages, covering at most 2,000 Workflow Runs per repository or Workflow history. GitHub status-filtered searches stop at 50 pages and 1,000 Runs per status; the active filter searches five such status lists. Runner-specific conclusion filters inspect attempts of unfiltered Runs and retain the 100-page limit. Runner inventory pages also stop at 100 pages. Explicit coverage notices appear at these caps.
- Full Run Job lists paginate through GitHub's Job pages, including the job pages needed for historical attempts. Repository discovery and Job pagination stop at 100 pages. Oversized Job details produce an explicit limit error rather than silently returning an incomplete list.
- Default coverage follows managed registration scopes. Explicit Organization coverage follows the repositories the GitHub account can discover, which can be incomplete when permissions or organization policies restrict access.
- Queued Jobs without a runner assignment cannot be attributed to this Mac. External Runner inventory can be incomplete when the account can read Actions but cannot list self-hosted runners.
- Logs can be pending, expired, or unavailable. Retained metadata does not guarantee retained output.

These limits belong in coverage notices; they should not be presented as a complete account-wide or indefinitely retained history.

Runner lists and filters adapt to their available pane width when management details are open. On narrow screens the details occupy the workspace until closed. Step navigation uses a compact numbered list within each expanded Job, while retaining tree keyboard navigation and accessibility semantics.
