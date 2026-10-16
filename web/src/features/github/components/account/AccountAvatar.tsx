import { cn } from '../../../../shared/lib/cn';

/** The account's avatar, or its initial when GitHub has no avatar URL. */
export function AccountAvatar({ url, login }: { url: string | null | undefined; login: string }) {
  if (!url) {
    return (
      <span
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-full bg-line text-base',
          'font-semibold',
        )}
        aria-hidden="true"
      >
        {login.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      width={48}
      height={48}
      className="size-12 shrink-0 rounded-full border border-line bg-line"
    />
  );
}
