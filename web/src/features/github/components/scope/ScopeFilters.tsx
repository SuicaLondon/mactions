import type { Runner } from '../../../../shared/api/types';
import type { Scope } from '../../../actions/data/types/activity-types';
import { mergeTargets } from '../../models/target-options';
import { ScopePicker } from './ScopePicker';

export function ScopeFilters({
  scope,
  runners,
  connected,
  onChange,
}: {
  scope: Scope;
  runners: Runner[];
  connected: boolean;
  onChange: (scope: Scope) => void;
}) {
  const organizations = mergeTargets(
    runners
      .filter((runner) => runner.target.kind === 'org')
      .map((runner) => ({
        kind: 'org' as const,
        name: runner.target.name,
        private: false,
      })),
  );
  const repositories = runners
    .filter(
      (runner) =>
        runner.target.kind === 'repo' &&
        (!scope.organization ||
          runner.target.name.split('/')[0].toLowerCase() === scope.organization.toLowerCase()),
    )
    .map((runner) => ({
      kind: 'repo' as const,
      name: runner.target.name,
      private: false,
    }));
  return (
    <section className="scope-filters contents" aria-label="Activity scope">
      <ScopePicker
        kind="org"
        scope={scope}
        local={organizations}
        connected={connected}
        onChange={(organization) => {
          let repository = '';
          if (
            scope.repository &&
            (!organization ||
              scope.repository.split('/')[0].toLowerCase() === organization.toLowerCase())
          )
            repository = scope.repository;
          onChange({ organization, repository });
        }}
      />
      <ScopePicker
        kind="repo"
        key={scope.organization}
        scope={scope}
        local={repositories}
        connected={connected}
        onChange={(repository) => onChange({ ...scope, repository })}
      />
    </section>
  );
}
