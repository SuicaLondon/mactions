import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import { TerminalIcon } from '../../../../../shared/ui/icons/TerminalIcon';

/** Opens the runner's service and diagnostic logs as a workspace page. */
export function RunnerDiagnosticLink({ onOpenLogs }: { onOpenLogs: () => void }) {
  return (
    <section className="mx-0 mb-3 border-t border-t-line px-4.5 py-3.75">
      <button onClick={onOpenLogs}>
        <TerminalIcon />
        Runner diagnostic logs
        <ChevronIcon />
      </button>
      <p className="mx-0 mt-2 mb-0 text-xs/normal text-muted">
        Open service and diagnostic output in the workspace.
      </p>
    </section>
  );
}
