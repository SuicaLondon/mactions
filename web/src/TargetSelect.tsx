import Select, { type StylesConfig } from 'react-select';
import type { TargetOption } from './types';

type Option = { value: string; label: string; detail: string };
const styles: StylesConfig<Option, false> = {
  control: (base, state) => ({ ...base, minHeight: 42, borderRadius: 8, backgroundColor: 'var(--control)', borderColor: state.isFocused ? 'var(--accent)' : 'var(--control-border)', boxShadow: state.isFocused ? '0 0 0 3px var(--focus)' : 'none', ':hover': { borderColor: 'var(--accent)' } }),
  input: base => ({ ...base, color: 'var(--text)' }),
  singleValue: base => ({ ...base, color: 'var(--text)' }),
  placeholder: base => ({ ...base, color: 'var(--secondary)' }),
  menu: base => ({ ...base, zIndex: 20, backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 28px #00000030' }),
  menuList: base => ({ ...base, padding: 4 }),
  option: (base, state) => ({ ...base, borderRadius: 6, padding: '10px 12px', color: state.isSelected ? '#fff' : 'var(--text)', backgroundColor: state.isSelected ? 'var(--accent)' : state.isFocused ? 'color-mix(in srgb, var(--accent) 12%, var(--surface))' : 'transparent', cursor: 'pointer', ':active': { backgroundColor: 'var(--accent)', color: '#fff' } }),
  noOptionsMessage: base => ({ ...base, color: 'var(--secondary)', fontSize: 12 }),
  loadingMessage: base => ({ ...base, color: 'var(--secondary)' }),
  indicatorSeparator: () => ({ display: 'none' }),
};
export function TargetSelect({ kind, options, value, onChange, disabled, loading }: {
  kind: 'repo' | 'org'; options: TargetOption[]; value: string; onChange: (value: string) => void; disabled: boolean; loading: boolean;
}) {
  const items = options.map(option => ({ value: option.name, label: option.name, detail: option.kind === 'org' ? 'Organization' : option.private ? 'Private' : 'Public' }));
  return <Select<Option> key={kind} instanceId="runner-target" className="repo-select" aria-label={kind === 'repo' ? 'Repository' : 'Organization'}
    options={items} value={items.find(option => option.value === value) ?? (value ? { value, label: value, detail: '' } : null)}
    onChange={option => onChange(option?.value ?? '')} isDisabled={disabled} isLoading={loading} isSearchable
    placeholder={kind === 'repo' ? 'Search or choose a repository…' : 'Search or choose an organization…'}
    noOptionsMessage={() => 'No matching loaded targets. Try another search or load more targets.'}
    menuPosition="fixed" menuPlacement="auto" menuShouldScrollIntoView={false} maxMenuHeight={220} styles={styles}
    formatOptionLabel={(option, context) => context.context === 'value' ? option.label : <div className="repo-option"><span>{option.label}</span><small>{option.detail}</small></div>}/>
}
