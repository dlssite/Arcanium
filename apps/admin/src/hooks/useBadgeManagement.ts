import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminBadge, type AdminBadgeInput, type AdminBadgeAward } from '@arcanium/api-client';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

export type { AdminBadge, AdminBadgeInput, AdminBadgeAward };

export function useBadgeManagement() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  // ── Badge catalog ─────────────────────────────────────────────────────────
  const badgesQuery = useQuery({
    queryKey: ['admin', 'badges'],
    enabled:  isAuthenticated,
    queryFn:  () => adminApi.listBadges(),
    staleTime: 30_000,
  });

  const badges: AdminBadge[] = badgesQuery.data?.data ?? [];

  // ── Create badge ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: AdminBadgeInput) => adminApi.createBadge(body),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'badges'] }),
  });

  // ── Update badge ──────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminBadgeInput> }) =>
      adminApi.updateBadge(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'badges'] }),
  });

  // ── Delete badge ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteBadge(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'badges'] }),
  });

  // ── Award badge ───────────────────────────────────────────────────────────
  const awardMutation = useMutation({
    mutationFn: (body: { userId: string; badgeId: string; note?: string }) =>
      adminApi.awardBadge(body),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'badges'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-badges', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'badge-awards', vars.badgeId] });
    },
  });

  // ── Revoke badge ──────────────────────────────────────────────────────────
  const revokeMutation = useMutation({
    mutationFn: ({ userId, badgeId }: { userId: string; badgeId: string }) =>
      adminApi.revokeBadge(userId, badgeId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'badges'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-badges', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'badge-awards', vars.badgeId] });
    },
  });

  // ── Seed defaults ─────────────────────────────────────────────────────────
  const seedMutation = useMutation({
    mutationFn: () => adminApi.seedDefaultBadges(),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'badges'] }),
  });

  // ── Per-user badge query (lazy — only fires when a userId is passed) ───────
  function useUserBadges(userId: string | null) {
    return useQuery({
      queryKey: ['admin', 'user-badges', userId],
      enabled:  isAuthenticated && !!userId,
      queryFn:  () => adminApi.listUserBadges(userId!),
      staleTime: 15_000,
    });
  }

  // ── Per-badge award list (lazy) ────────────────────────────────────────────
  function useBadgeAwardList(badgeId: string | null) {
    return useQuery({
      queryKey: ['admin', 'badge-awards', badgeId],
      enabled:  isAuthenticated && !!badgeId,
      queryFn:  () => adminApi.listBadgeAwards(badgeId!),
      staleTime: 15_000,
    });
  }

  return {
    // Data
    badges,
    badgesLoading: badgesQuery.isLoading,
    badgesError:   badgesQuery.isError,

    // Catalog mutations
    createBadge:  (body: AdminBadgeInput) => createMutation.mutateAsync(body),
    updateBadge:  (id: string, body: Partial<AdminBadgeInput>) => updateMutation.mutateAsync({ id, body }),
    deleteBadge:  (id: string) => deleteMutation.mutateAsync(id),
    seedDefaults: () => seedMutation.mutateAsync(),

    // Award / revoke
    awardBadge:  (userId: string, badgeId: string, note?: string) =>
      awardMutation.mutateAsync({ userId, badgeId, note }),
    revokeBadge: (userId: string, badgeId: string) =>
      revokeMutation.mutateAsync({ userId, badgeId }),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAwarding: awardMutation.isPending,
    isRevoking: revokeMutation.isPending,
    isSeeding:  seedMutation.isPending,

    // Lazy sub-queries
    useUserBadges,
    useBadgeAwardList,
  };
}
