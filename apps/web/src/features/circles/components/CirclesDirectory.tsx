import React, { useState, useMemo } from 'react';
import { Search, Plus, CircleDot, Sparkles, Users, Flame, BookOpen, Filter, X, ChevronRight, Layers } from 'lucide-react';
import { useCirclesDirectory, useCreateCircle } from '../useCirclesQuery';
import CircleCard from './CircleCard';
import CreateCircleModal from './CreateCircleModal';
import { useUserStore } from '../../../stores/useUserStore.js';
import { useNavigate } from 'react-router-dom';
import type { CircleListParams, CreateCircleInput } from '@arcanium/types';

// Curated Category Filter Tags
const TOPIC_TAGS = [
  'All',
  '#DarkFantasy',
  '#Grimoires',
  '#Classics',
  '#Philosophy',
  '#Sci-Fi',
  '#Poetry',
  '#Eldritch',
  '#Mythology',
];

// Loading skeleton
function CirclesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-64 bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
      ))}
    </div>
  );
}

export default function CirclesDirectory() {
  const navigate     = useNavigate();
  const { user }     = useUserStore();
  const createCircle = useCreateCircle();

  const [search,        setSearch]        = useState('');
  const [selectedTag,   setSelectedTag]   = useState('All');
  const [visibility,    setVisibility]    = useState<'PUBLIC' | 'PRIVATE' | 'ALL'>('PUBLIC');
  const [page,          setPage]          = useState(1);
  const [showCreate,    setShowCreate]    = useState(false);
  const [createError,   setCreateError]   = useState<string | null>(null);

  const params: CircleListParams = {
    page,
    limit: 18,
    ...(search ? { search } : {}),
    ...(visibility ? { visibility } : {}),
  };

  const { data, isLoading, isError } = useCirclesDirectory(params);

  // Client-side category tag filtering
  const filteredCircles = useMemo(() => {
    if (!data?.circles) return [];
    if (selectedTag === 'All') return data.circles;
    return data.circles.filter(c => c.tag?.toLowerCase() === selectedTag.toLowerCase());
  }, [data?.circles, selectedTag]);

  // Aggregate stats
  const totalScholarsActive = useMemo(() => {
    if (!data?.circles) return 0;
    return data.circles.reduce((acc, c) => acc + (c.activeNow || 0), 0);
  }, [data?.circles]);

  // Check create permissions (role or level >= 3)
  const canCreate = ['VERIFIED_WRITER', 'MODERATOR', 'ADMIN'].includes(user?.role ?? '') ||
    ((user as any)?.xp?.rank?.level ?? 0) >= 3;

  async function handleCreate(body: CreateCircleInput) {
    setCreateError(null);
    try {
      const res = await createCircle.mutateAsync(body);
      if (res.error) { setCreateError(res.error.message); return; }
      setShowCreate(false);
      if (res.data) navigate(`/circles/${res.data.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create circle.');
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-3 sm:pt-4 px-4 sm:px-6 lg:px-0 text-[#2D253A] dark:text-[#F1ECF7] transition-colors duration-200">
      
      {/* Grand Hero Section */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#39264D] via-[#4D356A] to-[#684C8B] p-5 sm:p-8 text-white shadow-xl overflow-hidden mb-6 sm:mb-8 border border-[#523A73]">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-purple-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/15 text-[#FFDE88] mb-2.5">
              <Sparkles className="w-3.5 h-3.5 fill-[#FFDE88]" />
              <span>Archival Scholarly Guilds</span>
            </div>
            <h1 className="font-serif font-bold text-2xl sm:text-4xl lg:text-5xl leading-tight">
              Reading Circles & Guilds
            </h1>
            <p className="text-xs sm:text-sm text-stone-200/90 mt-2 leading-relaxed">
              Convene with fellow bibliophiles in focused reading sanctums. Share living marginalia, synchronize chapter readings, and explore arcane literary lore together.
            </p>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-4 sm:gap-6 mt-5 pt-4 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-[#FFDE88]" />
                <span className="font-bold">{data?.total ?? 0}</span>
                <span className="text-stone-300">Circles</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold">{totalScholarsActive}</span>
                <span className="text-stone-300">Reading Now</span>
              </div>
            </div>
          </div>

          {/* Create CTA Action */}
          <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
            {canCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-full text-xs font-bold bg-[#FFDE88] hover:bg-[#ffe8a8] text-[#2D223B] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group"
              >
                <Plus className="w-4 h-4 text-[#2D223B] group-hover:rotate-90 transition-transform" />
                <span>Establish a Circle</span>
              </button>
            ) : (
              <div className="bg-black/30 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-[11px] text-stone-200 max-w-xs">
                <p className="font-bold text-[#FFDE88] mb-0.5">Looking to found a circle?</p>
                <p>Reach Rank Level 3 or become a Verified Writer to create public sanctums.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Control Hub */}
      <div className="space-y-3.5 sm:space-y-4 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80778B] dark:text-[#9E94AB]" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search circles by name, lore, or keywords…"
              className="w-full pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm bg-white dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-[#523F71] dark:focus:border-[#FFDE88] transition-all shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#80778B] hover:text-[#2D253A] dark:hover:text-[#F1ECF7]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Visibility Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] rounded-2xl shrink-0">
            {(['PUBLIC', 'ALL'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setVisibility(v); setPage(1); }}
                className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  visibility === v
                    ? 'bg-[#523F71] text-white dark:bg-[#725499] shadow-sm'
                    : 'text-[#80778B] dark:text-[#9E94AB] hover:text-[#2D253A] dark:hover:text-[#F1ECF7]'
                }`}
              >
                {v === 'PUBLIC' ? '🌐 Public Circles' : '✨ All Sanctums'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Topic Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          {TOPIC_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all border ${
                selectedTag === tag
                  ? 'bg-[#523F71] text-white border-[#523F71] dark:bg-[#FFDE88] dark:text-[#2D223B] dark:border-[#FFDE88] shadow-xs'
                  : 'bg-white dark:bg-[#1A1423] border-[#ECE7DF] dark:border-[#312740] text-[#6D6282] dark:text-[#9E94AB] hover:border-purple-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Circles Grid */}
      {isLoading ? (
        <CirclesSkeleton />
      ) : isError ? (
        <div className="py-16 text-center rounded-3xl bg-rose-500/10 border border-rose-500/20 p-8 space-y-2">
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
            Unable to connect to the Circle Archives.
          </p>
          <p className="text-xs text-[#80778B] dark:text-[#9E94AB]">
            Please check your internet connection or try refreshing the page.
          </p>
        </div>
      ) : filteredCircles.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-white dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] p-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 text-[#523F71] dark:text-[#FFDE88] flex items-center justify-center mx-auto">
            <CircleDot className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#2D253A] dark:text-[#F1ECF7]">
            No circles found matching your criteria
          </h3>
          <p className="text-xs text-[#80778B] dark:text-[#9E94AB] max-w-sm mx-auto">
            Try adjusting your search terms or filter tags to discover other sanctums.
          </p>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 text-xs font-bold text-[#523F71] dark:text-[#FFDE88] hover:underline"
            >
              Establish the first circle for this topic →
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCircles.map(circle => (
              <CircleCard
                key={circle.id}
                circle={circle}
                onClick={() => navigate(`/circles/${circle.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {(data?.hasMore || page > 1) && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold border border-[#ECE7DF] dark:border-[#312740] text-[#6D6282] dark:text-[#9E94AB] hover:bg-white dark:hover:bg-[#1A1423] disabled:opacity-40 transition-all shadow-xs"
              >
                Previous Page
              </button>
              <span className="text-xs text-[#80778B] dark:text-[#9E94AB] font-mono px-2">
                Page {page}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!data?.hasMore}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold border border-[#ECE7DF] dark:border-[#312740] text-[#6D6282] dark:text-[#9E94AB] hover:bg-white dark:hover:bg-[#1A1423] disabled:opacity-40 transition-all shadow-xs"
              >
                Next Page
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateCircleModal
          onClose={() => { setShowCreate(false); setCreateError(null); }}
          onSubmit={handleCreate}
          isSubmitting={createCircle.isPending}
          error={createError}
        />
      )}
    </div>
  );
}
