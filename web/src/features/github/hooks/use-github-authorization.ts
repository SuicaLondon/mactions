import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { request } from '../../../shared/api/client';
import type { LoginAttempt } from '../../../shared/api/types';
import { usePageVisible } from '../../../shared/hooks/use-page-visible';
import { RUNNERS_KEY } from '../../runners/data/models/runner-snapshot-query';
import type { AuthorizationErrors } from '../models/connection-errors';
import { CONNECTION_KEY } from './use-connection';

const AUTH_KEY = ['github-auth'];

interface GitHubAuthorizationOptions {
  organizationScope: boolean;
  onStarted?: () => void;
  onCompleted?: () => void;
}

/** The device authorization flow, reduced to what its views read. */
export interface GitHubAuthorization {
  attempt: LoginAttempt | undefined;
  /** A device code is waiting to be entered on GitHub. */
  pending: boolean;
  start: () => void;
  starting: boolean;
  cancel: () => void;
  canceling: boolean;
  errors: AuthorizationErrors;
}

export function useGitHubAuthorization({
  organizationScope,
  onStarted,
  onCompleted,
}: GitHubAuthorizationOptions): GitHubAuthorization {
  const visible = usePageVisible();
  const client = useQueryClient();
  // The server keeps the last attempt's result, so only a completion that follows a pending
  // attempt seen here is new; a 'complete' found on mount is an earlier sign-in.
  const watching = useRef(false);
  const auth = useQuery({
    queryKey: AUTH_KEY,
    queryFn: ({ signal }) => request<LoginAttempt>('/api/github/auth', undefined, signal),
    enabled: visible,
    refetchInterval: (query) => {
      if (visible && query.state.data?.status === 'pending') return 1500;
      return false;
    },
  });
  const connect = useMutation({
    mutationFn: () =>
      request<LoginAttempt>('/api/github/auth', {
        organization_scope: organizationScope,
      }),
    onSuccess: (data) => {
      watching.current = true;
      client.setQueryData(AUTH_KEY, data);
      onStarted?.();
    },
    gcTime: 0,
  });
  const cancel = useMutation({
    mutationFn: () => request<LoginAttempt>('/api/github/auth/cancel', {}),
    onSuccess: (data) => client.setQueryData(AUTH_KEY, data),
    gcTime: 0,
  });
  useEffect(() => {
    const status = auth.data?.status;
    if (status === 'pending') watching.current = true;
    if (status !== 'complete' || !watching.current) return;
    watching.current = false;
    onCompleted?.();
    void client.invalidateQueries({ queryKey: CONNECTION_KEY });
    void client.invalidateQueries({ queryKey: RUNNERS_KEY });
    void client.invalidateQueries({ queryKey: ['targets'] });
    void client.invalidateQueries({ queryKey: ['capabilities'] });
    void client.invalidateQueries({ queryKey: ['jobs'] });
  }, [auth.data?.status, client, onCompleted]);
  return {
    attempt: auth.data,
    pending: auth.data?.status === 'pending',
    start: () => connect.mutate(),
    starting: connect.isPending,
    cancel: () => cancel.mutate(),
    canceling: cancel.isPending,
    errors: { auth: auth.error, connect: connect.error, cancel: cancel.error },
  };
}
