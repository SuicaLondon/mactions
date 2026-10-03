import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';

export function AdvancedRunnerSettings() {
  const { prefix, setPrefix, labels, setLabels, busy } = useRunnerCreationContext();
  return (
    <details className="advanced-settings mt-4.5 border-t border-t-line pt-3.5 text-xs">
      <summary>Advanced settings</summary>
      <div className="create-fields mt-4 flex flex-col gap-2 text-xs">
        <label htmlFor="name-prefix" className="mt-1.25 font-medium">
          Name prefix
        </label>
        <input
          id="name-prefix"
          name="prefix"
          value={prefix}
          onChange={(event) => setPrefix(event.target.value)}
          required
          maxLength={48}
          pattern="[a-zA-Z0-9_-]+"
          disabled={busy}
          spellCheck={false}
        />
        <label htmlFor="custom-labels" className="mt-1.25 font-medium">
          Custom labels
        </label>
        <input
          id="custom-labels"
          name="labels"
          value={labels}
          onChange={(event) => setLabels(event.target.value)}
          disabled={busy}
          placeholder="build, apple-silicon…"
          spellCheck={false}
        />
        <p className="detail-help m-0 text-xs leading-normal text-muted">
          A number is appended to the name. Separate labels with commas.
        </p>
      </div>
    </details>
  );
}
