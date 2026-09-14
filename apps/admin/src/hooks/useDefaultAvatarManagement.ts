import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminDefaultAvatar, type AdminDefaultAvatarInput } from '@arcanium/api-client';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

export type { AdminDefaultAvatar, AdminDefaultAvatarInput };

export function useDefaultAvatarManagement() {
  const queryClient     = useQueryClient();
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  // ── List ──────────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey:  ['admin', 'default-avatars'],
    enabled:   isAuthenticated,
    queryFn:   () => adminApi.listDefaultAvatars(),
    staleTime: 30_000,
  });

  const avatars: AdminDefaultAvatar[] = data?.data ?? [];

  // ── Create ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: AdminDefaultAvatarInput) => adminApi.createDefaultAvatar(body),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'default-avatars'] }),
  });

  // ── Update ────────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminDefaultAvatarInput> }) =>
      adminApi.updateDefaultAvatar(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'default-avatars'] }),
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteDefaultAvatar(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'default-avatars'] }),
  });

  return {
    avatars,
    isLoading,
    isError,

    createAvatar: (body: AdminDefaultAvatarInput)                        => createMutation.mutateAsync(body),
    updateAvatar: (id: string, body: Partial<AdminDefaultAvatarInput>)   => updateMutation.mutateAsync({ id, body }),
    deleteAvatar: (id: string)                                           => deleteMutation.mutateAsync(id),

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
