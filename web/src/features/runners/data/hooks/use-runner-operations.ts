import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addSeconds, toDate } from 'date-fns';
import { useRef, useState } from 'react';

import { request } from '../../../../shared/api/client';
import type { Operation } from '../../../../shared/api/types';
import { currentDate } from '../../../../shared/lib/date';
import { RUNNERS_KEY } from './use-runner-snapshot';

export function useRunnerOperations() {
  const client = useQueryClient();
  const mutating = useRef(false);
  const syncUntil = useRef(toDate(0));
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const mutation = useMutation({
    mutationFn: (operation: Operation) => request(operation.path, operation.payload),
    onMutate: async (operation) => {
      setNotice({ message: operation.message });
      await client.cancelQueries({ queryKey: RUNNERS_KEY });
    },
    onSuccess: () =>
      setNotice({ message: 'Done. GitHub connectivity may take a moment to update.' }),
    onError: (error) => {
      let message = error.message;
      if (error instanceof TypeError)
        message += '\nRefresh to inspect the saved operation before retrying.';
      setNotice({ message, error: true });
    },
    onSettled: (_data, _error, operation) => {
      if (/\/(start|stop|restart)$/.test(operation.path))
        syncUntil.current = addSeconds(currentDate(), 60);
      mutating.current = false;
      // Hidden-page queries are disabled. Invalidation is serviced when the page is visible.
      void client.invalidateQueries({ queryKey: RUNNERS_KEY });
      void client.invalidateQueries({
        predicate: (query) => String(query.queryKey[0]).startsWith('activity-'),
      });
    },
  });

  function run(operation: Operation, operationRunning: boolean) {
    // A synchronous guard also covers two clicks before React's next render.
    if (mutating.current || operationRunning) return;
    mutating.current = true;
    mutation.mutate(operation);
  }

  return { pending: mutation.isPending, mutating, syncUntil, notice, run };
}
