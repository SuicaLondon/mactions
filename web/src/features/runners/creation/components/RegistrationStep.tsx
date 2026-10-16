import { ChoiceCard } from '../../shared/components/ChoiceCard';
import { useRunnerCreationStatus } from '../hooks/use-runner-creation-status';
import { useRunnerCreationStore } from '../stores/runner-creation-store';
import { RegistrationHelp } from './RegistrationHelp';

export function RegistrationStep() {
  const mode = useRunnerCreationStore((state) => state.mode);
  const setMode = useRunnerCreationStore((state) => state.setMode);
  const { pending: busy } = useRunnerCreationStatus();
  return (
    // Phones drop the reserved height, so the actions follow the method choices closely.
    <div className="mx-0 mb-2.5 min-h-37.5 max-md:mb-0 max-md:min-h-0">
      <h3 className="mt-5 mb-2.5 text-xs font-semibold">Registration method</h3>
      <div className="grid grid-cols-2 gap-2.25" role="group" aria-label="Registration method">
        <ChoiceCard
          title="GitHub connection"
          description="mactions gets a token for you"
          selected={mode === 'automatic'}
          disabled={busy}
          onSelect={() => setMode('automatic')}
        />
        <ChoiceCard
          title="Registration token"
          description="Paste a one-time token from GitHub"
          selected={mode === 'token'}
          disabled={busy}
          onSelect={() => setMode('token')}
        />
      </div>
      <RegistrationHelp />
    </div>
  );
}
