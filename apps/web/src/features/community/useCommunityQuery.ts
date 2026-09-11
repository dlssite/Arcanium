import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityApi, apiClient } from '@arcanium/api-client';
import { useAuthStore } from '../auth/store/useAuthStore';
import type { CommunityOverview } from '@arcanium/types';
import { COMMUNITY_KEYS } from './queryKeys';

// Wire token getter at this boundary (idempotent)
apiClient.setTokenGetter(() => useAuthStore.getState().accessToken);

// ---------------------------------------------------------------------------
// GET /api/v1/community/overview
// ---------------------------------------------------------------------------

export function useCommunityQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<CommunityOverview>({
    queryKey: COMMUNITY_KEYS.overview,
    queryFn: async () => {
      const res = await communityApi.getOverview();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2, // 2 minutes — community data changes frequently
  });
}

// ---------------------------------------------------------------------------
// POST /api/v1/community/echo/:postId  — optimistic mutation
// ---------------------------------------------------------------------------

export function useEchoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => communityApi.echo(postId),

    // Optimistic update — increment echo count immediately
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: COMMUNITY_KEYS.overview });

      const previous = queryClient.getQueryData<CommunityOverview>(COMMUNITY_KEYS.overview);

      queryClient.setQueryData<CommunityOverview>(COMMUNITY_KEYS.overview, (old) => {
        if (!old) return old;
        return {
          ...old,
          posts: old.posts.map((p) =>
            p.id === postId ? { ...p, echoCount: p.echoCount + 1 } : p,
          ),
        };
      });

      return { previous };
    },

    onError: (_err, _postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(COMMUNITY_KEYS.overview, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
    },
  });
}
