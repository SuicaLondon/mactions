import { IconButton } from '../../../../shared/ui/controls/buttons/IconButton';
import { PlusIcon } from '../../../../shared/ui/icons/actions/PlusIcon';
import { InfoIcon } from '../../../../shared/ui/icons/status/InfoIcon';
import { SkeletonLine } from '../../../../shared/ui/loading/components/SkeletonLine';
import { useRunnerWorkspace } from '../../../runners/hooks/use-runner-workspace';

export function RunnerCreationActions() {
  const { fleet, openCreate, openStorage } = useRunnerWorkspace();
  if (fleet.query.isPending) {
    return (
      <>
        <SkeletonLine className="h-7.25 w-29 rounded-md max-sm:w-8" />
        <SkeletonLine className="size-7.25" />
      </>
    );
  }
  return (
    <>
      <button
        className="primary min-h-7.25 text-xs"
        aria-label="Add Runner"
        onClick={() => openCreate()}
        disabled={fleet.locked}
      >
        <PlusIcon />
        <span className="max-sm:hidden">Add Runner</span>
      </button>
      <IconButton icon={InfoIcon} label="Data Directory…" onClick={openStorage} />
    </>
  );
}
