/** The parts of a paged query result that decide what a list view shows. */
export interface PagedQuerySnapshot {
  data: unknown;
  error: Error | null;
  isPending: boolean;
  isFetching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
}

export interface NextPageStatus {
  available: boolean;
  pending: boolean;
  /** A failed next-page request, reported beside Load more. */
  error: Error | null;
}

export interface PagedListStatus {
  hasData: boolean;
  /** The first page is still loading. */
  loading: boolean;
  /** The first page failed, so nothing can be shown. */
  loadError: Error | null;
  /** A failed poll while loaded pages stay on screen. */
  refreshError: Error | null;
  refreshing: boolean;
  nextPage: NextPageStatus;
}

/**
 * Separates a paged list's failures by where they are reported: a first-page failure
 * replaces the list, a failed poll keeps the loaded pages, and a failed next page stays
 * beside Load more.
 */
export function pagedListStatus(query: PagedQuerySnapshot): PagedListStatus {
  const hasData = Boolean(query.data);
  let loadError: Error | null = null;
  if (!hasData) loadError = query.error;
  let refreshError: Error | null = null;
  if (hasData && !query.isFetchNextPageError) refreshError = query.error;
  let nextPageError: Error | null = null;
  if (query.isFetchNextPageError) nextPageError = query.error;
  return {
    hasData,
    loading: query.isPending && !query.error,
    loadError,
    refreshError,
    refreshing: query.isFetching,
    nextPage: {
      available: query.hasNextPage,
      pending: query.isFetchingNextPage,
      error: nextPageError,
    },
  };
}
