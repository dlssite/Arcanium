import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminActivityItem } from '@arcanium/api-client';
import type { AdminOverviewStats, AdminActivityItem as UIActivityItem } from '../types';

// ---------------------------------------------------------------------------
// Relative time formatter for the activity stream
// ---------------------------------------------------------------------------

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return 'Just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Shape adapter — api-client AdminActivityItem → admin UI AdminActivityItem
// (same shape, just timestamp reformatted to relative string)
// ---------------------------------------------------------------------------

function toUIActivity(a: AdminActivityItem): UIActivityItem {
  return {
    id:          a.id,
    timestamp:   relativeTime(a.timestamp),
    title:       a.title,
    description: a.description,
    actor:       a.actor,
    type:        a.type,
    severity:    a.severity,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAdminStats() {
  const statsQuery = useQuery({
    queryKey:      ['admin', 'stats'],
    queryFn:       () => adminApi.getStats(),
    refetchInterval: 30_000, // refresh every 30 s for live-ish feel
  });

  const activityQuery = useQuery({
    queryKey:      ['admin', 'activity'],
    queryFn:       () => adminApi.getActivity({ limit: 25 }),
    refetchInterval: 15_000,
  });

  const stats: AdminOverviewStats | null = statsQuery.data?.data ?? null;
  const activities: UIActivityItem[] = (activityQuery.data?.data?.activities ?? []).map(toUIActivity);

  return {
    stats,
    activities,
    isLoading:       statsQuery.isLoading,
    isError:         statsQuery.isError,
    activityLoading: activityQuery.isLoading,
  };
}
