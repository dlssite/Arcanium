import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminScraperParser, type Category } from '@arcanium/api-client';
import type { Content } from '@arcanium/types';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';
import type { ContentItem, ContentType, ScraperParser } from '../types';

// ---------------------------------------------------------------------------
// Shape adapters
// ---------------------------------------------------------------------------

function toContentItem(c: Content): ContentItem {
  const metadata = (c.metadata ?? {}) as Record<string, unknown>;
  const genres = Array.isArray(metadata['genres']) ? (metadata['genres'] as string[]) : [];
  const tags   = Array.isArray(metadata['tags'])   ? (metadata['tags']   as string[]) : [];

  return {
    id:            c.id,
    title:         c.title,
    slug:          c.slug,
    type:          c.type as ContentType,
    status:        c.status as ContentItem['status'],
    author:        c.author         ?? 'Unknown',
    sourceSite:    c.sourceSite     ?? '—',
    sourceUrl:     c.sourceUrl      ?? '#',
    chapterCount:  c.chapterCount,
    categories:    genres,
    tags,
    lastScrapedAt: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '—',
    parserStatus:  'HEALTHY' as const,
    rating:        c.rating ?? 0,
    coverUrl:      c.coverImageUrl ?? undefined,
  };
}

// Maps DB SelectorType (CHEERIO, REST, READABILITY) to display labels used in the UI
const SELECTOR_DISPLAY: Record<string, ScraperParser['selectorType']> = {
  CHEERIO:     'Cheerio',
  REST:        'REST',
  READABILITY: 'Cheerio', // closest display equivalent
  PUPPETEER:   'Puppeteer',
  GRAPHQL:     'GraphQL',
};

function toScraperParser(s: AdminScraperParser): ScraperParser {
  return {
    id:                s.id,
    name:              s.name,
    targetDomain:      s.targetDomain,
    status:            s.status,
    latencyMs:         s.latencyMs,
    successRate:       s.successRate,
    totalCrawledToday: s.totalCrawledToday,
    errorCount:        s.errorCount,
    lastRunAt:         s.lastRunAt,
    selectorType:      (SELECTOR_DISPLAY[s.selectorType.toUpperCase()] ?? s.selectorType) as ScraperParser['selectorType'],
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useContentCatalog() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery]       = useState('');
  const [typeFilter, setTypeFilter]         = useState<'ALL' | ContentType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  // ── Content list ──────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'content', searchQuery, typeFilter],
    enabled:  isAuthenticated,
    queryFn:  async () => {
      const res = await adminApi.getContent({
        q:     searchQuery.trim() || undefined,
        type:  typeFilter !== 'ALL' ? (typeFilter as ContentType) : undefined,
        limit: 50,
      });
      if (res.error) throw new Error(res.error.message ?? 'Failed to fetch content');
      return res;
    },
    placeholderData: (prev) => prev,
  });

  const allItems: ContentItem[] = useMemo(
    () => (data?.data?.items ?? []).map(toContentItem),
    [data],
  );

  const contentList = useMemo(() => {
    if (categoryFilter === 'ALL') return allItems;
    return allItems.filter((item) => item.categories.includes(categoryFilter));
  }, [allItems, categoryFilter]);

  // ── Scrapers ──────────────────────────────────────────────────────────────
  const { data: scraperData, isLoading: scrapersLoading } = useQuery({
    queryKey:        ['admin', 'scrapers'],
    enabled:         isAuthenticated,
    queryFn:         () => adminApi.getScrapers(),
    refetchInterval: 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => adminApi.syncScraper(id),
    onSuccess:  (res, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scrapers'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteContent(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'content'] }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { type?: string; genres?: string[]; title?: string; author?: string; status?: string } }) =>
      adminApi.updateContentMeta(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'content'] }),
  });

  const parsers: ScraperParser[] = (scraperData?.data ?? []).map(toScraperParser);

  // ── Categories — DB-backed via TanStack Query ─────────────────────────────
  const { data: catData } = useQuery({
    queryKey: ['admin', 'categories'],
    enabled:  isAuthenticated,
    queryFn:  () => adminApi.getCategories(),
    staleTime: 60_000,
  });

  const categoryNames: string[] = (catData?.data ?? []).map((c: Category) => c.name);

  const addCatMutation = useMutation({
    mutationFn: ({ name, genre }: { name: string; genre: string }) =>
      adminApi.createCategory({ name, genre }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });

  const removeCatMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });

  // addCategory: name and genre are the same string (simple categories)
  const addCategory = (name: string) =>
    addCatMutation.mutate({ name: name.trim(), genre: name.trim() });

  // removeCategory: find id by name then delete
  const removeCategory = (name: string) => {
    const cat = (catData?.data ?? []).find((c: Category) => c.name === name);
    if (cat) removeCatMutation.mutate(cat.id);
  };

  return {
    contentList,
    totalContentCount: data?.data?.total ?? allItems.length,
    isLoading,
    isError,
    categories:   categoryNames,
    parsers,
    scrapersLoading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    addCategory,
    removeCategory,
    triggerScraperSync: (id: string) => syncMutation.mutateAsync(id),
    deleteContent:      (id: string) => deleteMutation.mutate(id),
    updateContent:      (id: string, body: { type?: string; genres?: string[]; title?: string; author?: string; status?: string }) =>
      editMutation.mutateAsync({ id, body }),
  };
}
