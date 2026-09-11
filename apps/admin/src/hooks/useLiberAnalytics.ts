import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminLiberAnalytics, type AiConfig } from '@arcanium/api-client';
import { companionApi } from '@arcanium/api-client';
import { useAdminStore, type PlaygroundHistoryItem, type PlaygroundToolCall } from '../stores/adminStore';
import type { LiberAnalytics } from '../types';

// ---------------------------------------------------------------------------
// Shape adapter — AdminLiberAnalytics (api-client) → LiberAnalytics (UI types)
// Both shapes are structurally identical; this adapter is a safety net in case
// they diverge, and maps id-less mood entries to the id-keyed UI type.
// ---------------------------------------------------------------------------

function toLiberAnalytics(a: AdminLiberAnalytics): LiberAnalytics {
  return {
    totalTokensToday:  a.totalTokensToday,
    monthlyCostUsd:    a.monthlyCostUsd,
    costLimitUsd:      a.costLimitUsd,
    avgLatencyMs:      a.avgLatencyMs,
    satisfactionRate:  a.satisfactionRate,
    activeChatsCount:  a.activeChatsCount,
    topMoods:          a.topMoods,
    tokenHistory:      a.tokenHistory,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLiberAnalytics() {
  // ── AI model config ───────────────────────────────────────────────────────
  const queryClient = useQueryClient();

  const modelConfigQuery = useQuery({
    queryKey: ['admin', 'ai-config'],
    queryFn:  () => adminApi.getAiConfig(),
    staleTime: 30_000,
  });

  const currentModel: AiConfig | null = modelConfigQuery.data?.data ?? null;

  const updateModelMutation = useMutation({
    mutationFn: (model: string) => adminApi.updateAiConfig(model),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin', 'ai-config'] }),
  });

  // ── Real analytics from DB ────────────────────────────────────────────────
  const analyticsQuery = useQuery({
    queryKey:        ['admin', 'ai-analytics'],
    queryFn:         () => adminApi.getAiAnalytics(),
    refetchInterval: 60_000, // refresh every 60 s
  });

  const liberAnalytics: LiberAnalytics | null =
    analyticsQuery.data?.data ? toLiberAnalytics(analyticsQuery.data.data) : null;

  // ── Playground state (client-only — stays in Zustand) ────────────────────
  const playgroundHistory = useAdminStore((s) => s.playgroundHistory);

  const [promptInput, setPromptInput]   = useState('');
  const [selectedTool, setSelectedTool] = useState<'none' | 'search_content' | 'add_to_shelf'>('none');
  const [isSimulating, setIsSimulating] = useState(false);

  // ── Real AI call ──────────────────────────────────────────────────────────

  const handleRunSimulation = async () => {
    const trimmed = promptInput.trim();
    if (!trimmed || isSimulating) return;

    setIsSimulating(true);
    const startMs = Date.now();

    try {
      const res = await companionApi.chat({
        message:             trimmed,
        conversationHistory: [],
      });

      const latencyMs = Date.now() - startMs;

      if (res.error || !res.data) {
        const errorItem: PlaygroundHistoryItem = {
          id:         `test_${Date.now()}`,
          prompt:     trimmed,
          response:   `Error: ${res.error?.message ?? 'Unknown error from AI endpoint'}`,
          toolCall:   undefined,
          latencyMs,
          tokensUsed: 0,
          timestamp:  'Just now',
        };
        useAdminStore.setState((s) => ({ playgroundHistory: [errorItem, ...s.playgroundHistory] }));
        return;
      }

      const firstAction = res.data.actions?.[0];
      const toolCall: PlaygroundToolCall | undefined = firstAction
        ? { name: firstAction.tool, args: firstAction.args, result: { outcome: firstAction.outcome } }
        : undefined;

      const newItem: PlaygroundHistoryItem = {
        id:         `test_${Date.now()}`,
        prompt:     trimmed,
        response:   res.data.reply,
        toolCall,
        latencyMs,
        tokensUsed: 0, // not tracked in AiActionLog yet
        timestamp:  'Just now',
      };

      useAdminStore.setState((s) => ({ playgroundHistory: [newItem, ...s.playgroundHistory] }));
      setPromptInput('');
    } catch (err) {
      const errorItem: PlaygroundHistoryItem = {
        id:         `test_${Date.now()}`,
        prompt:     trimmed,
        response:   `Network error: ${err instanceof Error ? err.message : 'Could not reach the API'}`,
        toolCall:   undefined,
        latencyMs:  Date.now() - startMs,
        tokensUsed: 0,
        timestamp:  'Just now',
      };
      useAdminStore.setState((s) => ({ playgroundHistory: [errorItem, ...s.playgroundHistory] }));
    } finally {
      setIsSimulating(false);
    }
  };

  return {
    liberAnalytics,
    analyticsLoading: analyticsQuery.isLoading,
    analyticsError:   analyticsQuery.isError,
    currentModel,
    modelLoading:     modelConfigQuery.isLoading,
    updateModel:      (model: string) => updateModelMutation.mutateAsync(model),
    modelUpdating:    updateModelMutation.isPending,
    playgroundHistory,
    promptInput,
    setPromptInput,
    selectedTool,
    setSelectedTool,
    isSimulating,
    handleRunSimulation,
  };
}
