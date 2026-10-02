# Job inspection research

Checked on 2026-09-30 and updated on 2026-10-01 against official GitHub documentation, GitHub CLI source, and read-only API requests.

## Metadata and graph

The jobs API provides runner identity and labels, status, conclusion, timestamps, commit SHA, and numbered steps. Its documented response has no dependency edges. Run metadata adds the title, event, actor, attempt, branch, commit, workflow path, and links. Keep these fields when building the local response. [Jobs API](https://docs.github.com/en/rest/actions/workflow-jobs), [Runs API](https://docs.github.com/en/rest/actions/workflow-runs)

GitHub's visualization connects jobs by dependencies. Those dependencies are declared through workflow `needs`. A local view using only REST run/job data should explicitly show workflow membership, not invent dependency arrows from chronological order. Recovering actual dependencies requires the matching workflow definition and reliable mapping to expanded jobs. [Visualization graph](https://docs.github.com/en/actions/how-tos/monitor-workflows/use-the-visualization-graph), [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds)

## Download endpoints

`GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs` redirects to the whole job's plain-text log. The redirect expires after one minute. Repository read access is required; fine-grained tokens need Actions read permission, while classic tokens need `repo` for private repositories. [Job logs API](https://docs.github.com/en/rest/actions/workflow-jobs#download-job-logs-for-a-workflow-run)

Current documentation also lists `/actions/jobs/{job_id}/steps/{step_number}/logs`. It describes `step_number` as a zero-based position and shows API version `2026-03-10`. This differs from the `number` field in job metadata, which can skip values for post-job steps. The documentation does not promise live streaming. [Step logs API](https://docs.github.com/en/rest/actions/workflow-jobs#download-step-logs-for-a-workflow-run-job)

Live probes against public `cli/cli` jobs `109539655758` and `109538131641` successfully downloaded whole-job logs, but step positions 0 and 1 returned HTTP 404. Additional tested positions also failed, with both default API version and `2026-03-10`. These observations do not establish universal support or failure; an implementation needs an unavailable state and a fallback. [Observed activation job](https://github.com/cli/cli/actions/runs/36607354457/job/109539655758), [Observed lint job](https://github.com/cli/cli/actions/runs/36606901827/job/109538131641)

## GitHub CLI fallback

`gh run view --repo OWNER/REPO --job ID --attempt ATTEMPT --log` downloads archive-backed logs. Explicitly pass the selected job's `run_attempt`: `--job` derives the run ID but does not derive its attempt. The command requires both the job and run to be complete. Output prefixes each line with the job name, a tab, step name, another tab, and the log line. Unassigned output uses `UNKNOWN STEP`. The CLI caches its ZIP archive on disk. [CLI implementation](https://github.com/cli/cli/blob/trunk/pkg/cmd/run/view/view.go)

Archive step filenames contain step numbers, but associating their directories to jobs is heuristic. The CLI removes `/` and `:`, truncates job names to 90 UTF-16 code units, trims whitespace, and takes the first matching entry. Server-side name collisions can defeat that association. [Archive matching implementation](https://github.com/cli/cli/blob/trunk/pkg/cmd/run/view/logs.go)

Recommendation: try direct step retrieval first. Use the CLI fallback only for unambiguous job and step names, with the correct attempt and an isolated temporary cache. Do not assign duplicate names, unknown prefixes, or timestamp guesses to a step. Preserve access to the whole job log and a GitHub link. Fetch on expansion; report unavailable or oversized responses explicitly rather than silently truncating them. `XDG_CACHE_HOME` can isolate the CLI cache without replacing its credential configuration. [Cache configuration](https://pkg.go.dev/github.com/cli/go-gh/v2/pkg/config#CacheDir)

## Whole-job-only archive observed locally

A completed job assigned to the managed runner returned HTTP 404 for multiple direct step positions. Its attempt archive contained a whole-job text file and `system.txt`, with no per-step files. GitHub CLI 2.96.0 returned 629 lines, all labeled `UNKNOWN STEP`; exact matching against the job API's step names therefore reproduced the error "GitHub could not identify this step's output." The CLI explicitly documents that platform limitations can prevent step association. [CLI 2.96.0 implementation](https://github.com/cli/cli/blob/v2.96.0/pkg/cmd/run/view/view.go)

When direct step retrieval and verified archive mapping cannot provide a separate step log, mactions now downloads the full log by the already-verified job ID. The response uses `scope: "job"`, an empty `steps` list, and an explicit explanation; the UI labels it "Full job output." Actual step output uses `scope: "step"`. Authentication and access errors remain unavailable, and unfinished output retains its pending state. No timestamps or ambiguous names are used to invent step boundaries.

After rebuilding and restarting the local server, the original step request returned `available` with 52,712 bytes of complete job output. The browser displayed "Full job output" and no longer displayed the original identification error. Log content stays bounded in memory; the CLI archive cache remains temporary and is removed after each request.
