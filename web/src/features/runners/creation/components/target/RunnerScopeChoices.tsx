import { ChoiceCard } from '../../../shared/components/ChoiceCard';
import { useRunnerCreationStatus } from '../../hooks/use-runner-creation-status';
import { useRunnerCreationStore } from '../../stores/runner-creation-store';

/** Chooses whether the runner serves one repository or an organization. */
export function RunnerScopeChoices() {
  const kind = useRunnerCreationStore((state) => state.kind);
  const changeKind = useRunnerCreationStore((state) => state.changeKind);
  const { pending: busy } = useRunnerCreationStatus();
  return (
    <>
      <h3 className="mt-5 mb-2.5 text-xs font-semibold">Runner scope</h3>
      <div className="grid grid-cols-2 gap-2.25" role="group" aria-label="Runner scope">
        <ChoiceCard
          title="Repository"
          description="Run jobs for one repository"
          selected={kind === 'repo'}
          disabled={busy}
          onSelect={() => changeKind('repo')}
        />
        <ChoiceCard
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
