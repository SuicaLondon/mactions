import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';
import { CreationChoice } from '../CreationChoice';

export function RunnerScopeChoices() {
  const { kind, busy, changeKind } = useRunnerCreationContext();
  return (
    <>
      <h3 className="mt-4.5 text-xs font-semibold">Runner Scope</h3>
      <div
        className="create-choice-grid grid grid-cols-2 gap-2.25"
        role="group"
        aria-label="Runner scope"
      >
        <CreationChoice
          title="Repository"
          description="Run jobs for one repository"
          selected={kind === 'repo'}
          disabled={busy}
          onSelect={() => changeKind('repo')}
        />
        <CreationChoice
          title="Organization"
          description="Share across an organization"
          selected={kind === 'org'}
          disabled={busy}
          onSelect={() => changeKind('org')}
        />
      </div>
    </>
  );
}
