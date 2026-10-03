import type { LoadingKind } from '../../../models/loading';
import { SkeletonLine } from '../../SkeletonLine';
import { ExecutionRows } from '../inventory/ExecutionRows';
import { RunnerRows } from '../inventory/RunnerRows';
import { GraphContent } from '../workspace/GraphContent';
import { HistoricalStepContent } from '../workspace/HistoricalStepContent';
import { JobContent } from '../workspace/JobContent';
import { RunContent } from '../workspace/RunContent';
import { StepContent } from '../workspace/StepContent';
import { LogContent } from './LogContent';
import { Steps } from './Steps';
import { ToolbarContent } from './ToolbarContent';

export function PlaceholderContent({
  kind,
  view,
}: {
  kind: LoadingKind;
  view: 'runners' | 'runs';
}) {
  switch (kind) {
    case 'runners':
      return <RunnerRows />;
    case 'runs':
    case 'history':
      return <ExecutionRows kind={kind} />;
    case 'job':
      return <JobContent />;
    case 'step':
      return <StepContent />;
    case 'history-steps':
      return <HistoricalStepContent />;
    case 'run':
      return <RunContent />;
    case 'graph':
      return <GraphContent />;
    case 'runner-logs':
      return <LogContent runner />;
    case 'logs':
      return <LogContent />;
    case 'steps':
      return <Steps />;
    case 'toolbar':
      return <ToolbarContent view={view} />;
    case 'access':
      return (
        <div className="mb-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="grid gap-2 border-b border-line py-2.25">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="w-20" />
            </div>
          ))}
        </div>
      );
  }
}
