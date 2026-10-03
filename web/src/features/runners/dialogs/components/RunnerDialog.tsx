import type { ReactNode } from 'react';

import { useRunnerDialog } from '../hooks/use-runner-dialog';

export function RunnerDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: (titleId: string) => ReactNode;
  onClose: () => void;
}) {
  const { ref, titleId } = useRunnerDialog();
  return (
    <dialog
      ref={ref}
      aria-label={title}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children(titleId)}
    </dialog>
  );
}
