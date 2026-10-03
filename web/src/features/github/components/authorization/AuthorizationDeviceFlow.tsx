import { cn } from '../../../../shared/lib/cn';
import { InlineLoading } from '../../../../shared/ui/loading/components/InlineLoading';
import type { GitHubAuthState } from '../../types/github-auth';

interface AuthorizationDeviceFlowProps {
  welcome: boolean;
  auth: GitHubAuthState['auth'];
  cancel: GitHubAuthState['cancel'];
}

export function AuthorizationDeviceFlow({ welcome, auth, cancel }: AuthorizationDeviceFlowProps) {
  return (
    <div
      className={cn('device-flow flex flex-wrap items-center gap-3.5', {
        'flex flex-col items-start gap-3': welcome,
      })}
    >
      <p className="mb-0 basis-full leading-relaxed">
        Open GitHub on your own computer or phone and enter this code. Keep this page open while
        authorizing.
      </p>
      <code className="device-code rounded-md bg-surface px-3 py-2 text-xl tracking-widest select-all">
        {auth.data?.code ?? (
          <InlineLoading label="Waiting for a device code…" className="h-7 w-45" />
        )}
      </code>
      {!!auth.data?.code && (
        <a href="https://github.com/login/device" target="_blank" rel="noreferrer">
          Open GitHub ↗
        </a>
      )}
      <button
        type="button"
        className="min-h-5.5 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
        disabled={cancel.isPending}
        onClick={() => cancel.mutate()}
      >
        Cancel authorization
      </button>
    </div>
  );
}
