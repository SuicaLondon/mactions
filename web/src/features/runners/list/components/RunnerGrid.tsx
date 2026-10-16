import type { ReactNode } from 'react';

import { runnerHeadingLayout } from '../models/runner-grid-layout';
import { RunnerGridSkeleton } from './RunnerGridSkeleton';

export interface RunnerGridProps {
  /** Nothing is known yet; a placeholder stands in for the grid. */
  loading: boolean;
  /** The grid's rows. */
  children: ReactNode;
}

export function RunnerGrid({ loading, children }: RunnerGridProps) {
  if (loading) return <RunnerGridSkeleton />;
  return (
    <div
      className="shrink-0 overflow-hidden rounded-md border border-line"
      role="grid"
      aria-label="Runners"
    >
      <div className={runnerHeadingLayout} role="row">
        <span role="columnheader">Runner</span>
        <span role="columnheader" className="@max-md:hidden">
          Scope
        </span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="@max-5xl:hidden">
          Labels
        </span>
        <span role="columnheader" className="@max-3xl:hidden">
          Current work
        </span>
        <span role="columnheader" aria-label="Actions" />
      </div>
      {children}
    </div>
  );
}
