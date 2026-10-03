import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { request } from '../../../../shared/api/client';
import type { LoginAttempt } from '../../../../shared/api/types';
import { usePageVisible } from '../../../../shared/hooks/use-page-visible';
import { RUNNERS_KEY } from '../../../runners/data/hooks/use-runner-snapshot';
import { CONNECTION_KEY } from '../connection/use-connection';

const AUTH_KEY = ['github-auth'];

interface GitHubAuthorizationOptions {
  organizationScope: boolean;
  onStarted: () => void;
  onCompleted: () => void;
}

export function useGitHubAuthorization({
  organizationScope,
  onStarted,
  onCompleted,
}: GitHubAuthorizationOptions) {
  const visible = usePageVisible();
  const client = useQueryClient();
  const handled = useRef(false);
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
      handled.current = false;
      client.setQueryData(AUTH_KEY, data);
      onStarted();
    },
    gcTime: 0,
  });
  const cancel = useMutation({
    mutationFn: () => request<LoginAttempt>('/api/github/auth/cancel', {}),
    onSuccess: (data) => client.setQueryData(AUTH_KEY, data),
    gcTime: 0,
  });
  function checkAgain() {
    void client.invalidateQueries({ queryKey: CONNECTION_KEY });
    void client.invalidateQueries({ queryKey: ['capabilities'] });
    void client.invalidateQueries({ queryKey: RUNNERS_KEY });
  }
  useEffect(() => {
    if (auth.data?.status !== 'complete' || handled.current) return;
    handled.current = true;
    onCompleted();
    void client.invalidateQueries({ queryKey: CONNECTION_KEY });
    void client.invalidateQueries({ queryKey: RUNNERS_KEY });
    void client.invalidateQueries({ queryKey: ['targets'] });
    void client.invalidateQueries({ queryKey: ['capabilities'] });
    void client.invalidateQueries({ queryKey: ['jobs'] });
  }, [auth.data?.status, client, onCompleted]);
  return { auth, connect, cancel, checkAgain };
}
