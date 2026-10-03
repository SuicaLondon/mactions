import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';
import { AdvancedRunnerSettings } from '../settings/AdvancedRunnerSettings';
import { RegistrationTokenField } from '../settings/RegistrationTokenField';
import { CreationError } from './CreationError';
import { RunnerScopeChoices } from './RunnerScopeChoices';
import { RunnerTargetField } from './RunnerTargetField';

export function RunnerTargetStep() {
  const { create, kind } = useRunnerCreationContext();
  let targetLabel = 'Organization';
  if (kind === 'repo') targetLabel = 'Repository';
  return (
    <div className="create-step mx-0 mb-2.5 min-h-37.5" hidden={create.isPending}>
      <RunnerScopeChoices />
      <h3 className="mt-4.5 text-xs font-semibold">{targetLabel}</h3>
      <RunnerTargetField />
      <RegistrationTokenField />
      <AdvancedRunnerSettings />
      <CreationError />
    </div>
  );
}
