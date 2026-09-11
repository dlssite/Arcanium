import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@arcanium/api-client';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

/**
 * Thin hook — fetches the real scraper configs with live stats.
 * Used by both ContentPage (via useContentCatalog) and DashboardPage.
 * 60-second refetch keeps the parser status cards live without hammering the API.
 */
export function useScrapers() {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  const { data, isLoading } = useQuery({
    queryKey:        ['admin', 'scrapers'],
    enabled:         isAuthenticated,
    queryFn:         () => adminApi.getScrapers(),
    refetchInterval: 60_000,
  });

  return {
    parsers:        data?.data ?? [],
    scrapersLoading: isLoading,
  };
}
