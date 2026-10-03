import { cn } from '../../../../../shared/lib/cn';

interface RunnerErrorNoticeProps {
  errors: string[];
}
export function RunnerErrorNotice({ errors }: RunnerErrorNoticeProps) {
  if (!errors.length) return null;
  return (
    <section className="detail-section mx-0 mb-3 border-t border-t-line px-4.5 py-3.75">
      <p
        className={cn(
          'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
          'py-2.5 text-xs leading-normal wrap-anywhere whitespace-pre-wrap text-danger',
        )}
      >
        {errors.join('\n')}
      </p>
    </section>
  );
}
