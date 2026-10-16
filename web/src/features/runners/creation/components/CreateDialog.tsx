import { ModalDialog } from '../../../../shared/ui/dialog/components/ModalDialog';
import { useRunnerCreationStatus } from '../hooks/use-runner-creation-status';
import { CreateRunnerForm } from './CreateRunnerForm';

export interface CreateDialogProps {
  locked: boolean;
  initializing?: boolean;
  onClose: () => void;
}

/** Shows the Add runner session the opener started with the creation store's start(). */
export function CreateDialog({ locked, initializing = false, onClose }: CreateDialogProps) {
  const { pending } = useRunnerCreationStatus();
  function cancel() {
    if (!pending) onClose();
  }
  return (
    <ModalDialog onClose={cancel}>
      {(titleId) => (
        <CreateRunnerForm
          titleId={titleId}
          locked={locked}
          initializing={initializing}
          onCancel={cancel}
          onCreated={onClose}
        />
      )}
    </ModalDialog>
  );
}
