import type { ConnectionPanelVariant } from '../../../models/connection-panel';

const terminalLoginClasses: Record<ConnectionPanelVariant, string> = {
  banner: 'mx-0 mt-3',
  card: 'm-0',
};

const terminalStepClasses: Record<ConnectionPanelVariant, string> = {
  banner: 'leading-relaxed',
  card: 'my-2.5 leading-relaxed',
};

/** How to log in with GitHub CLI on the Mac instead of the browser flow. */
export function TerminalLogin({ variant }: { variant: ConnectionPanelVariant }) {
  return (
    <details className={terminalLoginClasses[variant]}>
      <summary className="cursor-pointer">Prefer the terminal?</summary>
      <p className={terminalStepClasses[variant]}>
        On the Mac running mactions, use the same OS user to run:
      </p>
      <code className="wrap-anywhere">gh auth login --hostname github.com --web</code>
      <p className={terminalStepClasses[variant]}>
        Then select Check again above. An existing gh login is detected automatically.
      </p>
    </details>
  );
}
