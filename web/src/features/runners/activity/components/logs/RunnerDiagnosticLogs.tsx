import { cn } from '../../../../../shared/lib/cn';
import type { RunnerActivityState } from '../../models/runner-activity';
import { RunnerDiagnosticOutput } from './RunnerDiagnosticOutput';
import { RunnerLogControls } from './RunnerLogControls';

interface RunnerDiagnosticLogsProps {
  logsOnly: boolean;
  activity: RunnerActivityState;
}

export function RunnerDiagnosticLogs({ logsOnly, activity }: RunnerDiagnosticLogsProps) {
  const { logs, output, wrap } = activity;
  return (
    <>
      <RunnerLogControls logsOnly={logsOnly} activity={activity} />
      {!!logs.error && (
        <p
          className={cn(
            'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
            'py-2.5 text-xs leading-normal wrap-anywhere whitespace-pre-wrap text-danger',
          )}
          role="alert"
        >
          {logs.error.message}
        </p>
      )}
      {!!(Boolean(logs.data) || !logs.error) && (
        <pre
          ref={output}
          className={cn(
            'log-output m-0 overflow-auto border border-line bg-canvas p-3 px-4 font-mono',
            'h-auto min-h-30 flex-1 rounded-lg py-3.5 text-xs whitespace-pre select-text',
            'leading-relaxed',
            {
              'log-wrapped break-normal wrap-anywhere': wrap,
              'whitespace-pre-wrap': wrap,
            },
            {
              'h-auto max-h-none min-h-0 w-full flex-1 scrollbar-gutter-stable rounded-b-md':
                logsOnly,
              'bg-canvas p-3 font-mono text-xs leading-relaxed': logsOnly,
            },
          )}
          tabIndex={0}
          aria-label="Runner log output"
        >
          <RunnerDiagnosticOutput logs={logs} />
        </pre>
      )}
      <p
        className={cn('detail-help mx-0 mt-2 mb-0 text-xs leading-normal text-muted', {
          'mb-0 shrink-0': logsOnly,
        })}
      >
        {logs.data?.selected || 'Existing diagnostic and service logs'}
        {logs.data?.truncated && ' · Showing the last 64 KiB'}
      </p>
    </>
  );
}
