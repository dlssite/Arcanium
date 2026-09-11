import React, { useState } from 'react';
import {
  Sliders,
  Search,
  Plus,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Feather,
  Server,
  RotateCcw,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { FeatureFlagCategory, FeatureFlag } from '../types';
import { Card, CardHeader, Badge, Button, Input, ToggleSwitch, Modal, Select } from '../components/ui';

export const FeatureFlagsPage: React.FC = () => {
  const {
    featureFlags,
    allFlagsCount,
    activeFlagsCount,
    isLoading,
    isError,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    toggleFeatureFlag,
    updateRollout,
    addFeatureFlag,
  } = useFeatureFlags();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<FeatureFlagCategory>('CORE_READER');
  const [newEnabled, setNewEnabled] = useState(false);
  const [newRollout, setNewRollout] = useState(100);

  const getCategoryIcon = (category: FeatureFlagCategory) => {
    switch (category) {
      case 'AI_LIBER':
        return <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'CREATOR_ECONOMY':
        return <Feather className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'CORE_READER':
        return <BookOpen className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'SYSTEM':
        return <Server className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
    }
  };

  const handleCreateFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newName.trim()) return;

    addFeatureFlag({
      key: newKey.trim(),
      name: newName.trim(),
      description: newDescription.trim(),
      category: newCategory,
      enabled: newEnabled,
      rolloutPct: newRollout,
    });

    setIsAddModalOpen(false);
    setNewKey('');
    setNewName('');
    setNewDescription('');
    setNewEnabled(false);
    setNewRollout(100);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide">
            Feature Flags & Modularity Control
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Dynamically toggle capabilities and canary rollouts globally without deploying code
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="purple" size="md">
            {activeFlagsCount} of {allFlagsCount} Flags Active
          </Badge>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Create Flag
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search by flag key, name, or description..."
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { label: 'All Categories', value: 'ALL' },
                { label: 'AI Liber', value: 'AI_LIBER' },
                { label: 'Creator Economy', value: 'CREATOR_ECONOMY' },
                { label: 'Reader Core', value: 'CORE_READER' },
                { label: 'System', value: 'SYSTEM' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.value
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-[#FAF7F2] dark:bg-[#120E1C] text-[#6D6282] dark:text-[#9E94B3] hover:text-[#2D253A] dark:hover:text-[#F3EFFC] border border-[#E8E2D8] dark:border-[#2A223D]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Feature Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl animate-pulse bg-[#FAF7F2] dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D]" />
          ))
        )}
        {isError && (
          <div className="col-span-2 text-center py-12 text-sm text-rose-500 dark:text-rose-400">
            Failed to load feature flags. Check your connection and try refreshing.
          </div>
        )}
        {!isLoading && !isError && featureFlags.length === 0 && (
          <div className="col-span-2 text-center py-12 text-sm text-[#6D6282] dark:text-[#9E94B3]">
            No flags match your filters.
          </div>
        )}
        {!isLoading && !isError && featureFlags.map((flag) => (
          <Card
            key={flag.key}
            className={`flex flex-col justify-between transition-all duration-200 ${
              flag.enabled
                ? 'border-purple-500/40 shadow-sm dark:shadow-[0_4px_20px_-4px_rgba(139,92,246,0.12)]'
                : 'opacity-85 hover:opacity-100'
            }`}
          >
            <div className="space-y-3">
              {/* Card Top: Category and Toggle */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-md bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D]">
                    {getCategoryIcon(flag.category)}
                  </span>
                  <span className="text-[11px] font-mono text-purple-700 dark:text-purple-300 font-semibold uppercase tracking-wider">
                    {flag.category.replace('_', ' ')}
                  </span>
                </div>

                <ToggleSwitch
                  checked={flag.enabled}
                  onChange={() => toggleFeatureFlag(flag.key, flag.enabled)}
                />
              </div>

              {/* Title & Key */}
              <div>
                <h3 className="text-sm font-bold text-[#2D253A] dark:text-[#F3EFFC]">{flag.name}</h3>
                <div className="font-mono text-[11px] text-[#9E94AB] dark:text-[#6D6282] mt-0.5 select-all">
                  {flag.key}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-[#6D6282] dark:text-[#9E94B3] leading-relaxed">
                {flag.description}
              </p>
            </div>

            {/* Bottom controls: Rollout % and Last Modified */}
            <div className="pt-4 mt-4 border-t border-[#E8E2D8] dark:border-[#2A223D] space-y-3">
              {/* Rollout slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#6D6282] dark:text-[#9E94B3] font-medium">Target Rollout</span>
                  <span className="font-mono font-bold text-[#2D253A] dark:text-[#F3EFFC]">
                    {flag.enabled ? `${flag.rolloutPct}%` : '0% (Disabled)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={flag.rolloutPct}
                  disabled={!flag.enabled}
                  onChange={(e) => updateRollout(flag.key, Number(e.target.value))}
                  className="w-full h-1.5 bg-[#E5DFD5] dark:bg-[#120E1C] rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>

              {/* Audit info */}
              <div className="flex items-center justify-between text-[10px] text-[#9E94AB] dark:text-[#6D6282] font-mono pt-1">
                <span>By: {flag.updatedBy.split('@')[0]}</span>
                <span>{new Date(flag.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add New Feature Flag Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          title="Create New Feature Flag"
          subtitle="Declare a runtime switch to dynamically control client and backend modules"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateFlag}>
                Create Flag
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateFlag} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">Flag Name</label>
              <Input
                placeholder="e.g. AI Audio Narration"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">
                Flag Key (snake_case)
              </label>
              <Input
                placeholder="e.g. enable_audio_narration"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                required
              />
            </div>

            <div>
              <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Briefly summarize what this flag toggles..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] placeholder-[#9E94AB] dark:placeholder-[#6D6282] p-2.5 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Select
                  label="Category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as FeatureFlagCategory)}
                  options={[
                    { label: 'Reader Core', value: 'CORE_READER' },
                    { label: 'AI Liber', value: 'AI_LIBER' },
                    { label: 'Creator Economy', value: 'CREATOR_ECONOMY' },
                    { label: 'System', value: 'SYSTEM' },
                  ]}
                />
              </div>

              <div>
                <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1.5">Initial Rollout</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRollout}
                    onChange={(e) => setNewRollout(Number(e.target.value))}
                    className="w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] p-2 focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <span className="text-xs text-[#6D6282] dark:text-[#9E94B3]">%</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <ToggleSwitch
                label="Enable flag immediately upon creation"
                checked={newEnabled}
                onChange={setNewEnabled}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
