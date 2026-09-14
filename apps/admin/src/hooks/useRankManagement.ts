import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminApi,
  type AdminRankDefinition,
  type AdminRankInput,
  type XpConfig,
} from '@arcanium/api-client';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

export type { AdminRankDefinition, AdminRankInput, XpConfig };

// ---------------------------------------------------------------------------
// useRankManagement
// ---------------------------------------------------------------------------
export function useRankManagement() {
  const queryClient     = useQueryClient();
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  const { data, isLoading, isError } = useQuery({
    queryKey:  ['admin', 'ranks'],
    enabled:   isAuthenticated,
    queryFn:   () => adminApi.listRanks(),
    staleTime: 30_000,
  });

  const ranks: AdminRankDefinition[] = (data?.data ?? []).sort((a, b) => a.level - b.level);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'ranks'] });

  const createMutation = useMutation({ mutationFn: (body: AdminRankInput) => adminApi.createRank(body), onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: ({ id, body }: { id: string; body: Partial<AdminRankInput> }) => adminApi.updateRank(id, body), onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: (id: string) => adminApi.deleteRank(id), onSuccess: invalidate });
  const seedMutation   = useMutation({ mutationFn: () => adminApi.seedDefaultRanks(), onSuccess: invalidate });

  return {
    ranks,
    isLoading,
    isError,
    createRank:   (body: AdminRankInput)                      => createMutation.mutateAsync(body),
    updateRank:   (id: string, body: Partial<AdminRankInput>) => updateMutation.mutateAsync({ id, body }),
    deleteRank:   (id: string)                                => deleteMutation.mutateAsync(id),
    seedDefaults: ()                                          => seedMutation.mutateAsync(),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSeeding:  seedMutation.isPending,
  };
}

// ---------------------------------------------------------------------------
// useXpConfig
// ---------------------------------------------------------------------------
export function useXpConfig() {
  const queryClient     = useQueryClient();
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey:  ['admin', 'xp-config'],
    enabled:   isAuthenticated,
    queryFn:   () => adminApi.getXpConfig(),
    staleTime: 30_000,
  });

  const xpConfig: XpConfig | null = query.data?.data ?? null;

  const updateMutation = useMutation({
    mutationFn: (body: Partial<XpConfig>) => adminApi.updateXpConfig(body),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'xp-config'] }),
  });

  const resetMutation = useMutation({
    mutationFn: () => adminApi.resetXpConfig(),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'xp-config'] }),
  });

  return {
    xpConfig,
    isLoading:      query.isLoading,
    updateXpConfig: (body: Partial<XpConfig>) => updateMutation.mutateAsync(body),
    resetXpConfig:  ()                        => resetMutation.mutateAsync(),
    isSaving:       updateMutation.isPending,
    isResetting:    resetMutation.isPending,
  };
}
