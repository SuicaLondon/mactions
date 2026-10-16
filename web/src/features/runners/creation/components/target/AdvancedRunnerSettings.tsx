import { useRunnerCreationStatus } from '../../hooks/use-runner-creation-status';
import { useRunnerCreationStore } from '../../stores/runner-creation-store';

/** The name prefix and custom labels, folded away by default. */
export function AdvancedRunnerSettings() {
  const prefix = useRunnerCreationStore((state) => state.prefix);
  const setPrefix = useRunnerCreationStore((state) => state.setPrefix);
  const labels = useRunnerCreationStore((state) => state.labels);
  const setLabels = useRunnerCreationStore((state) => state.setLabels);
  const { pending: busy } = useRunnerCreationStatus();
  return (
    <details className="mt-4.5 border-t border-t-line pt-3.5 text-xs">
      <summary>Advanced settings</summary>
      <div className="mt-4 flex flex-col gap-2 text-xs">
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
        <p className="m-0 text-xs/normal text-muted">
          A number is appended to the name. Separate labels with commas.
        </p>
      </div>
    </details>
  );
}
