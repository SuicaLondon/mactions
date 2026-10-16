import { cn } from '../../../shared/lib/cn';
import { ModalDialog } from '../../../shared/ui/dialog/components/ModalDialog';
import { keyboardShortcutGroups } from '../models/keyboard-shortcuts';

export function KeyboardShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <ModalDialog onClose={onClose}>
      {(titleId) => (
        <>
          <h2 id={titleId}>Keyboard shortcuts</h2>
          {/* One table keeps the key column the same width across every group. */}
          <table className="mt-1 w-auto table-auto text-xs">
            <thead className="sr-only">
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            {keyboardShortcutGroups.map((group, index) => {
              const groupId = `${titleId}-group-${index}`;
              return (
                <tbody key={group.title} aria-labelledby={groupId}>
                  <tr className="bg-transparent hover:bg-transparent">
                    <th
                      id={groupId}
                      scope="colgroup"
                      colSpan={2}
                      className={cn(
                        'h-auto border-b-0 bg-transparent px-0 pt-4 pb-1 text-left text-xs',
                        'font-semibold text-foreground',
                        { 'pt-2': index === 0 },
                      )}
                    >
                      {group.title}
                    </th>
                  </tr>
                  {group.shortcuts.map((shortcut) => (
                    // A reference list, not a data table: no striping or hover tint.
                    <tr key={shortcut.key} className="bg-transparent hover:bg-transparent">
                      <td className="h-8 pr-3 pl-0 whitespace-nowrap">
                        <kbd
                          className={cn(
                            'inline-flex min-w-6 items-center justify-center rounded-md border',
                            'border-control-border bg-surface px-1.5 py-0.5 font-mono text-xs',
                          )}
                        >
                          {shortcut.key}
                        </kbd>
                      </td>
                      <td className="h-8 px-0 text-foreground">{shortcut.description}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="min-w-19.5 text-xs" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      )}
    </ModalDialog>
  );
}
