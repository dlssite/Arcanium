
import React, { useState } from 'react';
import {
  Sparkles, Zap, DollarSign, Clock, MessageSquare,
  Play, Terminal, Code2, Wand2, BarChart2,
  Settings2, ChevronDown, Check, X, Info,
} from 'lucide-react';
import { useLiberAnalytics } from '../hooks/useLiberAnalytics';
import { Card, CardHeader, Badge, Button, Input } from '../components/ui';

// ---------------------------------------------------------------------------
// Curated OpenRouter model catalogue
// Ordered: free → cheap → mid → premium
// Tags: free | tools (supports function calling) | vision
// ---------------------------------------------------------------------------

interface ModelOption {
  id:         string;   // OpenRouter model id
  label:      string;   // short display name
  provider:   string;
  free:       boolean;
  tools:      boolean;  // supports tool / function calling
  vision:     boolean;
  contextK:   number;   // context window in K tokens
  priceIn:    number;   // USD per 1M input tokens  (0 = free)
  priceOut:   number;   // USD per 1M output tokens (0 = free)
  notes?:     string;
}

const OPENROUTER_MODELS: ModelOption[] = [
  // ── FREE ──────────────────────────────────────────────────────────────────
  { id: 'google/gemini-2.0-flash-exp:free',         label: 'Gemini 2.0 Flash (free)',       provider: 'Google',    free: true,  tools: true,  vision: true,  contextK: 1048, priceIn: 0,    priceOut: 0    },
  { id: 'google/gemini-flash-1.5-8b:free',          label: 'Gemini Flash 1.5 8B (free)',    provider: 'Google',    free: true,  tools: true,  vision: true,  contextK: 1000, priceIn: 0,    priceOut: 0    },
  { id: 'meta-llama/llama-3.1-8b-instruct:free',    label: 'Llama 3.1 8B (free)',           provider: 'Meta',      free: true,  tools: true,  vision: false, contextK: 131,  priceIn: 0,    priceOut: 0    },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',   label: 'Llama 3.3 70B (free)',          provider: 'Meta',      free: true,  tools: true,  vision: false, contextK: 131,  priceIn: 0,    priceOut: 0    },
  { id: 'mistralai/mistral-7b-instruct:free',       label: 'Mistral 7B (free)',             provider: 'Mistral',   free: true,  tools: false, vision: false, contextK: 32,   priceIn: 0,    priceOut: 0    },
  { id: 'qwen/qwen-2.5-7b-instruct:free',           label: 'Qwen 2.5 7B (free)',            provider: 'Alibaba',   free: true,  tools: true,  vision: false, contextK: 128,  priceIn: 0,    priceOut: 0    },
  { id: 'deepseek/deepseek-r1:free',                label: 'DeepSeek R1 (free)',            provider: 'DeepSeek',  free: true,  tools: false, vision: false, contextK: 164,  priceIn: 0,    priceOut: 0    },
  // ── BUDGET ────────────────────────────────────────────────────────────────
  { id: 'anthropic/claude-3.5-haiku',               label: 'Claude 3.5 Haiku',              provider: 'Anthropic', free: false, tools: true,  vision: true,  contextK: 200,  priceIn: 0.8,  priceOut: 4    },
  { id: 'google/gemini-flash-1.5',                  label: 'Gemini Flash 1.5',              provider: 'Google',    free: false, tools: true,  vision: true,  contextK: 1000, priceIn: 0.075,priceOut: 0.3  },
  { id: 'google/gemini-2.0-flash-001',              label: 'Gemini 2.0 Flash',              provider: 'Google',    free: false, tools: true,  vision: true,  contextK: 1048, priceIn: 0.1,  priceOut: 0.4  },
  { id: 'openai/gpt-4o-mini',                       label: 'GPT-4o Mini',                   provider: 'OpenAI',    free: false, tools: true,  vision: true,  contextK: 128,  priceIn: 0.15, priceOut: 0.6  },
  { id: 'mistralai/mistral-small-3.1-24b-instruct', label: 'Mistral Small 3.1 24B',         provider: 'Mistral',   free: false, tools: true,  vision: true,  contextK: 128,  priceIn: 0.1,  priceOut: 0.3  },
  { id: 'deepseek/deepseek-chat-v3-0324',           label: 'DeepSeek V3',                   provider: 'DeepSeek',  free: false, tools: true,  vision: false, contextK: 64,   priceIn: 0.27, priceOut: 1.1  },
  // ── MID ───────────────────────────────────────────────────────────────────
  { id: 'anthropic/claude-3.5-sonnet',              label: 'Claude 3.5 Sonnet',             provider: 'Anthropic', free: false, tools: true,  vision: true,  contextK: 200,  priceIn: 3,    priceOut: 15   },
  { id: 'google/gemini-pro-1.5',                    label: 'Gemini Pro 1.5',                provider: 'Google',    free: false, tools: true,  vision: true,  contextK: 2048, priceIn: 1.25, priceOut: 5    },
  { id: 'openai/gpt-4o',                            label: 'GPT-4o',                        provider: 'OpenAI',    free: false, tools: true,  vision: true,  contextK: 128,  priceIn: 2.5,  priceOut: 10   },
  { id: 'meta-llama/llama-3.1-70b-instruct',        label: 'Llama 3.1 70B',                 provider: 'Meta',      free: false, tools: true,  vision: false, contextK: 131,  priceIn: 0.52, priceOut: 0.75 },
  { id: 'qwen/qwen-2.5-72b-instruct',               label: 'Qwen 2.5 72B',                  provider: 'Alibaba',   free: false, tools: true,  vision: false, contextK: 128,  priceIn: 0.35, priceOut: 0.4  },
  // ── PREMIUM ───────────────────────────────────────────────────────────────
  { id: 'anthropic/claude-opus-4',                  label: 'Claude Opus 4',                 provider: 'Anthropic', free: false, tools: true,  vision: true,  contextK: 200,  priceIn: 15,   priceOut: 75,  notes: 'Best reasoning' },
  { id: 'openai/o3-mini',                           label: 'OpenAI o3 Mini',                provider: 'OpenAI',    free: false, tools: true,  vision: false, contextK: 200,  priceIn: 1.1,  priceOut: 4.4, notes: 'Fast reasoning' },
  { id: 'google/gemini-2.5-pro-preview-03-25',      label: 'Gemini 2.5 Pro Preview',        provider: 'Google',    free: false, tools: true,  vision: true,  contextK: 1048, priceIn: 1.25, priceOut: 10,  notes: 'Experimental' },
];

const MODEL_GROUPS = [
  { label: 'Free Models',    models: OPENROUTER_MODELS.filter(m => m.free)  },
  { label: 'Budget (< $1)',  models: OPENROUTER_MODELS.filter(m => !m.free && m.priceIn < 1)   },
  { label: 'Mid-tier',       models: OPENROUTER_MODELS.filter(m => !m.free && m.priceIn >= 1 && m.priceIn < 5)  },
  { label: 'Premium',        models: OPENROUTER_MODELS.filter(m => !m.free && m.priceIn >= 5)  },
];

function priceLabel(m: ModelOption): string {
  if (m.free) return 'Free';
  return `$${m.priceIn}/$${m.priceOut}`;
}

// ---------------------------------------------------------------------------
// Model Picker Modal
// ---------------------------------------------------------------------------

interface ModelPickerProps {
  current:   string;
  saving:    boolean;
  onSelect:  (modelId: string) => void;
  onClose:   () => void;
}

function ModelPickerModal({ current, saving, onSelect, onClose }: ModelPickerProps) {
  const [search,    setSearch]    = useState('');
  const [pending,   setPending]   = useState(current);
  const [filterFree, setFilterFree] = useState(false);
  const [filterTools, setFilterTools] = useState(false);

  const filteredGroups = MODEL_GROUPS.map(g => ({
    ...g,
    models: g.models.filter(m => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.label.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || m.id.includes(q);
      const matchFree   = !filterFree  || m.free;
      const matchTools  = !filterTools || m.tools;
      return matchSearch && matchFree && matchTools;
    }),
  })).filter(g => g.models.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#15101F] border border-[#E8E2D8] dark:border-[#2A223D] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E2D8] dark:border-[#2A223D]">
          <div>
            <h2 className="text-sm font-semibold text-[#2D253A] dark:text-[#F3EFFC] flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-purple-500" />
              Select AI Model
            </h2>
            <p className="text-[11px] text-[#9E94AB] dark:text-[#6D6282] mt-0.5">
              Sourced from OpenRouter. Changes take effect on next Liber request (up to 60s cache).
            </p>
          </div>
          <button onClick={onClose} className="text-[#9E94AB] hover:text-[#2D253A] dark:hover:text-[#F3EFFC] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + filter bar */}
        <div className="px-5 py-3 border-b border-[#E8E2D8] dark:border-[#2A223D] flex flex-col sm:flex-row gap-2">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search models…"
            className="flex-1 bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] placeholder-[#9E94AB] px-3 py-2 focus:outline-none focus:border-purple-500"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFilterFree(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                filterFree
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[#FAF7F2] dark:bg-[#120E1C] border-[#E8E2D8] dark:border-[#2A223D] text-[#6D6282] dark:text-[#9E94B3]'
              }`}
            >
              {filterFree && <Check className="w-3 h-3" />} Free only
            </button>
            <button
              onClick={() => setFilterTools(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                filterTools
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-[#FAF7F2] dark:bg-[#120E1C] border-[#E8E2D8] dark:border-[#2A223D] text-[#6D6282] dark:text-[#9E94B3]'
              }`}
            >
              {filterTools && <Check className="w-3 h-3" />} Tool calling
            </button>
          </div>
        </div>

        {/* Model list */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-4">
          {filteredGroups.length === 0 && (
            <p className="text-xs text-[#9E94AB] dark:text-[#6D6282] text-center py-6">No models match your filters.</p>
          )}
          {filteredGroups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#9E94AB] dark:text-[#6D6282] mb-2 px-1">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.models.map(m => {
                  const isSelected = pending === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPending(m.id)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500/50 dark:border-purple-500/40'
                          : 'bg-[#FAF7F2] dark:bg-[#120E1C] border-[#E8E2D8] dark:border-[#2A223D] hover:border-purple-400/40'
                      }`}
                    >
                      {/* Selection indicator */}
                      <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-purple-500 bg-purple-500' : 'border-[#C5BACF] dark:border-[#352B44]'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>

                      {/* Model info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-medium truncate ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-[#2D253A] dark:text-[#F3EFFC]'}`}>
                            {m.label}
                          </span>
                          {m.free && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-500/25">
                              FREE
                            </span>
                          )}
                          {m.tools && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-full border border-amber-500/25">
                              TOOLS
                            </span>
                          )}
                          {m.vision && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-blue-500/15 text-blue-700 dark:text-blue-300 rounded-full border border-blue-500/25">
                              VISION
                            </span>
                          )}
                          {m.notes && (
                            <span className="text-[9px] text-[#9E94AB] dark:text-[#6D6282] italic">{m.notes}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] mt-0.5 font-mono truncate">
                          {m.id}
                        </div>
                      </div>

                      {/* Price + context */}
                      <div className="text-right shrink-0">
                        <div className={`text-[10px] font-mono font-semibold ${m.free ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#2D253A] dark:text-[#F3EFFC]'}`}>
                          {priceLabel(m)}
                        </div>
                        <div className="text-[9px] text-[#9E94AB] dark:text-[#6D6282]">
                          {m.contextK}K ctx
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E8E2D8] dark:border-[#2A223D] flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[#9E94AB] dark:text-[#6D6282]">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Prices shown as USD per 1M tokens (input/output)
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-[#E8E2D8] dark:border-[#2A223D] text-[#6D6282] dark:text-[#9E94B3] hover:bg-[#FAF7F2] dark:hover:bg-[#1D1528] cursor-pointer">
              Cancel
            </button>
            <button
              disabled={saving || pending === current}
              onClick={() => onSelect(pending)}
              className="text-xs px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              {saving && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Apply Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export const LiberAnalyticsPage: React.FC = () => {
  const {
    liberAnalytics, analyticsLoading,
    currentModel, modelLoading, updateModel, modelUpdating,
    playgroundHistory, promptInput, setPromptInput,
    selectedTool, setSelectedTool, isSimulating, handleRunSimulation,
  } = useLiberAnalytics();

  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelError,      setModelError]      = useState<string | null>(null);

  const totalTokensToday = liberAnalytics?.totalTokensToday ?? 0;
  const avgLatencyMs     = liberAnalytics?.avgLatencyMs     ?? 0;
  const monthlyCostUsd   = liberAnalytics?.monthlyCostUsd   ?? 0;
  const costLimitUsd     = liberAnalytics?.costLimitUsd     ?? 1000;
  const activeChatsCount = liberAnalytics?.activeChatsCount ?? 0;
  const satisfactionRate = liberAnalytics?.satisfactionRate ?? 0;
  const topMoods         = liberAnalytics?.topMoods         ?? [];
  const tokenHistory     = liberAnalytics?.tokenHistory     ?? [];
  const maxTokens = tokenHistory.reduce((m, d) => Math.max(m, d.inputTokens + d.outputTokens), 1);
  const activeModelId   = currentModel?.model ?? '';
  const activeModelMeta = OPENROUTER_MODELS.find(m => m.id === activeModelId);

  const tokenLabel = (n: number) => n >= 1000 ? ((n / 1000).toFixed(1) + 'k') : String(n);

  const handleModelSelect = async (modelId: string) => {
    setModelError(null);
    try {
      await updateModel(modelId);
      setModelPickerOpen(false);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : 'Failed to update model');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide">
            AI Companion (Liber) Operations
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Inference performance, mood sentiment clustering, and function-call testing workbench
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {modelLoading ? (
            <div className="h-7 w-48 rounded-full animate-pulse bg-[#E8E2D8] dark:bg-[#2A223D]" />
          ) : (
            <button
              onClick={() => setModelPickerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300 max-w-[200px] truncate">
                {activeModelMeta ? activeModelMeta.label : (activeModelId || 'Select model\u2026')}
              </span>
              {activeModelMeta?.free  && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-full">FREE</span>}
              {activeModelMeta?.tools && <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-full">TOOLS</span>}
              <ChevronDown className="w-3 h-3 text-purple-500 group-hover:translate-y-0.5 transition-transform" />
            </button>
          )}
          <span className="text-[11px] px-2.5 py-1 rounded-full border border-[#E8E2D8] dark:border-[#2A223D] text-[#6D6282] dark:text-[#9E94B3]">
            Satisfaction: {satisfactionRate}%
          </span>
        </div>
      </div>

      {/* Model error banner */}
      {modelError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          {modelError}
          <button onClick={() => setModelError(null)} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── 4 Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse bg-[#FAF7F2] dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D]" />
          ))
        ) : (
          <>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6D6282] dark:text-[#9E94B3]">Today&apos;s Token Volume</span>
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-xl font-bold text-[#2D253A] dark:text-[#F3EFFC] font-mono mt-2">
                {tokenLabel(totalTokensToday)} tokens
              </div>
              <div className="text-[11px] text-[#9E94AB] dark:text-[#6D6282] mt-1">proxy ~1.1k per action</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6D6282] dark:text-[#9E94B3]">Average Latency</span>
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-xl font-bold text-[#2D253A] dark:text-[#F3EFFC] font-mono mt-2">
                {avgLatencyMs > 0 ? (avgLatencyMs + ' ms') : '\u2014'}
              </div>
              <div className="text-[11px] text-[#9E94AB] dark:text-[#6D6282] mt-1">avg across logged actions</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6D6282] dark:text-[#9E94B3]">Monthly Spend</span>
                <DollarSign className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-[#2D253A] dark:text-[#F3EFFC] font-mono mt-2">
                ${monthlyCostUsd.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#9E94AB] dark:text-[#6D6282] mt-1">Limit: ${costLimitUsd.toFixed(2)}</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6D6282] dark:text-[#9E94B3]">Active Chat Vigils</span>
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-[#2D253A] dark:text-[#F3EFFC] font-mono mt-2">
                {activeChatsCount.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#9E94AB] dark:text-[#6D6282] mt-1">unique users today</div>
            </Card>
          </>
        )}
      </div>

      {/* ── Moods + Token History ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mood Sentiment (2 cols) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Top 5 Diagnosed Reading Moods"
              subtitle="Semantic sentiment from user prompt queries this month"
              icon={<Wand2 className="w-4 h-4" />}
            />
            {analyticsLoading ? (
              <div className="space-y-3 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-1.5 p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D]">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 rounded bg-[#E8E2D8] dark:bg-[#2A223D]" />
                      <div className="h-3 w-16 rounded bg-[#E8E2D8] dark:bg-[#2A223D]" />
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#E8E2D8] dark:bg-[#2A223D]" />
                    <div className="h-2.5 w-48 rounded bg-[#E8E2D8] dark:bg-[#2A223D]" />
                  </div>
                ))}
              </div>
            ) : topMoods.length === 0 ? (
              <div className="mt-4 py-8 text-center text-xs text-[#9E94AB] dark:text-[#6D6282]">
                No mood data yet. Moods are recorded when users ask Liber for reading recommendations.
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {topMoods.map((mood) => (
                  <div key={mood.id} className="p-3 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-xl border border-[#E8E2D8] dark:border-[#2A223D] space-y-2 hover:border-purple-500/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shadow-xs" style={{ backgroundColor: mood.color }} />
                        <span className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC]">{mood.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-[#6D6282] dark:text-[#9E94B3]">{mood.count.toLocaleString()} queries</span>
                        <span className="font-bold text-[#2D253A] dark:text-[#F3EFFC]">{mood.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-[#E5DFD5] dark:bg-[#181326] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: mood.percentage + '%', backgroundColor: mood.color }}
                      />
                    </div>
                    <p className="text-[11px] text-[#6D6282] dark:text-[#9E94B3] italic">&ldquo;{mood.auraDescription}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 7-Day Action Velocity (1 col) */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader
              title="7-Day Action Velocity"
              subtitle="Daily AI interactions (input + output tokens)"
              icon={<BarChart2 className="w-4 h-4" />}
            />
            {analyticsLoading ? (
              <div className="space-y-3 mt-2 flex-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3">
                    <div className="h-2.5 w-8 rounded bg-[#E8E2D8] dark:bg-[#2A223D]" />
                    <div className="flex-1 h-2 rounded-full bg-[#E8E2D8] dark:bg-[#2A223D]" />
                    <div className="h-2.5 w-10 rounded bg-[#E8E2D8] dark:bg-[#2A223D]" />
                  </div>
                ))}
              </div>
            ) : tokenHistory.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8 text-xs text-[#9E94AB] dark:text-[#6D6282] text-center">
                No action history in the last 7 days.
              </div>
            ) : (
              <div className="space-y-3 mt-2 flex-1">
                {tokenHistory.map((day) => {
                  const total = day.inputTokens + day.outputTokens;
                  const pct   = Math.round((total / maxTokens) * 100);
                  return (
                    <div key={day.date} className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-[#6D6282] dark:text-[#9E94B3] w-9 shrink-0">{day.date}</span>
                      <div className="flex-1 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-indigo-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: pct + '%' }}
                        />
                      </div>
                      <span className="font-mono font-semibold text-[#2D253A] dark:text-[#F3EFFC] text-right w-14 shrink-0">
                        {tokenLabel(total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="pt-3 border-t border-[#E8E2D8] dark:border-[#2A223D] text-[10px] text-[#9E94AB] dark:text-[#6D6282] mt-3">
              Bars show total tokens (input + output) proxied from AiActionLog counts.
            </div>
          </Card>
        </div>
      </div>

      {/* ── Playground ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Liber Prompt & Function Calling Playground"
          subtitle="Simulate user prompt responses and tool executions"
          icon={<Terminal className="w-4 h-4" />}
        />
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="e.g. Recommend me a cozy magical academy story or Add Shadow Slave to shelf"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRunSimulation(); }}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#6D6282] dark:text-[#9E94B3] font-medium">Tool:</span>
              <select
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value as 'none' | 'search_content' | 'add_to_shelf')}
                className="bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] px-3 py-2 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="none">Auto-detect</option>
                <option value="search_content">search_content(mood, genre)</option>
                <option value="add_to_shelf">add_to_shelf(shelf, contentId)</option>
              </select>
              <Button variant="primary" size="md" isLoading={isSimulating} icon={<Play className="w-3.5 h-3.5 fill-current" />} onClick={handleRunSimulation}>
                Run Test
              </Button>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9E94AB] dark:text-[#6D6282]">
              Simulation Test Traces
            </h4>

            {playgroundHistory.length === 0 && (
              <p className="text-xs text-[#9E94AB] dark:text-[#6D6282] py-4 text-center">
                No test runs yet. Enter a prompt above and press Run Test.
              </p>
            )}

            {playgroundHistory.map((item) => (
              <div key={item.id} className="p-4 bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-[#E8E2D8] dark:border-[#2A223D] pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-purple-700 dark:text-purple-300 shrink-0">Prompt:</span>
                    <span className="text-[#2D253A] dark:text-[#F3EFFC] italic truncate">&ldquo;{item.prompt}&rdquo;</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-[#6D6282] dark:text-[#9E94B3] shrink-0 ml-3">
                    <span>{item.latencyMs}ms</span>
                    <span>{item.timestamp}</span>
                  </div>
                </div>
                <div className="text-sm text-[#2D253A] dark:text-[#F3EFFC] leading-relaxed pl-3 border-l-2 border-purple-500 font-serif">
                  {item.response}
                </div>
                {item.toolCall && (
                  <div className="p-3 bg-[#F0EBE1] dark:bg-[#0B0813] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300">
                      <div className="flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Function Invoked: {item.toolCall.name}()</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-full border border-amber-500/25 font-medium">
                        Tool Executed
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-[#6D6282] block">Arguments:</span>
                        <pre className="text-purple-700 dark:text-purple-300 overflow-x-auto p-1.5 bg-white dark:bg-[#181326] rounded border border-[#E8E2D8] dark:border-transparent mt-0.5">
                          {JSON.stringify(item.toolCall.args, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-[#6D6282] block">Return Value:</span>
                        <pre className="text-emerald-700 dark:text-emerald-300 overflow-x-auto p-1.5 bg-white dark:bg-[#181326] rounded border border-[#E8E2D8] dark:border-transparent mt-0.5">
                          {JSON.stringify(item.toolCall.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Model Picker Modal ─────────────────────────────────────────── */}
      {modelPickerOpen && (
        <ModelPickerModal
          current={activeModelId}
          saving={modelUpdating}
          onSelect={handleModelSelect}
          onClose={() => setModelPickerOpen(false)}
        />
      )}

    </div>
  );
};
