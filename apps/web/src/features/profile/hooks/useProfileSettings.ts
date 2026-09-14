import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@arcanium/api-client';
import { useUserStore } from '../../../stores/useUserStore.js';
import { USER_QUERY_KEY } from '../../auth/hooks/useCurrentUser';
import type { UpdateUserInput, DefaultAvatar } from '@arcanium/types';

/**
 * useProfileSettings
 *
 * Wraps PATCH /api/v1/users/me and the default-avatar list.
 * On a successful save it patches the local Zustand store immediately
 * so every component seeing user.displayName / avatarUrl / bio updates
 * without waiting for a full refetch.
 */
export function useProfileSettings() {
  const queryClient  = useQueryClient();
  const updateUser   = useUserStore((s) => s.updateUser);

  // ── Default avatars (public, no auth) ────────────────────────────────────
  const defaultAvatarsQuery = useQuery({
    queryKey:  ['default-avatars'],
    queryFn:   () => usersApi.getDefaultAvatars(),
    staleTime: 1000 * 60 * 10,
    select:    (res) => (res.data ?? []) as DefaultAvatar[],
  });

  // ── Save mutation ─────────────────────────────────────────────────────────
  const [saveError, setSaveError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: UpdateUserInput) => usersApi.updateMe(body),
    onSuccess: (res) => {
      if (res.error) {
        setSaveError(res.error.message ?? 'Failed to save');
        return;
      }
      // Optimistically patch Zustand store so UI updates immediately
      if (res.data) {
        updateUser({
          displayName: res.data.displayName,
          avatarUrl:   res.data.avatarUrl,
          bio:         (res.data as any).bio    ?? null,
          gender:      (res.data as any).gender ?? null,
        });
      }
      // Invalidate so next background fetch picks up the saved values
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      setSaveError(null);
    },
    onError: (err: Error) => {
      setSaveError(err.message ?? 'Something went wrong');
    },
  });

  /** Call when the modal opens — ensures the form seeds from the latest server state */
  function refreshProfile() {
    queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
  }

  return {
    /** Call to persist profile changes */
    save:      (body: UpdateUserInput) => mutation.mutateAsync(body),
    isSaving:  mutation.isPending,
    saveError,
    clearError: () => setSaveError(null),

    /** Trigger a background refetch of the user profile */
    refreshProfile,

    /** Enabled default avatars the user can pick from */
    defaultAvatars:        defaultAvatarsQuery.data ?? [],
    defaultAvatarsLoading: defaultAvatarsQuery.isLoading,
  };
}
