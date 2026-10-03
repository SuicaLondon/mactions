import { cn } from '../../../../../shared/lib/cn';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/navigation/ExternalLinkIcon';
import { ClockIcon } from '../../../../../shared/ui/icons/status/ClockIcon';
import type { CIRecording } from '../../../types/recording';

interface RecordingIdentityProps {
  recording: CIRecording;
}

export function RecordingIdentity({ recording }: RecordingIdentityProps) {
  return (
    <div className="replay-identity mb-3.5 flex flex-wrap items-center gap-3">
      <span
        className={cn(
          'replay-badge inline-flex items-center gap-1.25 rounded-md bg-accent/10 px-1.75',
          'py-1 text-xs text-accent',
        )}
      >
        <ClockIcon className="size-3" />
        Recorded run
      </span>
      <strong className="text-xs font-semibold wrap-anywhere">{recording.repository}</strong>
      <a
        className="ml-auto inline-flex items-center gap-1 text-xs no-underline"
        href={`https://github.com/${recording.repository}/actions/runs/${recording.run_id}`}
        target="_blank"
        rel="noreferrer"
      >
        Run #{recording.run_id}
        <ExternalLinkIcon className="size-2.75" />
      </a>
    </div>
  );
}
