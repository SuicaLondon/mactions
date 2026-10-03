import { ConnectionAlternatives } from './ConnectionAlternatives';
import { TerminalLogin } from './TerminalLogin';

interface ConnectionGuideProps {
  welcome: boolean;
  guide: boolean;
  onContinueLocal: () => void;
  onUseToken?: () => void;
}

export function ConnectionGuide({
  welcome,
  guide,
  onContinueLocal,
  onUseToken,
}: ConnectionGuideProps) {
  return (
    <>
      <p className="leading-relaxed">
        Authorize in the browser on your own computer or phone. This also works over SSH, a local
        network, or Tailscale.
      </p>
      <TerminalLogin welcome={welcome} />
      {guide && (
        <ConnectionAlternatives
          welcome={welcome}
          onContinueLocal={onContinueLocal}
          onUseToken={onUseToken}
        />
      )}
    </>
  );
}
