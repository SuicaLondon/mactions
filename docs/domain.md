# mactions

mactions manages local self-hosted GitHub Actions runners and shows workflow activity across selected repositories and organizations.

## Language

**Manager**:
The mactions application through which a user manages local runners and views GitHub Actions activity.
_Avoid_: Runner, when referring to mactions itself.

**CLI Mode**:
The mode in which a user manages runners directly from the command line without the web service.
_Avoid_: Web mode, when referring to standalone command-line management.

**Web Mode**:
The mode in which a user manages runners and views workflow activity through mactions's locally hosted web interface.
_Avoid_: Runner service, when referring to the web management service.

**Data Directory**:
The common home for local runner installations and their generated data managed by mactions.
_Avoid_: Workspace, which refers to a runner's job working area rather than all managed data.

**Organization**:
A GitHub organization that owns repositories and can register shared self-hosted runners.
_Avoid_: Project, when referring to an organization.

**Repository**:
A GitHub code repository containing workflows, identified by its owner and repository name.
_Avoid_: Project, when the intended scope is a GitHub repository.

**Scope Filter**:
A choice that narrows the runners and workflow activity being viewed, such as an organization followed by one of its repositories.
_Avoid_: Registration target, which determines where a runner is registered rather than what the user is viewing.

**All Managed Scopes**:
The repositories and organizations used as registration targets by this Mac's managed runners.
_Avoid_: All GitHub repositories, which includes repositories outside these registration targets.

**Runner**:
An official GitHub Actions worker that executes jobs, either self-hosted or hosted by GitHub.
_Avoid_: Manager, workflow, run.

**Managed Runner**:
A self-hosted runner installed and managed by mactions on the host Mac.
_Avoid_: Any self-hosted runner, since self-hosted runners can live on other devices.

**External Runner**:
A runner outside this Mac's managed installations whose GitHub activity can be viewed.
_Avoid_: GitHub-hosted runner, since an external runner may also be self-hosted on another device.

**Registration Target**:
The GitHub repository or organization with which a self-hosted runner is registered.
_Avoid_: Scope filter, feature target.

**Custom Label**:
A user-assigned runner attribute that a workflow can require when selecting a runner for a job.
_Avoid_: Runner name, hardware detection, resource limit.

**Workflow**:
A GitHub Actions definition that describes events and jobs for a repository.
_Avoid_: Run, action.

**Run**:
One execution of a workflow, containing jobs that may be assigned to different runners.
_Avoid_: Action, task, runner workload.

**Run Attempt**:
One attempt to execute a run, including an initial execution or a later rerun.
_Avoid_: New run, when the workflow run identity has not changed.

**Job**:
A named unit within a workflow that contains steps and is assigned to one runner for execution.
_Avoid_: Task, run, step.

**Job Execution**:
One execution of a job within a run attempt, with its own result, runner assignment, and timing.
_Avoid_: Job definition, workflow run.

**Step**:
An ordered operation within a job, such as a shell command or an action.
_Avoid_: Job, task.

**Action**:
A reusable operation invoked by a workflow step, such as actions/checkout.
_Avoid_: Run, workflow, job.

**Job History**:
The executions of jobs with the same exact job name in the same repository and workflow, used to compare results and job or step durations.
_Avoid_: Runner history, since the job may execute on different runners over time.

**Published Job Log**:
Workflow output made available by GitHub for a job or step.
_Avoid_: Runner diagnostic log, guaranteed live stream.

**Runner Diagnostic Log**:
The official runner's diagnostic or service output used to inspect the runner itself.
_Avoid_: Job log, since this output is not the complete workflow step transcript.
