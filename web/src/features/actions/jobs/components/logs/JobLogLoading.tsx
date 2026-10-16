import { cn } from '../../../../../shared/lib/cn';
import { LogLinesSkeleton } from '../../../../../shared/ui/loading/components/LogLinesSkeleton';
import { Skeleton } from '../../../../../shared/ui/loading/components/Skeleton';
import { useElapsedSeconds } from '../../../shared/hooks/use-elapsed-seconds';
import { slowLoadingMessage } from '../../../shared/models/slow-loading';

/**
 * Reserves the log area while it loads. With `slowMessage`, the visible line switches to an
 * elapsed-seconds count after a few seconds; the announced label stays fixed.
 */
export function JobLogLoading({
  message,
  slowMessage,
  fill,
}: {
  message: string;
  slowMessage?: string;
  fill: boolean;
}) {
  const seconds = useElapsedSeconds();
  let visible = message;
  if (slowMessage) visible = slowLoadingMessage(message, slowMessage, seconds);
  return (
    <div
      className={cn('flex flex-col bg-slate-950', {
        'min-h-56': !fill,
        'min-h-0 flex-1': fill,
      })}
    >
      <p
        className="m-0 shrink-0 truncate px-4.5 pt-3.5 text-xs text-slate-300 tabular-nums"
        aria-hidden="true"
      >
        {visible}
      </p>
      <Skeleton label={message} className="min-h-0 flex-1">
        <LogLinesSkeleton lineNumbers className="gap-2.5 px-4.5 py-3.5" />
      </Skeleton>
    </div>
  );
}
