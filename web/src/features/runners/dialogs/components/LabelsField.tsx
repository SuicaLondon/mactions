import { type Runner } from '../../../../shared/api/types';
import { runnerLabels } from '../../shared/models/runner-model';

/** Custom labels to replace, prefilled with the runner's current custom labels. */
export function LabelsField({ runner, readOnly }: { runner: Runner; readOnly: boolean }) {
  return (
    <label id="label-field" className="block text-xs">
      Custom labels
      <input
        id="label-input"
        className="mt-1.75 w-full"
        name="labels"
        autoFocus
        readOnly={readOnly}
        defaultValue={runnerLabels(runner)
          .filter((label) => label.type === 'custom')
          .map((label) => label.name)
          .join(', ')}
        placeholder="Comma-separated labels"
        spellCheck={false}
      />
    </label>
  );
}
