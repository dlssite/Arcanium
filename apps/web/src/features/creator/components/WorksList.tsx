
/**
 * WorksList — grid of the creator's own works fetched from GET /api/v1/creator.
 * Each card shows cover, title, type, status, chapter count, and a
 * "Manage Chapters" CTA that navigates to /creator/works/:contentId/chapters.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Loader2, ChevronRight, RefreshCw, Pencil, ShieldCheck } from 'lucide-react';
import { useCreatorWorks } from '../hooks/useCreatorWorks';
import CreateWorkModal from './CreateWorkModal';
import type { CreatorWork } from '../hooks/useCreatorWorks';

const STATUS_BADGE: Record<string, string> = {
  ONGOING:    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
  COMPLETED:  'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60',
  HIATUS:     'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
  CANCELLED:  'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60',
};

function WorkCard({ work }: { work: CreatorWork }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-[#1D1726] rounded-2xl border border-[#EFEAE2] dark:border-[#352B44] shadow-xs hover:shadow-md hover:border-[#D4C8EA] dark:hover:border-[#4A3762] transition-all flex flex-col overflow-hidden group">
      {/* Cover */}
      <div className="aspect-[3/4] bg-stone-100 dark:bg-[#2A2136] relative overflow-hidden flex-shrink-0">
        {work.coverImageUrl ? (
          <img src={work.coverImageUrl} alt={work.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-stone-300 dark:text-stone-600" />
          </div>
        )}
        {/* Status badge overlay */}
        <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_BADGE[work.status] ?? STATUS_BADGE['ONGOING']}`}>
          {work.status}
        </span>
      </div>

      {/* Info */}
      <div className="p-3.5 flex flex-col flex-1 gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#2D223B] dark:text-[#F1ECF7] line-clamp-2 leading-snug">{work.title}</h3>
          <p className="text-[10px] text-[#80778B] dark:text-[#9F94AC] mt-0.5 truncate">
            {work.author ?? 'Unknown Author'}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#80778B] dark:text-[#9F94AC]">
              {work.type.replace('_', ' ')}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <ShieldCheck className="w-2.5 h-2.5" /> Verified Author
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-auto">
          <span className="text-[10px] font-semibold text-[#80778B] dark:text-[#9F94AC] bg-[#F2EDFA] dark:bg-[#2C213B] rounded-full px-2 py-0.5 border border-[#E3D9F2] dark:border-[#43345A]">
            {work.chapterCount} ch
          </span>
        </div>

        <button
          onClick={() => navigate(`/creator/works/${work.id}/chapters`)}
          className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-[#43335A] dark:text-[#C5BACF] bg-[#F2EDFA] dark:bg-[#2C213B] hover:bg-[#E8DFF5] dark:hover:bg-[#352844] active:scale-95 transition-all"
        >
          <Pencil className="w-3 h-3" />
          Manage Chapters
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function WorksList() {
  const { works, isLoading, isError, refetch } = useCreatorWorks();
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-5 sm:px-6 lg:px-0 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#2D223B] dark:text-[#F1ECF7]">My Works</h1>
          <p className="text-xs text-[#80778B] dark:text-[#9F94AC] mt-0.5">
            {isLoading ? 'Loading…' : `${works.length} work${works.length !== 1 ? 's' : ''} in your archive`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#43335A] dark:bg-[#684C8B] hover:bg-[#342647] dark:hover:bg-[#563D75] active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Work
        </button>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white dark:bg-[#1D1726] border border-[#EFEAE2] dark:border-[#352B44] animate-pulse">
              <div className="aspect-[3/4] bg-stone-200 dark:bg-[#2A2136] rounded-t-2xl" />
              <div className="p-3.5 space-y-2">
                <div className="h-3 bg-stone-200 dark:bg-[#2A2136] rounded w-3/4" />
                <div className="h-2.5 bg-stone-100 dark:bg-[#241D30] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-[#80778B] dark:text-[#9F94AC]">Could not load your works.</p>
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs font-semibold text-[#43335A] dark:text-[#C5BACF] hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && works.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F2EDFA] dark:bg-[#2C213B] border border-[#E3D9F2] dark:border-[#43345A] flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-[#9B7BBF] dark:text-[#7A5CA0]" />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#2D223B] dark:text-[#F1ECF7]">No works yet</h3>
            <p className="text-sm text-[#80778B] dark:text-[#9F94AC] mt-1">Start serialising your first story.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#43335A] dark:bg-[#684C8B] hover:bg-[#342647] active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> Create your first work
          </button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && works.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {works.map((w) => <WorkCard key={w.id} work={w} />)}
          {/* Add new card */}
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-2xl border-2 border-dashed border-[#EFEAE2] dark:border-[#352B44] hover:border-[#C5BACF] dark:hover:border-[#4A3762] flex flex-col items-center justify-center gap-2 min-h-[220px] transition-all group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F2EDFA] dark:bg-[#2C213B] border border-[#E3D9F2] dark:border-[#43345A] flex items-center justify-center group-hover:bg-[#E8DFF5] transition-colors">
              <Plus className="w-5 h-5 text-[#43335A] dark:text-[#C5BACF]" />
            </div>
            <span className="text-xs font-semibold text-[#80778B] dark:text-[#9F94AC]">New Work</span>
          </button>
        </div>
      )}

      <CreateWorkModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => navigate(`/creator/works/${id}/chapters`)}
      />
    </div>
  );
}
