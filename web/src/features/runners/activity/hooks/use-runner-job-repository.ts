import { useState } from 'react';

import { normalizeJobRepository } from '../models/runner-jobs';

/** The repository an organization runner's jobs are read from, plus its unsubmitted draft. */
export function useRunnerJobRepository() {
  const [draft, setDraft] = useState('');
  const [repository, setRepository] = useState('');
  function submitDraft() {
    setRepository(normalizeJobRepository(draft));
  }
  return { repository, draft, setDraft, submitDraft };
}
