import { useRunnerCreationStatus } from '../hooks/use-runner-creation-status';
import { useRunnerCreationStore } from '../stores/runner-creation-store';

/** What the current step asks for, or that the runner is being created. */
export function CreationDescription() {
  const step = useRunnerCreationStore((state) => state.step);
  const { pending } = useRunnerCreationStatus();
  if (pending) return 'Creating and starting your runner. Keep this window open.';
  if (step === 1) return 'Choose how to register this Mac.';
  return 'Choose a target. Create runner registers and starts it on this Mac.';
}
