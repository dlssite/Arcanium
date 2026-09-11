import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type FeaturedContentItem } from '@arcanium/api-client';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

export type { FeaturedContentItem };

export function useFeaturedManagement() {
  const queryClient    = useQueryClient();
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  const { data, isLoading } = useQuery({
    queryKey:  ['admin', 'featured'],
    enabled:   isAuthenticated,
    queryFn:   () => adminApi.listFeatured(),
    staleTime: 30_000,
  });

  const allPins: FeaturedContentItem[] = data?.data ?? [];

  const homeFeatured     = allPins.filter(p => p.key === 'home_featured');
  const exploreSpotlight = allPins.filter(p => p.key === 'explore_spotlight');

  const pinMutation = useMutation({
    mutationFn: (body: { sectionKey: string; label: string; contentId: string; sortOrder?: number }) =>
      adminApi.pinContent(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'featured'] }),
  });

  const unpinMutation = useMutation({
    mutationFn: (id: string) => adminApi.unpinContent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'featured'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      adminApi.updatePin(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'featured'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, sortOrder }: { id: string; sortOrder: number }) =>
      adminApi.updatePin(id, { sortOrder }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'featured'] }),
  });

  return {
    allPins,
    homeFeatured,
    exploreSpotlight,
    isLoading,
    pin:    (sectionKey: string, label: string, contentId: string, sortOrder?: number) =>
      pinMutation.mutateAsync({ sectionKey, label, contentId, sortOrder }),
    unpin:  (id: string) => unpinMutation.mutateAsync(id),
    toggle: (id: string, enabled: boolean) => toggleMutation.mutateAsync({ id, enabled }),
    reorder:(id: string, sortOrder: number) => reorderMutation.mutateAsync({ id, sortOrder }),
    isPinning:   pinMutation.isPending,
    isUnpinning: unpinMutation.isPending,
  };
}
