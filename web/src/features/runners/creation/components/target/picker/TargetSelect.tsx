import type { TargetOption } from '../../../../../../shared/api/types';
import { SelectControl } from '../../../../../../shared/ui/controls/select/components/SelectControl';
import { targetKindCopy, targetSelectOptions } from '../../../../../github/models/target-options';
import type { RunnerScopeKind } from '../../../models/runner-creation';

/** The runner target field: one searchable repository or organization choice. */
export function TargetSelect({
  kind,
  options,
  value,
  onChange,
  disabled,
  loading,
  onOpen,
}: {
  kind: RunnerScopeKind;
  options: TargetOption[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  loading: boolean;
  onOpen?: () => void;
}) {
  const copy = targetKindCopy(kind);
  return (
    <SelectControl
      id="runner-target"
      label={copy.label}
      className="min-w-0 text-xs"
      variant="form"
      searchable
      options={targetSelectOptions(options)}
      value={value}
      onChange={onChange}
      disabled={disabled}
      menu={{ loading, onOpen, loadMoreLabel: copy.loadMoreLabel }}
      placeholder={copy.placeholder}
    />
  );
}
