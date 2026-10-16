/** GitHub's notes on how complete a loaded activity list is. */
export function DataCoverageNotes({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <details className="mx-0 mt-2.5 max-w-225 text-xs text-muted">
      <summary className="cursor-pointer max-md:py-3">Data coverage</summary>
      {messages.map((message) => (
        <p className="my-2 max-w-prose leading-relaxed" key={message}>
          {message}
        </p>
      ))}
    </details>
  );
}
