import { cn } from '../../../shared/lib/cn';
import type { ActivityView } from '../models/activity-views';
import { views } from '../models/activity-views';

export function ActivityViewSwitch({
  value,
  onChange,
}: {
  value: ActivityView;
  onChange: (view: ActivityView) => void;
}) {
  return (
    <div
      className="main-views inline-flex h-8 shrink-0 gap-0.5 rounded-lg bg-muted/10 p-0.5"
      role="group"
      aria-label="Activity view"
    >
      {views.map((view) => (
        <button
          key={view.value}
          type="button"
          aria-pressed={value === view.value}
          onClick={() => onChange(view.value)}
          className={cn(
            'h-7 min-h-7 rounded-md border-0 px-3 py-0 text-xs font-medium transition-colors',
            'duration-150 hover:filter-none active:translate-y-0',
            'focus-visible:outline-offset-0 motion-reduce:transition-none',
            {
              'bg-control text-foreground shadow-xs ring-1 ring-control-border':
                value === view.value,
              'bg-transparent text-muted shadow-none hover:bg-muted/10 hover:text-foreground':
                value !== view.value,
            },
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
