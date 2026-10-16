import { PendingLabel } from '../../../../shared/ui/controls/buttons/PendingLabel';
import { LoadMoreError } from '../../../../shared/ui/feedback/components/LoadMoreError';
import type { NextPageStatus } from '../../data/models/paged-list-status';

export function ActivityLoadMore({
  nextPage,
  label,
  subject,
  onLoadMore,
}: {
  nextPage: NextPageStatus;
  /** The button's idle label, such as "Load more runs"; it reads "Loading…" while pending. */
  label: string;
  /** Names what failed to load, such as "runs". */
  subject: string;
  onLoadMore: () => void;
}) {
  if (!nextPage.available) return null;
  return (
    <div className="mx-auto my-3 flex flex-col items-center gap-1.5">
      <button
        className="flex text-xs max-md:min-h-10 pointer-coarse:min-h-10"
        disabled={nextPage.pending}
        onClick={onLoadMore}
      >
        <PendingLabel pending={nextPage.pending} idle={label} busy="Loading…" />
      </button>
      {/* Below the button, so a failed page never moves it. */}
      {!!nextPage.error && <LoadMoreError error={nextPage.error} subject={subject} />}
    </div>
  );
}
