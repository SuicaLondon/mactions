import type { RunnerScopeKind } from '../../models/runner-creation';
export interface ManualRunnerTargetProps {
  kind: RunnerScopeKind;
  target: string;
  onChange: (target: string) => void;
  disabled: boolean;
  valid: boolean;
}

export function ManualRunnerTarget({
  kind,
  target,
  onChange,
  disabled,
  valid,
}: ManualRunnerTargetProps) {
  let targetLabel = 'Organization';
  let placeholder = 'organization…';
  let hint = 'Enter the organization name. You can also paste its GitHub URL.';
  let validationMessage = 'Use the organization name for an organization.';
  if (kind === 'repo') {
    targetLabel = 'Repository';
    placeholder = 'owner/repository…';
    hint = 'Enter owner/repository. You can also paste a GitHub repository URL.';
    validationMessage = 'Use owner/repository for a repository.';
  }
  return (
    <div className="create-fields mt-4 flex flex-col gap-2 text-xs">
      <label htmlFor="target-name" className="mt-1.25 font-medium">
        {targetLabel}
      </label>
      <input
        id="target-name"
        name="target"
        value={target}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        required
        aria-describedby="target-hint"
      />
      <p id="target-hint" className="detail-help m-0 text-xs leading-normal text-muted">
        {hint}
      </p>
      {!!(target.trim() && !valid) && (
        <p className="field-error m-0 text-xs text-danger">{validationMessage}</p>
      )}
    </div>
  );
}
