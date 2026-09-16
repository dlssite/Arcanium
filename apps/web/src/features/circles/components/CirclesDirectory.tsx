import React, { useState } from 'react';
import { Search, Plus, Loader2, CircleDot } from 'lucide-react';
import { useCirclesDirectory, useCreateCircle } from '../useCirclesQuery';
import CircleCard from './CircleCard';
import CreateCircleModal from './CreateCircleModal';
import { useUserStore } from '../../../stores/useUserStore.js';
import { useNavigate } from 'react-router-dom';
import type { CircleListParams, CreateCircleInput } from '@arcanium/types';

// Loading skeleton
function CirclesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-40 bg-stone-200 dark:bg-stone-700/40 rounded-2xl" />
      ))}
    </div>
  );
}

export default function CirclesDirectory() {
  const navigate     = useNavigate();
  const { user }     = useUserStore();
  const createCircle = useCreateCircle();

  const [search,     setSearch]     = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'ALL'>('PUBLIC');
  const [page,       setPage]       = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const params: CircleListParams = {
    page,
    limit: 18,
    ...(search     ? { search }     : {}),
    ...(visibility ? { visibility } : {}),
  };

  const { data, isLoading, isError } = useCirclesDirectory(params);

  // Determine if user can create a circle (role or rank check — mirrored client-side for UI only;
  // server enforces the real gate).
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
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-4 sm:px-6 lg:px-0 w-full transition-colors duration-200">

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#342646] dark:text-[#F1ECF7] flex items-center gap-3">
            <CircleDot className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            Reading Circles
          </h1>
          <p className="text-xs sm:text-sm text-[#80778B] dark:text-[#9F94AC] mt-1">
            {data?.total ? `${data.total.toLocaleString()} circles` : 'Discover focused reading communities'}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="self-start sm:self-auto bg-[#43335A] hover:bg-[#342647] dark:bg-[#725499] text-white px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Circle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A8FA7]" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search circles…"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-[#1D1726] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none focus:border-purple-400 transition-colors"
          />
        </div>

        {/* Visibility chips */}
        <div className="flex gap-2">
          {(['PUBLIC', 'ALL'] as const).map(v => (
            <button
              key={v}
              onClick={() => { setVisibility(v); setPage(1); }}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                visibility === v
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-[#1D1726] border border-[#ECE7DF] dark:border-[#352B44] text-[#6D6282] dark:text-[#9E94B3] hover:border-purple-400'
              }`}
            >
              {v === 'PUBLIC' ? 'Public' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <CirclesSkeleton />
      ) : isError ? (
        <div className="py-16 text-center text-rose-500 text-sm">
          Failed to load circles. Check the connection and refresh.
        </div>
      ) : !data?.circles.length ? (
        <div className="py-16 text-center space-y-2">
          <CircleDot className="w-12 h-12 text-[#C5BACF] mx-auto" />
          <p className="text-sm text-[#9A8FA7]">No circles found.</p>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline mt-2"
            >
              Create the first one →
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.circles.map(circle => (
              <CircleCard
                key={circle.id}
                circle={circle}
                onClick={() => navigate(`/circles/${circle.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {(data.hasMore || page > 1) && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[#ECE7DF] dark:border-[#352B44] text-[#6D6282] dark:text-[#9E94B3] hover:bg-white dark:hover:bg-[#1D1726] disabled:opacity-40 transition-all"
              >
                Previous
              </button>
              <span className="text-xs text-[#9A8FA7] font-mono">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!data.hasMore}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[#ECE7DF] dark:border-[#352B44] text-[#6D6282] dark:text-[#9E94B3] hover:bg-white dark:hover:bg-[#1D1726] disabled:opacity-40 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

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
