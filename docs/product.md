# Product

mactions manages self-hosted GitHub Actions runners on macOS and shows workflow Runs, Jobs, Steps, logs, and Job History across selected GitHub scopes. [Feature targets](product-scope.md) lists the committed and deferred capabilities; [domain](domain.md) defines the terms.

## Users

Each Mac has one operator. The same person sets up runners occasionally, step by step, and checks them often for status, jobs, and logs. They frequently open the dashboard from another device over SSH, LAN, or Tailscale. The web UI is designed for desktop browsers first; phones are supported.

## Purpose

Success means an operator can create, start, stop, and delete runners without reading documentation, and can see at a glance whether runners and jobs are healthy. When a job fails, the UI should lead directly to the failing step and its error lines.

## Operating context

- The dashboard runs on the runner Mac at `127.0.0.1:8787` by default. LAN access is opt-in and has no application login.
- GitHub access comes from the host account's GitHub CLI login. Organization runners need the `admin:org` scope; a registration token is an alternative that needs no login.
- Runners registered by other machines appear as read-only external runners.
- Status refreshes only while someone is viewing the dashboard.

## Principles

1. Show state truthfully. GitHub is the source of truth for connectivity and job results; local services are the source of truth for runner lifecycle.
2. Every error says what happened and what to do next, where it happened.
3. Actions and refreshes never move the layout. See [design](design.md#layout-stability).
4. Setup is guided; monitoring is scannable.
5. Never remove runners, files, or GitHub registrations without explicit confirmation.
6. Keep the interface keyboard-operable with labelled controls, and respect reduced motion.
