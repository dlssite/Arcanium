import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@arcanium/api-client';
import type { ContentListResponse, ContentDetail, ContentType } from '@arcanium/types';
import { CONTENT_KEYS } from './queryKeys';

// ---------------------------------------------------------------------------
// Catalogue list — filtered by type (and optionally genre / search query)
// ---------------------------------------------------------------------------

interface UseContentQueryParams {
  type?:  ContentType | 'All';
  genre?: string;
  q?:     string;
  page?:  number;
  limit?: number;
}

export function useContentQuery(params: UseContentQueryParams = {}) {
  // Normalise — strip 'All' / empty values before sending to the API
  const { type, ...rest } = params;
  const apiParams = {
    ...rest,
    ...(type && type !== 'All' ? { type } : {}),
    genre: rest.genre === 'All' || !rest.genre ? undefined : rest.genre,
  };

  return useQuery<ContentListResponse>({
    queryKey: CONTENT_KEYS.list(apiParams),
    queryFn: async () => {
      const res = await contentApi.list(apiParams);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });
}

// ---------------------------------------------------------------------------
// Full unfiltered catalogue — used to derive per-type counts for the pills.
// Fetches up to 200 items once; counts are derived client-side from this set
// so there's no N+1 waterfall of per-type requests.
// ---------------------------------------------------------------------------

export function useCatalogueCountsQuery() {
  return useQuery<ContentListResponse>({
    queryKey: CONTENT_KEYS.list({ _counts: true }),
    queryFn: async () => {
      const res = await contentApi.list({ limit: 50, page: 1 });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
    select: (data) => data,
  });
}

// ---------------------------------------------------------------------------
// Single content detail — used by BookDetailModal
// ---------------------------------------------------------------------------

export function useContentDetailQuery(slug: string | null) {
  return useQuery<ContentDetail>({
    queryKey: CONTENT_KEYS.detail(slug ?? ''),
    queryFn: async () => {
      const res = await contentApi.get(slug!);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });
}

// ---------------------------------------------------------------------------
// Featured content — highest-rated item from the unfiltered catalogue
// ---------------------------------------------------------------------------

export function useFeaturedQuery() {
  return useQuery<ContentListResponse>({
    queryKey: CONTENT_KEYS.list({ featured: true }),
    queryFn: async () => {
      const res = await contentApi.list({ limit: 20 });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
    select: (data) => ({
      ...data,
      items: [...data.items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    }),
  });
}
