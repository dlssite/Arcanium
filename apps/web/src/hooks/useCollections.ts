import { useQuery } from '@tanstack/react-query';
import { contentApi, type CollectionSummary, type CollectionDetail } from '@arcanium/api-client';

export type { CollectionSummary, CollectionDetail };

const STALE = 1000 * 60 * 5;

/** Public list — used by sidebar and any overview section */
export function useCollections() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['collections'],
    queryFn:  async () => {
      const res = await contentApi.listCollections();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: STALE,
  });

  return {
    collections: data ?? [],
    isLoading,
    isError,
  };
}

/** Single collection detail — used by CollectionPage */
export function useCollection(slug: string | null) {
  return useQuery({
    queryKey: ['collections', slug],
    queryFn:  async () => {
      const res = await contentApi.getCollection(slug!);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled:   !!slug,
    staleTime: STALE,
  });
}
