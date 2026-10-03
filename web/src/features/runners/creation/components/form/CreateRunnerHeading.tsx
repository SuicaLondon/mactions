import { CreationDescription } from './CreationDescription';

export function CreateRunnerHeading({ titleId }: { titleId: string }) {
  return (
    <div className="dialog-heading mb-6 text-center">
      <h2 id={titleId}>Add Runner</h2>
      <p className="mx-auto my-0 max-w-72.5 text-xs leading-normal text-muted">
        <CreationDescription />
      </p>
    </div>
  );
}
