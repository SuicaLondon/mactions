import { describeScope } from '../../models/github-permissions';

/** The token's scopes, or why none are listed. */
export function GitHubScopeList({ scopes }: { scopes: string[] | null | undefined }) {
  if (!scopes) {
    return (
      <p className="m-0 text-xs/relaxed text-muted">
        This login uses a token that does not list its scopes, such as a fine-grained token.
        mactions checks access for each runner target instead.
      </p>
    );
  }
  if (!scopes.length) {
    return (
      <p className="m-0 text-xs/relaxed text-muted">
        This token has no scopes. It can only read public data.
      </p>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Token scopes">
      {scopes.map((scope) => (
        <li
          key={scope}
          title={describeScope(scope)}
          className="rounded-md border border-line bg-canvas px-1.75 py-0.5 font-mono text-xs"
        >
          {scope}
        </li>
      ))}
    </ul>
  );
}
