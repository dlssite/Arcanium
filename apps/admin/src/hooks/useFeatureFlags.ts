import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminFeatureFlag } from '@arcanium/api-client';
import type { FeatureFlag, FeatureFlagCategory } from '../types';

// ---------------------------------------------------------------------------
// Shape adapter — DB returns updatedById (nullable), UI expects updatedBy (string)
// ---------------------------------------------------------------------------

function toFeatureFlag(f: AdminFeatureFlag): FeatureFlag {
  return {
    key:         f.key,
    name:        f.name,
    description: f.description,
    category:    f.category as FeatureFlagCategory,
    enabled:     f.enabled,
    rolloutPct:  f.rolloutPct,
    updatedBy:   f.updatedById ?? 'system',
    updatedAt:   f.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFeatureFlags() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | FeatureFlagCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Query ─────────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn:  () => adminApi.getFeatureFlags(),
  });

  const invalidateFlags = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      adminApi.updateFeatureFlag(key, { enabled }),
    onSuccess: invalidateFlags,
  });

  const rolloutMutation = useMutation({
    mutationFn: ({ key, rolloutPct }: { key: string; rolloutPct: number }) =>
      adminApi.updateFeatureFlag(key, { rolloutPct }),
    onSuccess: invalidateFlags,
  });

  const createMutation = useMutation({
    mutationFn: (body: {
      key: string;
      name: string;
      description: string;
      category: FeatureFlagCategory;
      enabled: boolean;
      rolloutPct: number;
    }) => adminApi.createFeatureFlag(body),
    onSuccess: invalidateFlags,
  });

  // ── Derived state ─────────────────────────────────────────────────────────

  const allFlags: FeatureFlag[] = (data?.data ?? []).map(toFeatureFlag);

  const filteredFlags = useMemo(() => {
    return allFlags.filter((f) => {
      const matchesCategory = selectedCategory === 'ALL' || f.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allFlags, selectedCategory, searchQuery]);

  return {
    featureFlags:       filteredFlags,
    allFlagsCount:      allFlags.length,
    activeFlagsCount:   allFlags.filter((f) => f.enabled).length,
    isLoading,
    isError,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,

    /** Toggle a flag's enabled state (inverts current value) */
    toggleFeatureFlag: (key: string, currentEnabled: boolean) =>
      toggleMutation.mutate({ key, enabled: !currentEnabled }),

    /** Set a flag's rollout percentage */
    updateRollout: (key: string, rolloutPct: number) =>
      rolloutMutation.mutate({ key, rolloutPct }),

    /** Create a new feature flag */
    addFeatureFlag: (flag: Omit<FeatureFlag, 'updatedAt' | 'updatedBy'>) =>
      createMutation.mutate(flag),
  };
}
