import { useQuery } from '@tanstack/react-query';
import { contentApi, type FeaturedContentItem } from '@arcanium/api-client';

const STALE = 1000 * 60 * 5; // 5 minutes

/**
 * Fetches admin-curated featured sections from GET /api/v1/content/featured.
 * Returns helpers for the two named slots used by the web app:
 *   homeFeatured      — "Featured Books" row on Home page  (key: home_featured)
 *   exploreSpotlight  — "Archival Spotlight" banner on Explore (key: explore_spotlight)
 */
export function useFeaturedSections() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['content', 'featured-sections'],
    queryFn: async () => {
      const res = await contentApi.getFeatured();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: STALE,
  });

  const homeFeatured: FeaturedContentItem[]     = data?.['home_featured']     ?? [];
  const exploreSpotlight: FeaturedContentItem[] = data?.['explore_spotlight'] ?? [];

  return {
    homeFeatured,
    exploreSpotlight,
    isLoading,
    isError,
  };
}
