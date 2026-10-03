interface WelcomePrimaryActionProps {
  method: 'cli' | 'token';
  connected: boolean;
  onUseToken: () => void;
  onClose: () => void;
}
export function WelcomePrimaryAction({
  method,
  connected,
  onUseToken,
  onClose,
}: WelcomePrimaryActionProps) {
  if (method === 'token') {
    return (
      <button
        type="button"
        className="primary min-w-19.5 text-xs whitespace-normal max-sm:w-full"
        onClick={onUseToken}
      >
        Continue with registration token
      </button>
    );
  }
  if (connected) {
    return (
      <button
        type="button"
        className="primary min-w-19.5 text-xs whitespace-normal max-sm:w-full"
        onClick={onClose}
      >
        Use this account
      </button>
    );
  }
  return null;
}
