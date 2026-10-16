const eventLabels: Record<string, string> = {
  schedule: 'Scheduled',
  workflow_dispatch: 'Manually run',
  repository_dispatch: 'Repository dispatch',
  workflow_run: 'Triggered by workflow',
  workflow_call: 'Called by workflow',
  push: 'Push',
  pull_request: 'Pull request',
  pull_request_target: 'Pull request',
  merge_group: 'Merge queue',
  release: 'Release',
  dynamic: 'Dynamic',
};

/** A readable label for a run's GitHub trigger, or undefined when GitHub did not report one. */
export function runEventLabel(event: string | null | undefined) {
  if (!event) return undefined;
  const label = eventLabels[event];
  if (label) return label;
  const words = event.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
