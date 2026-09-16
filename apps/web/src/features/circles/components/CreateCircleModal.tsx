import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { CreateCircleInput } from '@arcanium/types';

const COVER_COLORS = [
  'bg-purple-500', 'bg-violet-500', 'bg-indigo-500', 'bg-blue-500',
  'bg-cyan-500',   'bg-teal-500',   'bg-emerald-500','bg-amber-500',
  'bg-orange-500', 'bg-rose-500',   'bg-pink-500',   'bg-fuchsia-500',
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({ name: name.trim(), tag: tag.trim(), description: description.trim() || undefined, visibility, coverColor });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-[#1D1726] rounded-3xl shadow-2xl border border-[#ECE7DF] dark:border-[#352B44] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#ECE7DF] dark:border-[#352B44]">
          <div>
            <h2 className="font-serif font-bold text-xl text-[#2D223B] dark:text-[#F1ECF7]">
              Create a Circle
            </h2>
            <p className="text-xs text-[#80778B] dark:text-[#9F94AC] mt-0.5">
              Start your own reading community
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-[#2C213B] transition-colors">
            <X className="w-4 h-4 text-[#9A8FA7]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1.5">
              Circle Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Shadow Readers Guild"
              maxLength={80}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#FAF8F5] dark:bg-[#120E18] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none focus:border-purple-400 dark:focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Tag */}
          <div>
            <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1.5">
              Tag <span className="text-rose-500">*</span>
              <span className="text-[10px] font-normal ml-1 text-[#9A8FA7]">Short label shown on the card</span>
            </label>
            <input
              type="text"
              value={tag}
              onChange={e => setTag(e.target.value)}
              placeholder="e.g. #DarkFantasy"
              maxLength={30}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#FAF8F5] dark:bg-[#120E18] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none focus:border-purple-400 dark:focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this circle about?"
              maxLength={500}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#FAF8F5] dark:bg-[#120E18] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none focus:border-purple-400 dark:focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1.5">
              Visibility
            </label>
            <div className="flex gap-2">
              {(['PUBLIC', 'PRIVATE'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    visibility === v
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-[#FAF8F5] dark:bg-[#120E18] text-[#6D6282] dark:text-[#9E94B3] border-[#ECE7DF] dark:border-[#352B44] hover:border-purple-400'
                  }`}
                >
                  {v === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#9A8FA7] mt-1.5">
              {visibility === 'PUBLIC'
                ? 'Anyone can join instantly.'
                : 'Members must request to join and be approved by you.'}
            </p>
          </div>

          {/* Cover color */}
          <div>
            <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-2">
              Cover Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COVER_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoverColor(c)}
                  className={`w-7 h-7 rounded-full ${c} transition-transform ${
                    coverColor === c ? 'ring-2 ring-offset-2 ring-purple-500 scale-110' : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-500/20">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#ECE7DF] dark:border-[#352B44] text-[#6D6282] dark:text-[#9E94B3] hover:bg-stone-50 dark:hover:bg-[#2C213B] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !tag.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#43335A] hover:bg-[#342647] dark:bg-[#725499] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Circle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
