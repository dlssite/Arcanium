import React, { useState } from 'react';
import { X, Loader2, Sparkles, Lock, Globe, Check, Eye } from 'lucide-react';
import type { CreateCircleInput, CircleSummary } from '@arcanium/types';
import CircleCard from './CircleCard';

const COVER_COLORS = [
  { name: 'Amethyst',   bg: 'bg-purple-500' },
  { name: 'Violet',     bg: 'bg-violet-500' },
  { name: 'Indigo',     bg: 'bg-indigo-500' },
  { name: 'Sapphire',   bg: 'bg-blue-500' },
  { name: 'Cyan',       bg: 'bg-cyan-500' },
  { name: 'Emerald',    bg: 'bg-emerald-500' },
  { name: 'Teal',       bg: 'bg-teal-500' },
  { name: 'Amber',      bg: 'bg-amber-500' },
  { name: 'Solar',      bg: 'bg-orange-500' },
  { name: 'Ruby',       bg: 'bg-rose-500' },
  { name: 'Rose',       bg: 'bg-pink-500' },
  { name: 'Fuchsia',    bg: 'bg-fuchsia-500' },
];

interface CreateCircleModalProps {
  onClose: () => void;
  onSubmit: (data: CreateCircleInput) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
}

export default function CreateCircleModal({
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: CreateCircleModalProps) {
  const [name,        setName]        = useState('');
  const [tag,         setTag]         = useState('');
  const [description, setDescription] = useState('');
  const [visibility,  setVisibility]  = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [coverColor,  setCoverColor]  = useState('bg-purple-500');

  // Format tag for preview and submission
  const formattedTag = tag.trim() ? (tag.startsWith('#') ? tag.trim() : `#${tag.trim()}`) : '#Arcane';

  // Preview circle object
  const previewCircle: CircleSummary = {
    id: 'preview-id',
    name: name.trim() || 'Guild of the Arcane Codex',
    tag: formattedTag,
    description: description.trim() || 'A sanctum for deep reading, scholarly marginalia, and archival reflections.',
    coverColor,
    visibility,
    memberCount: 1,
    activeNow: 1,
    isFeatured: false,
    featuredOrder: 0,
    isArchived: false,
    ownerId: 'preview-owner',
    ownerName: 'You',
    activeSession: null,
    membership: {
      role: 'OWNER',
      status: 'ACTIVE',
    },
    pendingRequestCount: 0,
    createdAt: new Date().toISOString(),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tag.trim()) return;

    await onSubmit({
      name: name.trim(),
      tag: formattedTag,
      description: description.trim() || undefined,
      visibility,
      coverColor,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-[#FAF8F5] dark:bg-[#16101F] rounded-3xl shadow-2xl border border-[#ECE7DF] dark:border-[#352B44] overflow-hidden my-auto animate-scale-dialog z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECE7DF] dark:border-[#312740] bg-white/60 dark:bg-[#1D1726]/60 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-[#523F71] dark:text-[#FFDE88] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-[#2D253A] dark:text-[#F1ECF7]">
                Establish a Reading Circle
              </h2>
              <p className="text-[11px] text-[#80778B] dark:text-[#9E94AB]">
                Create a dedicated archival sanctum for your reading guild
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#80778B] hover:text-[#2D253A] dark:hover:text-[#F1ECF7] hover:bg-stone-100 dark:hover:bg-[#2C213B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[80vh] overflow-y-auto">
          {/* Form Side */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 p-6 space-y-4">
            {/* Circle Name */}
            <div>
              <label className="block text-xs font-bold text-[#523F71] dark:text-[#D1BEE6] mb-1.5 uppercase tracking-wider">
                Circle Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Shadow Readers Guild"
                maxLength={80}
                required
                className="w-full px-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-[#1F172C] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-[#523F71] dark:focus:border-[#FFDE88] transition-all shadow-xs"
              />
            </div>

            {/* Tag */}
            <div>
              <label className="block text-xs font-bold text-[#523F71] dark:text-[#D1BEE6] mb-1.5 uppercase tracking-wider">
                Topic Tag <span className="text-rose-500">*</span>
                <span className="normal-case font-normal text-[11px] text-[#80778B] dark:text-[#9E94AB] ml-1">
                  (e.g. #Grimoires, #DarkFantasy)
                </span>
              </label>
              <input
                type="text"
                value={tag}
                onChange={e => setTag(e.target.value)}
                placeholder="#DarkFantasy"
                maxLength={30}
                required
                className="w-full px-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-[#1F172C] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-[#523F71] dark:focus:border-[#FFDE88] transition-all shadow-xs"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#523F71] dark:text-[#D1BEE6] uppercase tracking-wider">
                  Sanctum Description
                </label>
                <span className="text-[10px] text-[#80778B] dark:text-[#9E94AB] font-mono">
                  {description.length} / 500
                </span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What books and themes will your circle explore?"
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-[#1F172C] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-[#523F71] dark:focus:border-[#FFDE88] transition-all shadow-xs resize-none"
              />
            </div>

            {/* Visibility Mode */}
            <div>
              <label className="block text-xs font-bold text-[#523F71] dark:text-[#D1BEE6] mb-1.5 uppercase tracking-wider">
                Sanctum Privacy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('PUBLIC')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border ${
                    visibility === 'PUBLIC'
                      ? 'bg-[#523F71] text-white border-[#523F71] dark:bg-[#725499] dark:border-[#725499] shadow-sm'
                      : 'bg-white dark:bg-[#1F172C] text-[#6D6282] dark:text-[#9E94AB] border-[#ECE7DF] dark:border-[#352B44] hover:border-purple-300'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Public Circle
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('PRIVATE')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border ${
                    visibility === 'PRIVATE'
                      ? 'bg-[#523F71] text-white border-[#523F71] dark:bg-[#725499] dark:border-[#725499] shadow-sm'
                      : 'bg-white dark:bg-[#1F172C] text-[#6D6282] dark:text-[#9E94AB] border-[#ECE7DF] dark:border-[#352B44] hover:border-purple-300'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Private Circle
                </button>
              </div>
              <p className="text-[11px] text-[#80778B] dark:text-[#9E94AB] mt-1.5">
                {visibility === 'PUBLIC'
                  ? '🌐 Anyone can join instantly and engage in reading sessions.'
                  : '🔒 Scholars must request admission and be approved by circle moderators.'}
              </p>
            </div>

            {/* Cover Color Palette */}
            <div>
              <label className="block text-xs font-bold text-[#523F71] dark:text-[#D1BEE6] mb-2 uppercase tracking-wider">
                Aura Palette
              </label>
              <div className="grid grid-cols-6 gap-2">
                {COVER_COLORS.map(c => (
                  <button
                    key={c.bg}
                    type="button"
                    title={c.name}
                    onClick={() => setCoverColor(c.bg)}
                    className={`h-8 rounded-xl ${c.bg} flex items-center justify-center transition-all ${
                      coverColor === c.bg
                        ? 'ring-2 ring-offset-2 ring-[#523F71] dark:ring-[#FFDE88] dark:ring-offset-[#16101F] scale-105 shadow-md'
                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {coverColor === c.bg && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold border border-[#ECE7DF] dark:border-[#352B44] text-[#80778B] dark:text-[#9E94AB] hover:bg-stone-100 dark:hover:bg-[#251D30] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !tag.trim()}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-[#523F71] hover:bg-[#433258] dark:bg-[#725499] dark:hover:bg-[#8665b3] text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Consecrating…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#FFDE88]" />
                    <span>Create Circle</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Live Preview Side (Desktop & Large screens) */}
          <div className="hidden lg:flex lg:col-span-5 p-6 bg-stone-100/50 dark:bg-[#120D1A] border-l border-[#ECE7DF] dark:border-[#312740] flex-col justify-center items-center">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#523F71] dark:text-[#FFDE88] uppercase tracking-wider">
                <Eye className="w-3.5 h-3.5" />
                Live Card Preview
              </div>
              <CircleCard circle={previewCircle} />
              <p className="text-[11px] text-center text-[#80778B] dark:text-[#9E94AB]">
                This is how fellow scholars will see your circle in the directory.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
