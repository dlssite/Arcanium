import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@arcanium/api-client';
import type {
  AdminCircleSummary,
  AdminCircleDetail,
  AdminCreateCircleInput,
  CircleMember,
  CircleJoinRequest,
  CircleConfig,
} from '@arcanium/types';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

export type { AdminCircleSummary, AdminCircleDetail, AdminCreateCircleInput, CircleMember, CircleJoinRequest, CircleConfig };

const ADMIN_CIRCLE_KEYS = {
  all:      ['admin', 'circles'] as const,
  lists:    () => [...ADMIN_CIRCLE_KEYS.all, 'list'] as const,
  list:     (p?: object) => [...ADMIN_CIRCLE_KEYS.lists(), p ?? {}] as const,
  detail:   (id: string) => [...ADMIN_CIRCLE_KEYS.all, 'detail', id] as const,
  members:  (id: string) => [...ADMIN_CIRCLE_KEYS.all, 'members', id] as const,
  posts:    (id: string) => [...ADMIN_CIRCLE_KEYS.all, 'posts', id] as const,
  requests: (id: string) => [...ADMIN_CIRCLE_KEYS.all, 'requests', id] as const,
  config:   ['admin', 'circle-config'] as const,
};

export type CircleVisibilityFilter = 'ALL' | 'PUBLIC' | 'PRIVATE';
export type CircleStatusFilter     = 'ALL' | 'ACTIVE' | 'ARCHIVED' | 'FEATURED';

export function useCircleManagement() {
  const queryClient     = useQueryClient();
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  const [searchQuery,      setSearchQuery]      = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<CircleVisibilityFilter>('ALL');
  const [statusFilter,     setStatusFilter]     = useState<CircleStatusFilter>('ALL');
  const [page,             setPage]             = useState(1);

  const params = {
    page,
    limit: 20,
    ...(searchQuery           ? { search:     searchQuery }    : {}),
    ...(visibilityFilter !== 'ALL' ? { visibility: visibilityFilter } : {}),
    ...(statusFilter === 'ARCHIVED' ? { isArchived: true }  : {}),
    ...(statusFilter === 'ACTIVE'   ? { isArchived: false } : {}),
    ...(statusFilter === 'FEATURED' ? { isFeatured: true }  : {}),
  };

  // ── List ──────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey:  ADMIN_CIRCLE_KEYS.list(params),
    enabled:   isAuthenticated,
    queryFn:   () => adminApi.listCircles(params),
    staleTime: 15_000,
  });

  const circles: AdminCircleSummary[] = (data as any)?.data?.circles ?? [];
  const total:   number               = (data as any)?.data?.total   ?? 0;

  // ── Detail ────────────────────────────────────────────────────────────────
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey:  ADMIN_CIRCLE_KEYS.detail(selectedCircleId!),
    enabled:   isAuthenticated && !!selectedCircleId,
    queryFn:   () => {
      console.log('[useCircleManagement] Fetching detail for circleId:', selectedCircleId);
      return adminApi.getCircle(selectedCircleId!);
    },
    staleTime: 10_000,
  });

  console.log('[useCircleManagement] Detail query:', { selectedCircleId, data: detailQuery.data, isLoading: detailQuery.isLoading, isError: detailQuery.isError });

  const selectedCircle: AdminCircleDetail | null = (detailQuery.data as any)?.data ?? null;

  // ── Config ────────────────────────────────────────────────────────────────
  const configQuery = useQuery({
    queryKey:  ADMIN_CIRCLE_KEYS.config,
    enabled:   isAuthenticated,
    queryFn:   () => adminApi.getCircleConfig(),
    staleTime: 30_000,
  });

  const circleConfig: CircleConfig | null = (configQuery.data as any)?.data ?? null;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: AdminCreateCircleInput) => adminApi.createCircle(body),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.lists() }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminCreateCircleInput> & { isArchived?: boolean; featuredOrder?: number } }) =>
      adminApi.updateCircle(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.lists() });
      if (selectedCircleId) queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.detail(selectedCircleId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCircle(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.lists() });
      setSelectedCircleId(null);
    },
  });

  const featureMutation = useMutation({
    mutationFn: ({ id, isFeatured, featuredOrder }: { id: string; isFeatured: boolean; featuredOrder?: number }) =>
      adminApi.featureCircle(id, { isFeatured, featuredOrder }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.lists() }),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      adminApi.updateCircle(id, { isArchived }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.lists() }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ circleId, userId }: { circleId: string; userId: string }) =>
      adminApi.removeCircleMember(circleId, userId),
    onSuccess: (_d, { circleId }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.detail(circleId) });
      queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.lists() });
    },
  });

  const removePostMutation = useMutation({
    mutationFn: ({ circleId, postId }: { circleId: string; postId: string }) =>
      adminApi.removeCirclePost(circleId, postId),
    onSuccess: (_d, { circleId }) =>
      queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.posts(circleId) }),
  });

  const removeReplyMutation = useMutation({
    mutationFn: ({ circleId, postId, replyId }: { circleId: string; postId: string; replyId: string }) =>
      adminApi.removeCircleReply(circleId, postId, replyId),
    onSuccess: (_d, { circleId }) =>
      queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.posts(circleId) }),
  });

  const approveRequestMutation = useMutation({
    mutationFn: ({ circleId, requestId }: { circleId: string; requestId: string }) =>
      adminApi.approveCircleRequest(circleId, requestId),
    onSuccess: (_d, { circleId }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.detail(circleId) });
      queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.lists() });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: ({ circleId, requestId }: { circleId: string; requestId: string }) =>
      adminApi.rejectCircleRequest(circleId, requestId),
    onSuccess: (_d, { circleId }) =>
      queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.detail(circleId) }),
  });

  const updateConfigMutation = useMutation({
    mutationFn: (body: CircleConfig) => adminApi.updateCircleConfig(body),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ADMIN_CIRCLE_KEYS.config }),
  });

  return {
    circles, total, isLoading, isError,
    searchQuery,      setSearchQuery:      (v: string) => { setSearchQuery(v); setPage(1); },
    visibilityFilter, setVisibilityFilter: (v: CircleVisibilityFilter) => { setVisibilityFilter(v); setPage(1); },
    statusFilter,     setStatusFilter:     (v: CircleStatusFilter) => { setStatusFilter(v); setPage(1); },
    page, setPage,
    hasMore: page * 20 < total,

    selectedCircleId, setSelectedCircleId,
    selectedCircle,
    detailLoading: detailQuery.isLoading,

    circleConfig,
    configLoading: configQuery.isLoading,

    createCircle:   (body: AdminCreateCircleInput) => createMutation.mutateAsync(body),
    updateCircle:   (id: string, body: Parameters<typeof updateMutation.mutateAsync>[0]['body']) =>
      updateMutation.mutateAsync({ id, body }),
    deleteCircle:   (id: string) => deleteMutation.mutateAsync(id),
    featureCircle:  (id: string, isFeatured: boolean, featuredOrder?: number) =>
      featureMutation.mutateAsync({ id, isFeatured, featuredOrder }),
    archiveCircle:  (id: string, isArchived: boolean) =>
      archiveMutation.mutateAsync({ id, isArchived }),

    removeMember:   (circleId: string, userId: string) =>
      removeMemberMutation.mutateAsync({ circleId, userId }),
    removePost:     (circleId: string, postId: string) =>
      removePostMutation.mutateAsync({ circleId, postId }),
    removeReply:    (circleId: string, postId: string, replyId: string) =>
      removeReplyMutation.mutateAsync({ circleId, postId, replyId }),

    approveRequest: (circleId: string, requestId: string) =>
      approveRequestMutation.mutateAsync({ circleId, requestId }),
    rejectRequest:  (circleId: string, requestId: string) =>
      rejectRequestMutation.mutateAsync({ circleId, requestId }),

    updateConfig:   (body: CircleConfig) => updateConfigMutation.mutateAsync(body),

    isCreating:     createMutation.isPending,
    isUpdating:     updateMutation.isPending,
    isDeleting:     deleteMutation.isPending,
    isFeaturing:    featureMutation.isPending,
    isArchiving:    archiveMutation.isPending,
    isConfigSaving: updateConfigMutation.isPending,
  };
}
