import type { ConnectionPanelVariant } from '../../../models/connection-panel';
import { ConnectionAlternatives } from './ConnectionAlternatives';
import { TerminalLogin } from './TerminalLogin';

interface ConnectionGuideProps {
  variant: ConnectionPanelVariant;
  /** Offers local controls and a registration token as alternatives to connecting. */
  showAlternatives: boolean;
  onContinueLocal: () => void;
  onUseToken?: () => void;
}

export function ConnectionGuide({
  variant,
  showAlternatives,
  onContinueLocal,
  onUseToken,
}: ConnectionGuideProps) {
  return (
    <>
      <p className="leading-relaxed">
        Authorize in the browser on your own computer or phone. This also works over SSH, a local
        network, or Tailscale.
      </p>
      <TerminalLogin variant={variant} />
      {showAlternatives && (
        <ConnectionAlternatives
          variant={variant}
          onContinueLocal={onContinueLocal}
          onUseToken={onUseToken}
        />
      )}
    </>
  );
}
