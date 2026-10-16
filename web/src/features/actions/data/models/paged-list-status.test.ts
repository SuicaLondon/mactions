import { expect, it } from 'vitest';

import { pagedListStatus, type PagedQuerySnapshot } from './paged-list-status';

const idle: PagedQuerySnapshot = {
  data: undefined,
  error: null,
  isPending: false,
  isFetching: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
};
const failure = new Error('offline');

it.each<[string, Partial<PagedQuerySnapshot>, object]>([
  [
    'reports the first page as loading until it settles',
    { isPending: true, isFetching: true },
    { hasData: false, loading: true, loadError: null, refreshing: true },
  ],
  [
    'replaces the list when the first page fails',
    { isPending: true, error: failure },
    { loading: false, loadError: failure, refreshError: null },
  ],
  [
    'keeps loaded pages and reports a failed poll as a refresh error',
    { data: {}, error: failure },
    { hasData: true, loadError: null, refreshError: failure, nextPage: { error: null } },
  ],
  [
    'reports a failed next page beside Load more only',
    { data: {}, error: failure, hasNextPage: true, isFetchNextPageError: true },
    { refreshError: null, nextPage: { available: true, pending: false, error: failure } },
  ],
])('%s', (_case, snapshot, expected) => {
  expect(pagedListStatus({ ...idle, ...snapshot })).toMatchObject(expected);
});
