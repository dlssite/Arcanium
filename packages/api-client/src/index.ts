import type { ApiResponse } from '@arcanium/types';

// ---------------------------------------------------------------------------
// Core client class
// ---------------------------------------------------------------------------

class ApiClient {
  private baseUrl: string;
  private getToken: (() => string | null) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setTokenGetter(fn: () => string | null): void {
    this.getToken = fn;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = this.getToken?.();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });
    return response.json() as Promise<ApiResponse<T>>;
  }

  get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  patch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

function resolveBaseUrl(): string {
  // Use the literal form so Vite replaces it statically at build time.
  // Dynamic key access (env?.['VITE_API_BASE_URL']) bypasses Vite's replacement.
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  return 'http://localhost:4000';
}

export const apiClient = new ApiClient(resolveBaseUrl());

export { resolveBaseUrl };

// ---------------------------------------------------------------------------
// Typed endpoint helpers
// ---------------------------------------------------------------------------

import type {
  UserProfile,
  RegisterInput,
  LoginInput,
  AuthTokenResponse,
  LibraryResponse,
  AddToShelfInput,
  UpsertProgressInput,
  ContentListResponse,
  ContentDetail,
  ContentQuery,
  ChapterDetail,
  CompanionChatRequest,
  CompanionChatResponse,
  CommunityOverview,
  EchoResponse,
  CreateContentInput,
  UpdateContentInput,
  CreateChapterInput,
  UpdateChapterInput,
  CreatorChapterSummary,
  IngestContentInput,
  CreatorApplicationInput,
  ReviewListResponse,
  ReviewCreateResponse,
  ReviewDeleteResponse,
  ReviewInput,
  ReviewQuery,
  EchoToggleResponse,
  AdminReviewsListResponse,
  AdminReviewQuery,
  AdminReviewAnalytics,
  UpdateUserInput,
  DefaultAvatar,
  RankDefinition,
  AdminRankDefinition,
  AdminRankInput,
  XpConfig,
  // Circle types
  CircleListResponse,
  CircleSummary,
  CircleDetail,
  CirclePost,
  CirclePostList,
  CirclePostReply,
  CirclePostReplyList,
  CircleEchoResponse,
  CircleSession,
  CircleMember,
  CircleJoinRequest,
  CreateCircleInput,
  UpdateCircleInput,
  CreateCirclePostInput,
  CreateCircleReplyInput,
  StartSessionInput,
  CircleListParams,
  CirclePostListParams,
  CircleReplyListParams,
  AdminCircleListResponse,
  AdminCircleSummary,
  AdminCircleDetail,
  AdminCreateCircleInput,
  CircleConfig,
  AdminCircleListParams,
} from '@arcanium/types';

export type { AdminRankDefinition, AdminRankInput, RankDefinition, DefaultAvatar, XpConfig };
export type {
  CircleListResponse, CircleSummary, CircleDetail,
  CirclePost, CirclePostList, CirclePostReply, CirclePostReplyList,
  CircleEchoResponse, CircleSession, CircleMember, CircleJoinRequest,
  CreateCircleInput, UpdateCircleInput, CreateCirclePostInput,
  CreateCircleReplyInput, StartSessionInput,
  AdminCircleListResponse, AdminCircleSummary, AdminCircleDetail,
  AdminCreateCircleInput, CircleConfig,
};

export const authApi = {
  register: (body: RegisterInput) =>
    apiClient.post<AuthTokenResponse>('/api/v1/auth/register', body),
  login: (body: LoginInput) =>
    apiClient.post<AuthTokenResponse>('/api/v1/auth/login', body),
  refresh: () =>
    apiClient.post<AuthTokenResponse>('/api/v1/auth/refresh'),
  logout: () =>
    apiClient.post<{ message: string }>('/api/v1/auth/logout'),
};

export const usersApi = {
  getMe: () => apiClient.get<UserProfile>('/api/v1/users/me'),

  /** PATCH /api/v1/users/me — update display name, avatar URL, bio, gender */
  updateMe: (body: UpdateUserInput) =>
    apiClient.patch<UserProfile>('/api/v1/users/me', body),

  /** GET /api/v1/users/default-avatars — public list of enabled preset avatars */
  getDefaultAvatars: () =>
    apiClient.get<DefaultAvatar[]>('/api/v1/users/default-avatars'),

  /** GET /api/v1/users/ranks — public list of enabled ranks ordered by level */
  getRanks: () =>
    apiClient.get<RankDefinition[]>('/api/v1/users/ranks'),
};

export const libraryApi = {
  getLibrary: () =>
    apiClient.get<LibraryResponse>('/api/v1/library'),
  addToShelf: (shelfId: string, body: AddToShelfInput) =>
    apiClient.post<{ message: string }>(`/api/v1/library/shelves/${shelfId}/entries`, body),
  removeFromShelf: (shelfId: string, contentId: string) =>
    apiClient.delete<{ message: string }>(`/api/v1/library/shelves/${shelfId}/entries/${contentId}`),
  upsertProgress: (contentId: string, body: UpsertProgressInput) =>
    apiClient.put<{ message: string }>(`/api/v1/library/progress/${contentId}`, body),
};

export const contentApi = {
  /** GET /api/v1/content/featured — admin-curated sections grouped by key */
  getFeatured: () =>
    apiClient.get<FeaturedSections>('/api/v1/content/featured'),

  /** GET /api/v1/collections — public list of enabled collections */
  listCollections: () =>
    apiClient.get<CollectionSummary[]>('/api/v1/collections'),

  /** GET /api/v1/collections/:slug — single collection with all books */
  getCollection: (slug: string) =>
    apiClient.get<CollectionDetail>(`/api/v1/collections/${slug}`),

  /** GET /api/v1/content — paginated catalogue with optional filters */
  list: (params?: Partial<ContentQuery>) => {
    const qs = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return apiClient.get<ContentListResponse>(`/api/v1/content${qs}`);
  },
  /** GET /api/v1/content/:slug — single content with chapters */
  get: (slug: string) =>
    apiClient.get<ContentDetail>(`/api/v1/content/${slug}`),
  /** GET /api/v1/content/:slug/chapters/:number — full chapter with bodyText */
  getChapter: (slug: string, number: number) =>
    apiClient.get<ChapterDetail>(`/api/v1/content/${slug}/chapters/${number}`),
};

export const companionApi = {
  /** POST /api/v1/ai/chat — send a message to Liber */
  chat: (body: CompanionChatRequest) =>
    apiClient.post<CompanionChatResponse>('/api/v1/ai/chat', body),
};

// ---------------------------------------------------------------------------
// Public categories API (no auth required)
// ---------------------------------------------------------------------------

export const categoriesApi = {
  /** GET /api/v1/categories — returns enabled categories ordered by sortOrder */
  list: () => apiClient.get<Category[]>('/api/v1/categories'),
};

export const connectApi = {
  /** GET /api/v1/connect — returns enabled connect cards */
  list: () => apiClient.get<{
    id: string;
    title: string;
    description: string | null;
    url: string;
    iconName: string | null;
    category: 'COMMUNITY' | 'SPONSOR' | 'SOCIAL' | 'OTHER';
    displayOrder: number;
  }[]>('/api/v1/connect'),
};

export const communityApi = {
  /** GET /api/v1/community/overview — circles + posts + challenge */
  getOverview: () =>
    apiClient.get<CommunityOverview>('/api/v1/community/overview'),
  /** POST /api/v1/community/echo/:postId — increment echo count */
  echo: (postId: string) =>
    apiClient.post<EchoResponse>(`/api/v1/community/echo/${postId}`),
};

export const creatorApi = {
  /** POST /api/v1/users/creator-application — submit a verified-writer application */
  applyForVerification: (body: CreatorApplicationInput) =>
    apiClient.post<{ id: string; status: string; penName: string; submittedAt: string }>(
      '/api/v1/users/creator-application',
      body,
    ),
  /** POST /api/v1/creator — create new content */
  createContent: (body: CreateContentInput) =>
    apiClient.post<ContentDetail>('/api/v1/creator', body),
  /** GET /api/v1/creator — list own content */
  listContent: () =>
    apiClient.get<ContentDetail[]>('/api/v1/creator'),
  /** PATCH /api/v1/creator/:contentId — update metadata */
  updateContent: (contentId: string, body: UpdateContentInput) =>
    apiClient.patch<ContentDetail>(`/api/v1/creator/${contentId}`, body),
  /** GET /api/v1/creator/:contentId/chapters — list all chapters (incl. drafts) */
  listChapters: (contentId: string) =>
    apiClient.get<CreatorChapterSummary[]>(`/api/v1/creator/${contentId}/chapters`),
  /** POST /api/v1/creator/:contentId/chapters — create chapter */
  createChapter: (contentId: string, body: CreateChapterInput) =>
    apiClient.post<CreatorChapterSummary>(`/api/v1/creator/${contentId}/chapters`, body),
  /** PATCH /api/v1/creator/:contentId/chapters/:chapterId — update chapter */
  updateChapter: (contentId: string, chapterId: string, body: UpdateChapterInput) =>
    apiClient.patch<CreatorChapterSummary>(`/api/v1/creator/${contentId}/chapters/${chapterId}`, body),
  /** POST /api/v1/creator/:contentId/chapters/:chapterId/publish — publish draft */
  publishChapter: (contentId: string, chapterId: string) =>
    apiClient.post<CreatorChapterSummary>(`/api/v1/creator/${contentId}/chapters/${chapterId}/publish`),
  /** DELETE /api/v1/creator/:contentId/chapters/:chapterId — delete draft */
  deleteChapter: (contentId: string, chapterId: string) =>
    apiClient.delete<{ message: string }>(`/api/v1/creator/${contentId}/chapters/${chapterId}`),
};

// ---------------------------------------------------------------------------
// Shared admin query-string builder
// ---------------------------------------------------------------------------

function buildQs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ---------------------------------------------------------------------------
// Reviews & Ratings API
// ---------------------------------------------------------------------------

export const reviewApi = {
  /** GET /api/v1/content/:slug/reviews — list reviews for a book */
  list: (slug: string, params?: Partial<ReviewQuery>) => {
    const qs = buildQs(params as Record<string, string | number | boolean | undefined>);
    return apiClient.get<ReviewListResponse>(`/api/v1/content/${slug}/reviews${qs}`);
  },

  /** POST /api/v1/content/:slug/reviews — create or update user's review */
  createOrUpdate: (slug: string, body: ReviewInput) =>
    apiClient.post<ReviewCreateResponse>(`/api/v1/content/${slug}/reviews`, body),

  /** DELETE /api/v1/content/:slug/reviews — delete user's own review */
  delete: (slug: string) =>
    apiClient.delete<ReviewDeleteResponse>(`/api/v1/content/${slug}/reviews`),

  /** POST /api/v1/reviews/:reviewId/echo — toggle echo on a review */
  toggleEcho: (reviewId: string) =>
    apiClient.post<EchoToggleResponse>(`/api/v1/reviews/${reviewId}/echo`),
};

// ---------------------------------------------------------------------------
// Admin Reviews API
// ---------------------------------------------------------------------------

export const adminReviewApi = {
  /** GET /api/v1/admin/reviews — list all reviews with filters */
  list: (params?: Partial<AdminReviewQuery>) =>
    apiClient.get<AdminReviewsListResponse>(`/api/v1/admin/reviews${buildQs(params)}`),

  /** DELETE /api/v1/admin/reviews/:reviewId — delete a review */
  delete: (reviewId: string) =>
    apiClient.delete<{ deleted: boolean; reviewId: string }>(
      `/api/v1/admin/reviews/${reviewId}`,
    ),

  /** GET /api/v1/admin/reviews/analytics — review statistics */
  getAnalytics: () =>
    apiClient.get<AdminReviewAnalytics>('/api/v1/admin/reviews/analytics'),
};

// ---------------------------------------------------------------------------
// Admin types (lightweight — full types live in @arcanium/types)
// ---------------------------------------------------------------------------

export interface AdminUserSummary {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  streakDays: number;
  totalReadingHours: number;
  shelfCount: number;
  booksRead: number;
  archiveLevel: number;
  joinedAt: string;
  lastActiveAt: string;
  emailVerified: boolean;
  notes?: string;
}

export interface AdminUsersResponse {
  users: AdminUserSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AdminFeatureFlag {
  key: string;
  name: string;
  description: string;
  category: 'AI_LIBER' | 'CREATOR_ECONOMY' | 'CORE_READER' | 'SYSTEM';
  enabled: boolean;
  rolloutPct: number;
  updatedById: string | null;
  updatedAt: string;
}

export interface AdminCreatorApplication {
  id: string;
  userId: string;
  applicantName: string;
  penName: string;
  email: string;
  portfolioUrl: string | null;
  sampleTitle: string;
  sampleSynopsis: string;
  pitch: string;
  primaryGenre: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface AdminCreatorApplicationsResponse {
  applications: AdminCreatorApplication[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AdminModerationStory {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  flagReason: string;
  riskScore: number;
  wordCount: number;
  chapters: number;
  status: 'FLAGGED' | 'APPROVED' | 'QUARANTINED';
  reportedAt: string;
  excerptSnippet: string;
  contentId: string;
  contentSlug: string;
  contentType: string;
}

export interface AdminModerationStoriesResponse {
  stories: AdminModerationStory[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AdminOverviewStats {
  totalUsers: number;
  newUsersToday: number;
  totalUsersChange: number;
  dailyReadingHours: number;
  dailyReadingHoursChange: number;
  activeLiberChats: number;
  activeLiberChatsChange: number;
  monthlyTokenCost: number;
  monthlyTokenCostLimit: number;
}

export interface AdminActivityItem {
  id: string;
  timestamp: string;  // ISO string
  title: string;
  description: string;
  actor: string;
  type: 'USER' | 'CREATOR' | 'SYSTEM' | 'FLAG' | 'CONTENT' | 'AI';
  severity: 'info' | 'success' | 'warning' | 'danger';
}

export interface AdminMoodStat {
  id: string;
  mood: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  auraDescription: string;
}

export interface AdminTokenUsagePoint {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface AdminLiberAnalytics {
  totalTokensToday: number;
  monthlyCostUsd: number;
  costLimitUsd: number;
  avgLatencyMs: number;
  satisfactionRate: number;
  activeChatsCount: number;
  topMoods: AdminMoodStat[];
  tokenHistory: AdminTokenUsagePoint[];
}

export interface AiConfig {
  model:     string;
  updatedAt: string | null;
  updatedBy: string | null;
  source:    'db' | 'env';
}

// ---------------------------------------------------------------------------
// Badge / Honor types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Featured content curation types
// ---------------------------------------------------------------------------

export interface FeaturedContentItem {
  id:            string;
  key:           string;
  label:         string;
  sortOrder:     number;
  enabled?:      boolean;
  pinnedBy?:     string | null;
  pinnedAt?:     string;
  content: {
    id:            string;
    title:         string;
    slug:          string;
    type:          string;
    status:        string;
    synopsis:      string | null;
    coverImageUrl: string | null;
    rating:        number | null;
    chapterCount:  number;
    author:        string | null;
    sourceSite:    string | null;
    metadata:      unknown;
  };
}

/** Grouped response from GET /api/v1/content/featured */
export type FeaturedSections = Record<string, FeaturedContentItem[]>;

// ---------------------------------------------------------------------------
// Special Collection types
// ---------------------------------------------------------------------------

export interface CollectionSummary {
  id:          string;
  name:        string;
  slug:        string;
  description: string;
  coverColor:  string;
  enabled:     boolean;
  sortOrder:   number;
  createdAt:   string;
  updatedAt:   string;
  _count?:     { entries: number };
  entries?:    CollectionEntryPreview[];
}

export interface CollectionEntryPreview {
  id:      string;
  content: { id: string; title: string; coverImageUrl: string | null };
}

export interface CollectionEntry {
  id:           string;
  collectionId: string;
  contentId:    string;
  sortOrder:    number;
  addedAt:      string;
  content: {
    id:            string;
    title:         string;
    slug:          string;
    type:          string;
    status:        string;
    synopsis:      string | null;
    coverImageUrl: string | null;
    rating:        number | null;
    chapterCount:  number;
    author:        string | null;
    sourceSite:    string | null;
    metadata:      unknown;
  };
}

export interface CollectionDetail extends CollectionSummary {
  entries: CollectionEntry[];
}

export interface CollectionInput {
  name:        string;
  slug:        string;
  description?: string;
  coverColor?:  string;
  enabled?:     boolean;
  sortOrder?:   number;
}

export interface AdminBadge {
  id:           string;
  key:          string;
  title:        string;
  description:  string;
  iconName:     string;
  colorClasses: string;
  tier:         string;
  criteria:     string | null;
  manualOnly:   boolean;
  enabled:      boolean;
  sortOrder:    number;
  createdAt:    string;
  updatedAt:    string;
  _count?:      { awards: number };
}

export interface AdminBadgeInput {
  key:          string;
  title:        string;
  description:  string;
  iconName:     string;
  colorClasses: string;
  tier:         string;
  criteria?:    string;
  manualOnly?:  boolean;
  enabled?:     boolean;
  sortOrder?:   number;
}

export interface AdminBadgeAward {
  id:        string;
  userId:    string;
  badgeId:   string;
  awardedBy: string | null;
  note:      string | null;
  awardedAt: string;
  badge:     AdminBadge;
  user?:     { id: string; displayName: string; email: string; avatarUrl: string | null };
}

export interface AdminDefaultAvatar {
  id:        string;
  url:       string;
  label:     string;
  sortOrder: number;
  enabled:   boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDefaultAvatarInput {
  url:       string;
  label?:    string;
  sortOrder?: number;
  enabled?:  boolean;
}

export interface AdminScraperParser {
  id: string;
  name: string;
  targetDomain: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED';
  latencyMs: number;
  successRate: number;
  totalCrawledToday: number;
  errorCount: number;
  lastRunAt: string;
  selectorType: string;
  enabled: boolean;
  requestDelayMs: number;
  totalCrawledAllTime: number;
}

// Category taxonomy — used by both the public web app and the admin panel
export interface Category {
  id:        string;
  name:      string;   // display label, e.g. "Dark Fantasy"
  genre:     string;   // exact value for ?genre= API filter
  sortOrder: number;
  enabled?:  boolean;  // only present in admin responses
}

export const adminApi = {
  /** POST /api/v1/admin/content/ingest — scrape a URL into the catalogue */
  ingest: (body: IngestContentInput) =>
    apiClient.post<{ contentId: string; slug: string; title: string; chaptersFound: number; chaptersQueued: number }>('/api/v1/admin/content/ingest', body),

  /**
   * GET /api/v1/content — paginated catalogue list (reuses the public content
   * route; no separate admin endpoint needed for read-only catalogue browsing).
   */
  getContent: (params?: Partial<ContentQuery>) => {
    const qs = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return apiClient.get<ContentListResponse>(`/api/v1/content${qs}`);
  },

  // ── User management ────────────────────────────────────────────────────────

  /** GET /api/v1/admin/users */
  getUsers: (params?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get<AdminUsersResponse>(`/api/v1/admin/users${buildQs(params)}`),

  /** GET /api/v1/admin/users/:id */
  getUserById: (id: string) =>
    apiClient.get<AdminUserSummary>(`/api/v1/admin/users/${id}`),

  /** PATCH /api/v1/admin/users/:id/status */
  updateUserStatus: (id: string, status: string) =>
    apiClient.patch<AdminUserSummary>(`/api/v1/admin/users/${id}/status`, { status }),

  /** PATCH /api/v1/admin/users/:id/role */
  updateUserRole: (id: string, role: string) =>
    apiClient.patch<AdminUserSummary>(`/api/v1/admin/users/${id}/role`, { role }),

  // ── Feature Flags ──────────────────────────────────────────────────────────

  /** GET /api/v1/admin/feature-flags — all flags, ordered by category then key */
  getFeatureFlags: () =>
    apiClient.get<AdminFeatureFlag[]>('/api/v1/admin/feature-flags'),

  /** PATCH /api/v1/admin/feature-flags/:key — update enabled, rolloutPct, name, or description */
  updateFeatureFlag: (
    key: string,
    body: { enabled?: boolean; rolloutPct?: number; name?: string; description?: string },
  ) =>
    apiClient.patch<AdminFeatureFlag>(`/api/v1/admin/feature-flags/${key}`, body),

  /** POST /api/v1/admin/feature-flags — create a new flag */
  createFeatureFlag: (body: {
    key: string;
    name: string;
    description: string;
    category: 'AI_LIBER' | 'CREATOR_ECONOMY' | 'CORE_READER' | 'SYSTEM';
    enabled: boolean;
    rolloutPct: number;
  }) =>
    apiClient.post<AdminFeatureFlag>('/api/v1/admin/feature-flags', body),

  // ── Creator Applications ───────────────────────────────────────────────────

  /** GET /api/v1/admin/creators/applications */
  getCreatorApplications: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<AdminCreatorApplicationsResponse>(
      `/api/v1/admin/creators/applications${buildQs(params)}`,
    ),

  /** PATCH /api/v1/admin/creators/applications/:id/approve */
  approveCreatorApplication: (id: string) =>
    apiClient.patch<AdminCreatorApplication>(
      `/api/v1/admin/creators/applications/${id}/approve`,
      {},
    ),

  /** PATCH /api/v1/admin/creators/applications/:id/reject */
  rejectCreatorApplication: (id: string) =>
    apiClient.patch<AdminCreatorApplication>(
      `/api/v1/admin/creators/applications/${id}/reject`,
      {},
    ),

  // ── Story Moderation ───────────────────────────────────────────────────────

  /** GET /api/v1/admin/moderation/stories */
  getModerationStories: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<AdminModerationStoriesResponse>(
      `/api/v1/admin/moderation/stories${buildQs(params)}`,
    ),

  /** PATCH /api/v1/admin/moderation/stories/:id/status   body: { status } */
  updateStoryStatus: (id: string, status: string) =>
    apiClient.patch<AdminModerationStory>(
      `/api/v1/admin/moderation/stories/${id}/status`,
      { status },
    ),

  // ── Dashboard Stats & Analytics ────────────────────────────────────────────

  /** GET /api/v1/admin/stats — overview metric cards */
  getStats: () =>
    apiClient.get<AdminOverviewStats>('/api/v1/admin/stats'),

  /** GET /api/v1/admin/activity — recent activity stream */
  getActivity: (params?: { limit?: number }) =>
    apiClient.get<{ activities: AdminActivityItem[] }>(
      `/api/v1/admin/activity${buildQs(params)}`,
    ),

  /** GET /api/v1/admin/ai/analytics — Liber inference metrics + mood grouping */
  getAiAnalytics: () =>
    apiClient.get<AdminLiberAnalytics>('/api/v1/admin/ai/analytics'),

  // ── Scraper Management ─────────────────────────────────────────────────────

  /** GET /api/v1/admin/scrapers — all scraper configs with live stats */
  getScrapers: () =>
    apiClient.get<AdminScraperParser[]>('/api/v1/admin/scrapers'),

  /** POST /api/v1/admin/scrapers/:id/sync — trigger domain re-crawl */
  syncScraper: (id: string) =>
    apiClient.post<{ contentScanned: number; chaptersQueued: number; errors: number }>(
      `/api/v1/admin/scrapers/${id}/sync`,
    ),

  /** DELETE /api/v1/admin/content/:id — remove a content item and all its chapters */
  deleteContent: (id: string) =>
    apiClient.delete<{ deleted: boolean; id: string; title: string }>(
      `/api/v1/admin/content/${id}`,
    ),

  /** PATCH /api/v1/admin/content/:id — update type, genres, title, author, status */
  updateContentMeta: (
    id: string,
    body: { type?: string; genres?: string[]; title?: string; author?: string; status?: string },
  ) => apiClient.patch<{ id: string; title: string; type: string; status: string; author: string | null; metadata: unknown }>(
    `/api/v1/admin/content/${id}`,
    body,
  ),

  // ── Category Taxonomy ──────────────────────────────────────────────────────

  /** GET /api/v1/admin/categories — all categories including disabled */
  getCategories: () =>
    apiClient.get<Category[]>('/api/v1/admin/categories'),

  /** POST /api/v1/admin/categories */
  createCategory: (body: { name: string; genre: string; sortOrder?: number; enabled?: boolean }) =>
    apiClient.post<Category>('/api/v1/admin/categories', body),

  /** PATCH /api/v1/admin/categories/:id */
  updateCategory: (id: string, body: { name?: string; genre?: string; sortOrder?: number; enabled?: boolean }) =>
    apiClient.patch<Category>(`/api/v1/admin/categories/${id}`, body),

  /** DELETE /api/v1/admin/categories/:id */
  deleteCategory: (id: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(`/api/v1/admin/categories/${id}`),

  /** GET /api/v1/admin/ai/config — current active model */
  getAiConfig: () =>
    apiClient.get<AiConfig>('/api/v1/admin/ai/config'),

  /** PUT /api/v1/admin/ai/config — change active model */
  updateAiConfig: (model: string) =>
    apiClient.put<AiConfig>('/api/v1/admin/ai/config', { model }),

  // ── Badge / Honor Management ───────────────────────────────────────────────

  /** GET /api/v1/admin/badges — all badge definitions */
  listBadges: () =>
    apiClient.get<AdminBadge[]>('/api/v1/admin/badges'),

  /** POST /api/v1/admin/badges — create a badge definition */
  createBadge: (body: AdminBadgeInput) =>
    apiClient.post<AdminBadge>('/api/v1/admin/badges', body),

  /** PATCH /api/v1/admin/badges/:id — update a badge definition */
  updateBadge: (id: string, body: Partial<AdminBadgeInput>) =>
    apiClient.patch<AdminBadge>(`/api/v1/admin/badges/${id}`, body),

  /** DELETE /api/v1/admin/badges/:id — delete a badge definition */
  deleteBadge: (id: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(`/api/v1/admin/badges/${id}`),

  /** GET /api/v1/admin/badges/:id/awards — all user awards for a badge */
  listBadgeAwards: (id: string) =>
    apiClient.get<AdminBadgeAward[]>(`/api/v1/admin/badges/${id}/awards`),

  /** GET /api/v1/admin/users/:id/badges — all badge awards for a user */
  listUserBadges: (userId: string) =>
    apiClient.get<AdminBadgeAward[]>(`/api/v1/admin/users/${userId}/badges`),

  /** POST /api/v1/admin/badges/award — award a badge to a user */
  awardBadge: (body: { userId: string; badgeId: string; note?: string }) =>
    apiClient.post<AdminBadgeAward>('/api/v1/admin/badges/award', body),

  /** DELETE /api/v1/admin/badges/award — revoke a badge from a user */
  revokeBadge: (userId: string, badgeId: string) =>
    apiClient.post<{ revoked: boolean; userId: string; badgeId: string }>(
      '/api/v1/admin/badges/revoke',
      { userId, badgeId },
    ),

  /** POST /api/v1/admin/badges/seed — seed the 8 built-in default badges */
  seedDefaultBadges: () =>
    apiClient.post<{ seeded: number; total: number }>('/api/v1/admin/badges/seed', {}),

  // ── Featured Content Curation ──────────────────────────────────────────────

  /** GET /api/v1/admin/featured — all pins including disabled */
  listFeatured: () =>
    apiClient.get<FeaturedContentItem[]>('/api/v1/admin/featured'),

  /** POST /api/v1/admin/featured — pin a content item to a section */
  pinContent: (body: { sectionKey: string; label: string; contentId: string; sortOrder?: number }) =>
    apiClient.post<FeaturedContentItem>('/api/v1/admin/featured', body),

  /** PATCH /api/v1/admin/featured/:id — toggle enabled / update sortOrder / label */
  updatePin: (id: string, body: { enabled?: boolean; sortOrder?: number; label?: string }) =>
    apiClient.patch<FeaturedContentItem>(`/api/v1/admin/featured/${id}`, body),

  /** DELETE /api/v1/admin/featured/:id — unpin a content item */
  unpinContent: (id: string) =>
    apiClient.delete<{ unpinned: boolean; id: string }>(`/api/v1/admin/featured/${id}`),

  // ── Special Collections ────────────────────────────────────────────────────

  /** GET /api/v1/admin/collections — all collections including disabled */
  listCollections: () =>
    apiClient.get<CollectionSummary[]>('/api/v1/admin/collections'),

  /** POST /api/v1/admin/collections — create a collection */
  createCollection: (body: CollectionInput) =>
    apiClient.post<CollectionSummary>('/api/v1/admin/collections', body),

  /** PATCH /api/v1/admin/collections/:id — update a collection */
  updateCollection: (id: string, body: Partial<CollectionInput>) =>
    apiClient.patch<CollectionSummary>(`/api/v1/admin/collections/${id}`, body),

  /** DELETE /api/v1/admin/collections/:id — delete a collection */
  deleteCollection: (id: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(`/api/v1/admin/collections/${id}`),

  /** GET /api/v1/admin/collections/:id/entries — full entry list */
  listCollectionEntries: (id: string) =>
    apiClient.get<CollectionEntry[]>(`/api/v1/admin/collections/${id}/entries`),

  /** POST /api/v1/admin/collections/:id/entries — add a book */
  addCollectionEntry: (id: string, contentId: string, sortOrder?: number) =>
    apiClient.post<CollectionEntry>(`/api/v1/admin/collections/${id}/entries`, { contentId, sortOrder }),

  /** DELETE /api/v1/admin/collections/:id/entries/:entryId — remove a book */
  removeCollectionEntry: (collectionId: string, entryId: string) =>
    apiClient.delete<{ removed: boolean; id: string }>(`/api/v1/admin/collections/${collectionId}/entries/${entryId}`),

  /** PATCH /api/v1/admin/collections/entries/:entryId — reorder */
  reorderCollectionEntry: (entryId: string, sortOrder: number) =>
    apiClient.patch<CollectionEntry>(`/api/v1/admin/collections/entries/${entryId}`, { sortOrder }),

  // ── Default Avatar Management ──────────────────────────────────────────────

  /** GET /api/v1/admin/default-avatars — all avatars including disabled */
  listDefaultAvatars: () =>
    apiClient.get<AdminDefaultAvatar[]>('/api/v1/admin/default-avatars'),

  /** POST /api/v1/admin/default-avatars — add a new preset avatar */
  createDefaultAvatar: (body: AdminDefaultAvatarInput) =>
    apiClient.post<AdminDefaultAvatar>('/api/v1/admin/default-avatars', body),

  /** PATCH /api/v1/admin/default-avatars/:id */
  updateDefaultAvatar: (id: string, body: Partial<AdminDefaultAvatarInput>) =>
    apiClient.patch<AdminDefaultAvatar>(`/api/v1/admin/default-avatars/${id}`, body),

  /** DELETE /api/v1/admin/default-avatars/:id */
  deleteDefaultAvatar: (id: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(`/api/v1/admin/default-avatars/${id}`),

  // ── Rank Definition Management ─────────────────────────────────────────────

  /** GET /api/v1/admin/ranks — all ranks including disabled */
  listRanks: () =>
    apiClient.get<AdminRankDefinition[]>('/api/v1/admin/ranks'),

  /** POST /api/v1/admin/ranks */
  createRank: (body: AdminRankInput) =>
    apiClient.post<AdminRankDefinition>('/api/v1/admin/ranks', body),

  /** PATCH /api/v1/admin/ranks/:id */
  updateRank: (id: string, body: Partial<AdminRankInput>) =>
    apiClient.patch<AdminRankDefinition>(`/api/v1/admin/ranks/${id}`, body),

  /** DELETE /api/v1/admin/ranks/:id */
  deleteRank: (id: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(`/api/v1/admin/ranks/${id}`),

  /** POST /api/v1/admin/ranks/seed — insert default 10 ranks */
  seedDefaultRanks: () =>
    apiClient.post<{ seeded: number; skipped: number }>('/api/v1/admin/ranks/seed'),

  // ── XP Config ──────────────────────────────────────────────────────────────

  /** GET /api/v1/admin/xp-config — current XP source amounts */
  getXpConfig: () =>
    apiClient.get<XpConfig>('/api/v1/admin/xp-config'),

  /** PATCH /api/v1/admin/xp-config — update one or more XP source amounts */
  updateXpConfig: (body: Partial<XpConfig>) =>
    apiClient.patch<XpConfig>('/api/v1/admin/xp-config', body),

  /** POST /api/v1/admin/xp-config/reset — restore all values to hardcoded defaults */
  resetXpConfig: () =>
    apiClient.post<XpConfig>('/api/v1/admin/xp-config/reset'),

  // ── Reading Circle Management ──────────────────────────────────────────────

  listCircles: (params?: AdminCircleListParams) =>
    apiClient.get<AdminCircleListResponse>(`/api/v1/admin/circles${buildQs(params)}`),

  getCircle: (circleId: string) =>
    apiClient.get<AdminCircleDetail>(`/api/v1/admin/circles/${circleId}`),

  createCircle: (body: AdminCreateCircleInput) =>
    apiClient.post<AdminCircleSummary>('/api/v1/admin/circles', body),

  updateCircle: (circleId: string, body: Partial<AdminCreateCircleInput> & { isArchived?: boolean; featuredOrder?: number }) =>
    apiClient.patch<AdminCircleSummary>(`/api/v1/admin/circles/${circleId}`, body),

  deleteCircle: (circleId: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(`/api/v1/admin/circles/${circleId}`),

  featureCircle: (circleId: string, body: { isFeatured: boolean; featuredOrder?: number }) =>
    apiClient.patch<AdminCircleSummary>(`/api/v1/admin/circles/${circleId}/feature`, body),

  listCircleMembers: (circleId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<CircleMember[]>(`/api/v1/admin/circles/${circleId}/members${buildQs(params)}`),

  removeCircleMember: (circleId: string, userId: string) =>
    apiClient.delete<{ removed: boolean; userId: string }>(`/api/v1/admin/circles/${circleId}/members/${userId}`),

  listCirclePosts: (circleId: string, params?: { page?: number; limit?: number; isRemoved?: boolean }) =>
    apiClient.get<{ data: CirclePost[]; total: number; page: number; hasMore: boolean }>(`/api/v1/admin/circles/${circleId}/posts${buildQs(params)}`),

  removeCirclePost: (circleId: string, postId: string) =>
    apiClient.delete<{ removed: boolean; postId: string }>(`/api/v1/admin/circles/${circleId}/posts/${postId}`),

  listCircleReplies: (circleId: string, postId: string) =>
    apiClient.get<CirclePostReply[]>(`/api/v1/admin/circles/${circleId}/posts/${postId}/replies`),

  removeCircleReply: (circleId: string, postId: string, replyId: string) =>
    apiClient.delete<{ removed: boolean; replyId: string }>(`/api/v1/admin/circles/${circleId}/posts/${postId}/replies/${replyId}`),

  listCircleRequests: (circleId: string, params?: { status?: string }) =>
    apiClient.get<CircleJoinRequest[]>(`/api/v1/admin/circles/${circleId}/requests${buildQs(params)}`),

  approveCircleRequest: (circleId: string, requestId: string) =>
    apiClient.patch<{ approved: boolean; requestId: string }>(`/api/v1/admin/circles/${circleId}/requests/${requestId}/approve`, {}),

  rejectCircleRequest: (circleId: string, requestId: string) =>
    apiClient.patch<{ rejected: boolean; requestId: string }>(`/api/v1/admin/circles/${circleId}/requests/${requestId}/reject`, {}),

  getCircleConfig: () =>
    apiClient.get<CircleConfig>('/api/v1/admin/circle-config'),

  updateCircleConfig: (body: CircleConfig) =>
    apiClient.patch<CircleConfig>('/api/v1/admin/circle-config', body),
};

// ---------------------------------------------------------------------------
// Circles API  — /api/v1/community/circles/...
// ---------------------------------------------------------------------------

export const circlesApi = {
  // ── Directory & detail ────────────────────────────────────────────────────

  list: (params?: CircleListParams) =>
    apiClient.get<CircleListResponse>(`/api/v1/community/circles${buildQs(params)}`),

  get: (circleId: string) =>
    apiClient.get<CircleDetail>(`/api/v1/community/circles/${circleId}`),

  // ── CRUD ─────────────────────────────────────────────────────────────────

  create: (body: CreateCircleInput) =>
    apiClient.post<CircleSummary>('/api/v1/community/circles', body),

  update: (circleId: string, body: UpdateCircleInput) =>
    apiClient.patch<CircleSummary>(`/api/v1/community/circles/${circleId}`, body),

  delete: (circleId: string) =>
    apiClient.delete<{ deleted: boolean }>(`/api/v1/community/circles/${circleId}`),

  // ── Membership ───────────────────────────────────────────────────────────

  join: (circleId: string, body?: { message?: string }) =>
    apiClient.post<{ joined: boolean; status: string }>(`/api/v1/community/circles/${circleId}/join`, body ?? {}),

  leave: (circleId: string) =>
    apiClient.delete<{ left: boolean }>(`/api/v1/community/circles/${circleId}/leave`),

  // ── Join requests ─────────────────────────────────────────────────────────

  listRequests: (circleId: string, params?: { status?: string }) =>
    apiClient.get<CircleJoinRequest[]>(`/api/v1/community/circles/${circleId}/requests${buildQs(params)}`),

  approveRequest: (circleId: string, requestId: string) =>
    apiClient.patch<{ approved: boolean; requestId: string }>(`/api/v1/community/circles/${circleId}/requests/${requestId}/approve`, {}),

  rejectRequest: (circleId: string, requestId: string) =>
    apiClient.patch<{ rejected: boolean; requestId: string }>(`/api/v1/community/circles/${circleId}/requests/${requestId}/reject`, {}),

  // ── Members ───────────────────────────────────────────────────────────────

  listMembers: (circleId: string) =>
    apiClient.get<CircleMember[]>(`/api/v1/community/circles/${circleId}/members`),

  promote: (circleId: string, userId: string) =>
    apiClient.patch<{ id: string; userId: string; role: string }>(`/api/v1/community/circles/${circleId}/members/${userId}/promote`, {}),

  demote: (circleId: string, userId: string) =>
    apiClient.patch<{ id: string; userId: string; role: string }>(`/api/v1/community/circles/${circleId}/members/${userId}/demote`, {}),

  removeMember: (circleId: string, userId: string) =>
    apiClient.delete<{ removed: boolean }>(`/api/v1/community/circles/${circleId}/members/${userId}`),

  // ── Posts ─────────────────────────────────────────────────────────────────

  listPosts: (circleId: string, params?: CirclePostListParams) =>
    apiClient.get<CirclePostList>(`/api/v1/community/circles/${circleId}/posts${buildQs(params)}`),

  createPost: (circleId: string, body: CreateCirclePostInput) =>
    apiClient.post<CirclePost>(`/api/v1/community/circles/${circleId}/posts`, body),

  deletePost: (circleId: string, postId: string) =>
    apiClient.delete<{ removed: boolean }>(`/api/v1/community/circles/${circleId}/posts/${postId}`),

  echoPost: (circleId: string, postId: string) =>
    apiClient.post<CircleEchoResponse>(`/api/v1/community/circles/${circleId}/posts/${postId}/echo`),

  pinPost: (circleId: string, postId: string) =>
    apiClient.patch<{ id: string; isPinned: boolean }>(`/api/v1/community/circles/${circleId}/posts/${postId}/pin`, {}),

  // ── Replies ───────────────────────────────────────────────────────────────

  listReplies: (circleId: string, postId: string, params?: CircleReplyListParams) =>
    apiClient.get<CirclePostReplyList>(`/api/v1/community/circles/${circleId}/posts/${postId}/replies${buildQs(params)}`),

  createReply: (circleId: string, postId: string, body: CreateCircleReplyInput) =>
    apiClient.post<CirclePostReply>(`/api/v1/community/circles/${circleId}/posts/${postId}/replies`, body),

  deleteReply: (circleId: string, postId: string, replyId: string) =>
    apiClient.delete<{ removed: boolean }>(`/api/v1/community/circles/${circleId}/posts/${postId}/replies/${replyId}`),

  // ── Sessions ─────────────────────────────────────────────────────────────

  listSessions: (circleId: string) =>
    apiClient.get<CircleSession[]>(`/api/v1/community/circles/${circleId}/sessions`),

  startSession: (circleId: string, body: StartSessionInput) =>
    apiClient.post<CircleSession>(`/api/v1/community/circles/${circleId}/sessions`, body),

  endSession: (circleId: string) =>
    apiClient.patch<CircleSession>(`/api/v1/community/circles/${circleId}/sessions/active/end`, {}),
};
