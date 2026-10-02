# Script-Derived Conventions

The supplied `create-runner.sh`, `runners-start.sh`, and `runners-stop.sh` are reference implementations. Preserve their reusable conventions, while following the confirmed scope in [TARGET.md](../TARGET.md) when behavior differs. Personal values and assumptions are not product defaults.

## Naming

- Use `actions-runner-N` for each installation directory under the managed data directory, rather than the caller's current directory.
- Allocate `N` as the highest existing matching directory index plus one. Start at `1` when none exist; do not fill gaps. A bare `actions-runner` directory counts as index `1` for allocation only; discovering it does not import or grant permission to manage it.
- Use `<name-prefix>-N` for the GitHub runner name, with the same numeric suffix as its installation directory. The name prefix is configuration, not a copied personal or organization-specific constant.
- Reserve a directory/index atomically across CLI and web creation so simultaneous requests cannot claim the same installation.
- Validate the name against the registration target. A collision must not silently replace an existing GitHub runner or overwrite local files.
- Use the service identity and plist path produced by the official scripts. Do not reconstruct a service label from a hard-coded organization prefix; official generation includes sanitization and length handling.

## Portable Configuration

- Obtain the repository or organization URL and custom labels from the user's configuration. Do not embed the source scripts' organization, machine label, personal name prefix, or username.
- Select the official runner package for the supported host architecture rather than assuming the architecture of the original author's machine.
- Resolve paths from the managed data directory and the macOS account running mactions. Preserve valid paths containing spaces.
- Run official configuration as the intended runner user. The first release uses the official user service model and does not adopt the scripts' system-wide daemon installation.
- Ensure the official service entrypoint exists before starting the service, and preserve the execution environment required by the user's tools.

## Operations and Resource Reuse

- Keep each runner's installation, registration state, workspace, and logs independent. Operate on mactions-managed runners using their recorded identities, not organization-wide service-name globs.
- Reuse verified official download archives for the same version and architecture. Keep download and lookup filenames consistent; the supplied script's fallback download filename does not match its reuse pattern.
- Prefer official configuration and service scripts plus documented APIs. Parse structured data as structured data rather than copying the shell scripts' text extraction shortcuts.
- Pass requested custom labels during initial registration. The supplied adoption and start/stop paths do not assign labels; they must not be treated as label synchronization.
- Preserve enough state to report and recover from partially completed creation or deletion; a failed command is not proof that all earlier steps were undone.

## Script Assumptions That Must Be Corrected

- A loaded service is not proof that its process is healthy, connected to GitHub, or idle. Keep local lifecycle checks separate from GitHub-reported status.
- Unloading a service alone does not establish the required persistent stopped state. Explicitly preserve the user's enabled/stopped choice across login and reboot.
- Use the official shutdown sequence. Do not infer a job's final GitHub conclusion from a local stop command.
- Service configuration contains absolute paths. Moving an installation requires a service-path update; import and migration remain outside the first release.

## Official References

- [macOS service script](https://github.com/actions/runner/blob/main/src/Misc/layoutbin/darwin.svc.sh.template)
- [macOS service-name generation](https://github.com/actions/runner/blob/main/src/Runner.Listener/Configuration/OsxServiceControlManager.cs)
- [Service-name sanitization and length handling](https://github.com/actions/runner/blob/main/src/Runner.Listener/Configuration/ServiceControlManager.cs)
