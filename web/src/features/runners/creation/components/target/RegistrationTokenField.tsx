import { useRunnerCreationStatus } from '../../hooks/use-runner-creation-status';
import { useRunnerCreationStore } from '../../stores/runner-creation-store';

/** The one-time registration token, asked for only by the token method. */
export function RegistrationTokenField() {
  const mode = useRunnerCreationStore((state) => state.mode);
  const token = useRunnerCreationStore((state) => state.token);
  const setToken = useRunnerCreationStore((state) => state.setToken);
  const { pending: busy } = useRunnerCreationStatus();
  if (mode !== 'token') return null;
  return (
    <div className="mt-4 flex flex-col gap-2 text-xs">
      <label htmlFor="registration-token" className="mt-1.25 font-medium">
        Registration token
      </label>
      <input
        id="registration-token"
        name="registration_token"
        type="password"
        value={token}
        onChange={(event) => setToken(event.target.value.trim())}
        disabled={busy}
        required
        autoComplete="off"
        spellCheck={false}
      />
      <p className="m-0 text-xs/normal text-muted">
        GitHub Settings → Actions → Runners → New self-hosted runner. Used once and not saved by
        mactions.
      </p>
    </div>
  );
}
