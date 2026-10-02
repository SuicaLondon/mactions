# mactions

mactions manages self-hosted GitHub Actions runners on a Mac.

## Language

**Manager**:
The mactions application through which a user manages local runners.
_Avoid_: Runner, when referring to mactions itself.

**CLI Mode**:
The mode in which a user manages runners directly from the command line without the web service.
_Avoid_: Web mode, when referring to standalone command-line management.

**Web Mode**:
The mode in which a user manages runners through mactions's locally hosted web interface.
_Avoid_: Runner service, when referring to the web management service.

**Data Directory**:
The common home for local runner installations and their generated data managed by mactions.
_Avoid_: Workspace, which refers to a runner's job working area rather than all managed data.

**Runner**:
A local installation of the official GitHub Actions runner application, registered with a repository or organization to execute jobs.
_Avoid_: Manager, workflow.

**Registration Target**:
The GitHub repository or organization with which a runner is registered.
_Avoid_: Target, when it could be confused with the project's feature targets.

**Job**:
A unit of a GitHub Actions workflow assigned to a runner for execution.
_Avoid_: Runner, workflow run.

**Custom Label**:
A user-assigned runner attribute that a workflow can require when selecting a runner for a job.
_Avoid_: Runner name, hardware detection, or resource limit.
