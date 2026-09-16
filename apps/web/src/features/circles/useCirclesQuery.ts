import { useQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { circlesApi, apiClient } from '@arcanium/api-client';
import { useAuthStore } from '../auth/store/useAuthStore';
import type {
  CircleListParams,
  CirclePostListParams,
  CreateCircleInput,
  UpdateCircleInput,
  CreateCirclePostInput,
  CreateCircleReplyInput,
  StartSessionInput,
  CirclePostList,
  CirclePostReplyList,
} from '@arcanium/types';
import { CIRCLES_KEYS } from './queryKeys';

// Wire token getter (idempotent)
apiClient.setTokenGetter(() => useAuthStore.getState().accessToken);

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useCirclesDirectory(params?: CircleListParams) {
  return useQuery({
    queryKey: CIRCLES_KEYS.list(params),
    queryFn:  async () => {
      const res = await circlesApi.list(params);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCircleDetail(circleId: string) {
  return useQuery({
    queryKey: CIRCLES_KEYS.detail(circleId),
    queryFn:  async () => {
      const res = await circlesApi.get(circleId);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
    enabled:   !!circleId,
  });
}

export function useCirclePosts(circleId: string, params?: CirclePostListParams) {
  return useQuery({
    queryKey: [...CIRCLES_KEYS.posts(circleId), params ?? {}],
    queryFn:  async () => {
      const res = await circlesApi.listPosts(circleId, params);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
    enabled:   !!circleId,
  });
}

export function useCircleReplies(circleId: string, postId: string) {
  return useQuery({
    queryKey: CIRCLES_KEYS.replies(postId),
    queryFn:  async () => {
      const res = await circlesApi.listReplies(circleId, postId);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 1000 * 60,
    enabled:   !!postId,
  });
}

export function useCircleMembers(circleId: string) {
  return useQuery({
    queryKey: CIRCLES_KEYS.members(circleId),
    queryFn:  async () => {
      const res = await circlesApi.listMembers(circleId);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!circleId,
  });
}

export function useCircleRequests(circleId: string) {
  return useQuery({
    queryKey: CIRCLES_KEYS.requests(circleId),
    queryFn:  async () => {
      const res = await circlesApi.listRequests(circleId);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!circleId,
  });
}

export function useCircleSessions(circleId: string) {
  return useQuery({
    queryKey: CIRCLES_KEYS.sessions(circleId),
    queryFn:  async () => {
      const res = await circlesApi.listSessions(circleId);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!circleId,
  });
}

// ---------------------------------------------------------------------------
// Circle mutations
// ---------------------------------------------------------------------------

export function useCreateCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCircleInput) => circlesApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.lists() });
    },
  });
}

export function useUpdateCircle(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCircleInput) => circlesApi.update(circleId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.detail(circleId) });
    },
  });
}

export function useDeleteCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (circleId: string) => circlesApi.delete(circleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.lists() });
    },
  });
}

export function useJoinCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ circleId, message }: { circleId: string; message?: string }) =>
      circlesApi.join(circleId, message ? { message } : {}),
    onSuccess: (_data, { circleId }) => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.detail(circleId) });
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.lists() });
    },
  });
}

export function useLeaveCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (circleId: string) => circlesApi.leave(circleId),
    onSuccess: (_data, circleId) => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.detail(circleId) });
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.lists() });
    },
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ circleId, requestId }: { circleId: string; requestId: string }) =>
      circlesApi.approveRequest(circleId, requestId),
    onSuccess: (_data, { circleId }) => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.requests(circleId) });
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.members(circleId) });
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.detail(circleId) });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ circleId, requestId }: { circleId: string; requestId: string }) =>
      circlesApi.rejectRequest(circleId, requestId),
    onSuccess: (_data, { circleId }) => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.requests(circleId) });
    },
  });
}

export function usePromoteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ circleId, userId }: { circleId: string; userId: string }) =>
      circlesApi.promote(circleId, userId),
    onSuccess: (_data, { circleId }) => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.members(circleId) });
    },
  });
}

export function useDemoteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ circleId, userId }: { circleId: string; userId: string }) =>
      circlesApi.demote(circleId, userId),
    onSuccess: (_data, { circleId }) => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.members(circleId) });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ circleId, userId }: { circleId: string; userId: string }) =>
      circlesApi.removeMember(circleId, userId),
    onSuccess: (_data, { circleId }) => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.members(circleId) });
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.detail(circleId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Post mutations
// ---------------------------------------------------------------------------

export function useCreatePost(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCirclePostInput) => circlesApi.createPost(circleId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.posts(circleId) });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ circleId, postId }: { circleId: string; postId: string }) =>
      circlesApi.deletePost(circleId, postId),
    onSuccess: (_data, { circleId }) => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.posts(circleId) });
    },
  });
}

/**
 * Optimistic echo toggle — mirrors useEchoMutation in useCommunityQuery.ts.
 * Immediately toggles echoed + ±1 echoCount; rolls back on error.
 */
export function useToggleEchoPost(circleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => circlesApi.echoPost(circleId, postId),

    onMutate: async (postId: string) => {
      const postsKey = CIRCLES_KEYS.posts(circleId);
      await queryClient.cancelQueries({ queryKey: postsKey });

      const previous = queryClient.getQueryData<CirclePostList>(postsKey);

      queryClient.setQueryData<CirclePostList>(postsKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          posts: old.posts.map((p) =>
            p.id !== postId ? p : {
              ...p,
              echoed:    !p.echoed,
              echoCount: p.echoed ? Math.max(0, p.echoCount - 1) : p.echoCount + 1,
            },
          ),
        };
      });

      return { previous };
    },

    onError: (_err, _postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CIRCLES_KEYS.posts(circleId), context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.posts(circleId) });
    },
  });
}

export function usePinPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ circleId, postId }: { circleId: string; postId: string }) =>
      circlesApi.pinPost(circleId, postId),
    onSuccess: (_data, { circleId }) => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.posts(circleId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Reply mutations
// ---------------------------------------------------------------------------

/**
 * Optimistic reply creation — increments replyCount on the parent post immediately.
 */
export function useCreateReply(circleId: string, postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateCircleReplyInput) =>
      circlesApi.createReply(circleId, postId, body),

    onMutate: async () => {
      const postsKey = CIRCLES_KEYS.posts(circleId);
      await queryClient.cancelQueries({ queryKey: postsKey });
      const previous = queryClient.getQueryData<CirclePostList>(postsKey);

      queryClient.setQueryData<CirclePostList>(postsKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          posts: old.posts.map((p) =>
            p.id !== postId ? p : { ...p, replyCount: p.replyCount + 1 },
          ),
        };
      });

      return { previous };
    },

    onError: (_err, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CIRCLES_KEYS.posts(circleId), context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.replies(postId) });
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.posts(circleId) });
    },
  });
}

/**
 * Optimistic reply deletion — decrements replyCount on the parent post immediately.
 */
export function useDeleteReply(circleId: string, postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (replyId: string) =>
      circlesApi.deleteReply(circleId, postId, replyId),

    onMutate: async () => {
      const postsKey = CIRCLES_KEYS.posts(circleId);
      await queryClient.cancelQueries({ queryKey: postsKey });
      const previous = queryClient.getQueryData<CirclePostList>(postsKey);

      queryClient.setQueryData<CirclePostList>(postsKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          posts: old.posts.map((p) =>
            p.id !== postId ? p : { ...p, replyCount: Math.max(0, p.replyCount - 1) },
          ),
        };
      });

      return { previous };
    },

    onError: (_err, _replyId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CIRCLES_KEYS.posts(circleId), context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.replies(postId) });
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.posts(circleId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Session mutations
// ---------------------------------------------------------------------------

export function useStartSession(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StartSessionInput) => circlesApi.startSession(circleId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.sessions(circleId) });
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.detail(circleId) });
    },
  });
}

export function useEndSession(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => circlesApi.endSession(circleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.sessions(circleId) });
      void queryClient.invalidateQueries({ queryKey: CIRCLES_KEYS.detail(circleId) });
    },
  });
}
