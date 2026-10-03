import { ChevronIcon } from '../../../../../shared/ui/icons/navigation/ChevronIcon';
import { TerminalIcon } from '../../../../../shared/ui/icons/system/TerminalIcon';

interface RunnerDiagnosticLinkProps {
  onOpenLogs: () => void;
}
export function RunnerDiagnosticLink({ onOpenLogs }: RunnerDiagnosticLinkProps) {
  return (
    <section className="detail-section mx-0 mb-3 border-t border-t-line px-4.5 py-3.75">
      <button onClick={onOpenLogs}>
        <TerminalIcon />
        Runner diagnostic logs
        <ChevronIcon />
      </button>
      <p className="detail-help mx-0 mt-2 mb-0 text-xs leading-normal text-muted">
        Open service and diagnostic output in the workspace.
      </p>
    </section>
  );
}
