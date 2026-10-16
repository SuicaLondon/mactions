import { InlineLoading } from '../../../../shared/ui/loading/components/InlineLoading';

/** Shows the installed version, or a placeholder of the same height while it loads. */
export function ManagerVersionLine({
  version,
  source,
  loading,
}: {
  version: string | undefined;
  source: string;
  loading: boolean;
}) {
  if (version) {
    return (
      <p className="my-3 text-xs text-muted">
        mactions {version} · {source}
      </p>
    );
  }
  if (!loading) return null;
  return (
    <p className="my-3 flex text-xs">
      <InlineLoading label="Checking for updates" className="h-4 w-full" />
    </p>
  );
}
