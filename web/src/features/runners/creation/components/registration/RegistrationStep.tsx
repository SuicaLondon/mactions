import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';
import { CreationChoice } from '../CreationChoice';
import { RegistrationHelp } from './RegistrationHelp';

export function RegistrationStep() {
  const { mode, setMode, busy } = useRunnerCreationContext();
  return (
    <div className="create-step mx-0 mb-2.5 min-h-37.5">
      <h3 className="mt-4.5 text-xs font-semibold">Registration Method</h3>
      <div
        className="create-choice-grid grid grid-cols-2 gap-2.25"
        role="group"
        aria-label="Registration method"
      >
        <CreationChoice
          title="GitHub Connection"
          description="mactions gets a token for you"
          selected={mode === 'automatic'}
          disabled={busy}
          onSelect={() => setMode('automatic')}
        />
        <CreationChoice
          title="Registration Token"
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
