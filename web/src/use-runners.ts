import { useEffect, useRef, useState } from 'react';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRunners, request } from './api';
import type { Operation, Snapshot } from './types';

export const RUNNERS_KEY = ['runners'] as const;
export const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 5_000, gcTime: 60_000, refetchOnWindowFocus: false },
    mutations: { retry: false, gcTime: 0, networkMode: 'always' },
  },
});

export function usePageVisible() {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

export function useRunners() {
  const client = useQueryClient();
  const visible = usePageVisible();
  const mutating = useRef(false);
  const syncUntil = useRef(0);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const mutation = useMutation({
    mutationFn: (operation: Operation) => request(operation.path, operation.payload),
    onMutate: async operation => {
      setNotice({ message: operation.message });
      await client.cancelQueries({ queryKey: RUNNERS_KEY });
    },
    onSuccess: () => setNotice({ message: 'Done. GitHub connectivity may take a moment to update.' }),
    onError: error => setNotice({
      message: error.message + (error instanceof TypeError ? '\nRefresh to inspect the saved operation before retrying.' : ''),
      error: true,
    }),
    onSettled: (_data, _error, operation) => {
      if (/\/(start|stop|restart)$/.test(operation.path)) syncUntil.current = Date.now() + 60_000;
      mutating.current = false;
      // Hidden-page queries are disabled. Invalidation is serviced when the page is visible.
      void client.invalidateQueries({ queryKey: RUNNERS_KEY });
    },
  });
  const query = useQuery({
    queryKey: RUNNERS_KEY,
    enabled: visible,
    queryFn: async ({ signal }) => {
      if (client.getQueryData<{ connected: boolean }>(['github-connection'])?.connected === false) return getRunners(true, signal);
      const local = mutating.current || Boolean(client.getQueryData<Snapshot>(RUNNERS_KEY)?.operation_running);
      const data = await getRunners(local, signal);
      // Recover remote state once another CLI/browser's operation has finished.
      return local && !data.operation_running && !mutating.current ? getRunners(false, signal) : data;
    },
    refetchInterval: query => !visible ? false : mutation.isPending || query.state.data?.operation_running ? 1_500 : Date.now() < syncUntil.current ? 3_000 : 15_000,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    if (!visible) void client.cancelQueries({ queryKey: RUNNERS_KEY });
  }, [visible, client]);

  function run(operation: Operation) {
    // A synchronous guard also covers two clicks before React's next render.
    if (mutating.current || query.data?.operation_running) return;
    mutating.current = true;
    mutation.mutate(operation);
  }
  return {
    ...query,
    pending: mutation.isPending,
    locked: mutation.isPending || Boolean(query.data?.operation_running),
    notice,
    run,
    refresh: () => { if (visible) void query.refetch({ cancelRefetch: false }); },
  };
}
