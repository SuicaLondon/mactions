/** Explains a failed "load more" request next to the button that retries it. */
export function LoadMoreError({ error, subject }: { error: Error; subject: string }) {
  return (
    <p
      role="alert"
      className="m-0 text-center text-xs/normal wrap-anywhere text-danger"
      title={error.message}
    >
      Couldn't load more {subject}. {error.message}
    </p>
  );
}
