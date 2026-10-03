import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';

export function RegistrationTokenField() {
  const { mode, token, setToken, busy } = useRunnerCreationContext();
  if (mode !== 'token') return null;
  return (
    <div className="create-fields mt-4 flex flex-col gap-2 text-xs">
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
      <p className="detail-help m-0 text-xs leading-normal text-muted">
        GitHub Settings → Actions → Runners → New self-hosted runner. Used once and not saved by
        mactions.
      </p>
    </div>
  );
}
