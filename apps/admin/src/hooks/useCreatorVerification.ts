import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminCreatorApplication, type AdminModerationStory } from '@arcanium/api-client';
import type { CreatorApplication, ModeratedStory } from '../types';

// ---------------------------------------------------------------------------
// Shape adapters — bridge DB wire types to admin UI types
// ---------------------------------------------------------------------------

function toCreatorApplication(a: AdminCreatorApplication): CreatorApplication {
  return {
    id:             a.id,
    userId:         a.userId,
    applicantName:  a.applicantName,
    penName:        a.penName,
    email:          a.email,
    portfolioUrl:   a.portfolioUrl ?? '',
    sampleTitle:    a.sampleTitle,
    sampleSynopsis: a.sampleSynopsis,
    pitch:          a.pitch,
    primaryGenre:   a.primaryGenre,
    status:         a.status,
    submittedAt:    a.submittedAt,
    reviewedAt:     a.reviewedAt ?? undefined,
    reviewedBy:     a.reviewedBy ?? undefined,
  };
}

function toModeratedStory(s: AdminModerationStory): ModeratedStory {
  return {
    id:             s.id,
    title:          s.title,
    authorName:     s.authorName,
    authorId:       s.authorId,
    flagReason:     s.flagReason,
    riskScore:      s.riskScore,
    wordCount:      s.wordCount,
    chapters:       s.chapters,
    status:         s.status,
    reportedAt:     s.reportedAt,
    excerptSnippet: s.excerptSnippet,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCreatorVerification() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab]   = useState<'applications' | 'moderation'>('applications');
  const [appFilter, setAppFilter]   = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: appsData, isLoading: appsLoading, isError: appsError } = useQuery({
    queryKey: ['admin', 'creator-applications', appFilter],
    queryFn:  () => adminApi.getCreatorApplications({
      status: appFilter !== 'ALL' ? appFilter : undefined,
      limit:  50,
    }),
  });

  const { data: storiesData, isLoading: storiesLoading, isError: storiesError } = useQuery({
    queryKey: ['admin', 'moderation-stories'],
    queryFn:  () => adminApi.getModerationStories({ limit: 50 }),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const invalidateApps    = () => queryClient.invalidateQueries({ queryKey: ['admin', 'creator-applications'] });
  const invalidateStories = () => queryClient.invalidateQueries({ queryKey: ['admin', 'moderation-stories'] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveCreatorApplication(id),
    onSuccess:  invalidateApps,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectCreatorApplication(id),
    onSuccess:  invalidateApps,
  });

  const storyStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateStoryStatus(id, status),
    onSuccess: invalidateStories,
  });

  // ── Derived state ─────────────────────────────────────────────────────────

  const allApplications = (appsData?.data?.applications ?? []).map(toCreatorApplication);
  const allStories      = (storiesData?.data?.stories ?? []).map(toModeratedStory);

  const pendingCount = useMemo(
    () => allApplications.filter((a) => a.status === 'PENDING').length,
    [allApplications],
  );

  const flaggedStoriesCount = useMemo(
    () => allStories.filter((s) => s.status === 'FLAGGED').length,
    [allStories],
  );

  return {
    // Applications
    creators:       allApplications,
    pendingCount,
    appsLoading,
    appsError,
    appFilter,
    setAppFilter,
    approveCreator: (id: string) => approveMutation.mutate(id),
    rejectCreator:  (id: string) => rejectMutation.mutate(id),

    // Moderation
    moderatedStories:   allStories,
    flaggedStoriesCount,
    storiesLoading,
    storiesError,
    setStoryStatus: (id: string, status: string) =>
      storyStatusMutation.mutate({ id, status }),

    // Tab
    activeTab,
    setActiveTab,
  };
}
