/**
 * useCreatorApplication
 *
 * Manages the lifecycle of a user's verified-writer application.
 *
 * - Reads role + creatorApplicationStatus directly from the /users/me TanStack
 *   query so the values are always authoritative and we know when loading is done.
 * - Exposes a submit mutation that POSTs to /api/v1/users/creator-application.
 * - On success, invalidates the users/me query to re-hydrate the store.
 *
 * Constitution refs:
 *   §8.1 TanStack Query for server state
 *   §4.2 No raw fetch calls in components
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '@arcanium/api-client';
import type { CreatorApplicationInput } from '@arcanium/types';
import { USER_QUERY_KEY } from '../../auth/hooks/useCurrentUser';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser';

export function useCreatorApplication() {
  const queryClient = useQueryClient();

  // Read directly from the authoritative server-state query.
  // isLoading = true until /users/me has resolved at least once.
  const { data: userProfile, isLoading, isSuccess } = useCurrentUser();

  const role                     = userProfile?.role ?? 'USER';
  const creatorApplicationStatus = userProfile?.creatorApplicationStatus ?? null;

  const isVerifiedWriter = role === 'VERIFIED_WRITER';
  const isPrivilegedUser = role === 'ADMIN' || role === 'MODERATOR';
  const hasCreatorAccess = isVerifiedWriter || isPrivilegedUser;
  const hasPendingApp    = creatorApplicationStatus === 'PENDING';
  const wasRejected      = creatorApplicationStatus === 'REJECTED';

  // While the profile is still loading we don't know the real role yet.
  // The card should show a neutral loading state and not act.
  const isRoleKnown = isSuccess;

  const submitMutation = useMutation({
    mutationFn: (body: CreatorApplicationInput) => creatorApi.applyForVerification(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
    },
  });

  return {
    role,
    creatorApplicationStatus,
    isVerifiedWriter,
    isPrivilegedUser,
    hasCreatorAccess,
    hasPendingApp,
    wasRejected,
    isRoleKnown,
    isLoading,
    submitApplication: submitMutation.mutate,
    submitAsync:       submitMutation.mutateAsync,
    isSubmitting:      submitMutation.isPending,
    submitError:       submitMutation.error as Error | null,
    submitSuccess:     submitMutation.isSuccess,
  };
}
