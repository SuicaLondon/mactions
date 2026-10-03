import { cn } from '../../../../../shared/lib/cn';

interface TerminalLoginProps {
  welcome: boolean;
}

export function TerminalLogin({ welcome }: TerminalLoginProps) {
  return (
    <details className={cn('terminal-login mx-0 mt-3', { 'm-0': welcome })}>
      <summary className="cursor-pointer">Prefer the terminal?</summary>
      <p className={cn('leading-relaxed', { 'my-2.5': welcome })}>
        On the Mac running mactions, use the same OS user to run:
      </p>
      <code className="wrap-anywhere">gh auth login --hostname github.com --web</code>
      <p className={cn('leading-relaxed', { 'my-2.5': welcome })}>
        Then select Check again above. An existing gh login is detected automatically.
      </p>
    </details>
  );
}
