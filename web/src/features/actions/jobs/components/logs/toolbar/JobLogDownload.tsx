import { cn } from '../../../../../../shared/lib/cn';

/** Saves the original log text, including timestamps the output shows in its gutter. */
export function JobLogDownload({
  content,
  filename,
  disabled,
}: {
  content: string | undefined;
  filename: string;
  disabled: boolean;
}) {
  function download() {
    if (content === undefined) return;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      className={cn(
        'min-h-6 rounded-md border border-slate-700 bg-slate-800 py-0.75 text-xs',
        'text-slate-100 shadow-none max-md:min-h-10 pointer-coarse:min-h-10',
      )}
      disabled={disabled}
      onClick={download}
    >
      Download
    </button>
  );
}
