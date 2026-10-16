interface RunnerJobRepositoryFormProps {
  owner: string;
  draft: string;
  onDraftChange: (draft: string) => void;
  onSubmit: () => void;
}

/** Chooses which repository's jobs to show for an organization runner. */
export function RunnerJobRepositoryForm({
  owner,
  draft,
  onDraftChange,
  onSubmit,
}: RunnerJobRepositoryFormProps) {
  return (
    <form
      className="mx-0 my-2.5 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="job-repository">Repository in {owner}</label>
      <input
        id="job-repository"
        required
        placeholder={`${owner}/repository`}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        className="flex-1"
      />
      <button type="submit">View jobs</button>
    </form>
  );
}
