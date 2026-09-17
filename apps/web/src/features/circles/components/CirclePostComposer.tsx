import React, { useState } from 'react';
import { MessageSquare, Quote, Send, Loader2, Sparkles, X, BookOpen } from 'lucide-react';
import type { CreateCirclePostInput } from '@arcanium/types';
import { useCreatePost } from '../useCirclesQuery';

interface CirclePostComposerProps {
  circleId: string;
}

export default function CirclePostComposer({ circleId }: CirclePostComposerProps) {
  const createPost = useCreatePost(circleId);

  const [type,       setType]       = useState<'DISCUSSION' | 'MARGINALIA'>('DISCUSSION');
  const [title,      setTitle]      = useState('');
  const [body,       setBody]       = useState('');
  const [quote,      setQuote]      = useState('');
  const [reflection, setReflection] = useState('');
  const [chapter,    setChapter]    = useState('');
  const [error,      setError]      = useState<string | null>(null);
  const [open,       setOpen]       = useState(false);

  function reset() {
    setTitle(''); setBody(''); setQuote(''); setReflection(''); setChapter('');
    setError(null); setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let input: CreateCirclePostInput;
    if (type === 'DISCUSSION') {
      if (!title.trim() || !body.trim()) {
        setError('Both title and body are required for discussion topics.');
        return;
      }
      input = { type: 'DISCUSSION', title: title.trim(), body: body.trim() };
    } else {
      if (!quote.trim() || !reflection.trim()) {
        setError('Both the passage quote and your reflection are required.');
        return;
      }
      input = {
        type: 'MARGINALIA',
        quote: quote.trim(),
        reflection: reflection.trim(),
        chapter: chapter.trim() || undefined,
      };
    }

    try {
      await createPost.mutateAsync(input);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish post. Please try again.');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#1A1423] rounded-3xl border border-[#ECE7DF] dark:border-[#312740] shadow-soft-card dark:shadow-dark-card hover:border-purple-400/40 dark:hover:border-purple-500/40 hover:shadow-md transition-all group text-left"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#523F71] to-[#725499] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-[#FFDE88]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#2D253A] dark:text-[#F1ECF7] group-hover:text-[#523F71] dark:group-hover:text-[#FFDE88] transition-colors">
              Share Marginalia or Start a Discussion
            </p>
            <p className="text-[11px] text-[#80778B] dark:text-[#9E94AB] truncate">
              Engage fellow scholars with book quotes, deep lore, or questions…
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#523F71]/10 dark:bg-[#725499]/20 text-[#523F71] dark:text-[#FFDE88] shrink-0">
          <span>Inscribe</span>
          <Send className="w-3.5 h-3.5" />
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1A1423] rounded-3xl border border-[#ECE7DF] dark:border-[#312740] shadow-soft-card dark:shadow-dark-card overflow-hidden animate-fadeIn">
      {/* Type Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-[#ECE7DF] dark:border-[#312740] bg-stone-50/50 dark:bg-[#150F1E] px-4 pt-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('DISCUSSION')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              type === 'DISCUSSION'
                ? 'border-[#523F71] dark:border-[#FFDE88] text-[#523F71] dark:text-[#FFDE88]'
                : 'border-transparent text-[#80778B] dark:text-[#9E94AB] hover:text-[#2D253A] dark:hover:text-[#F1ECF7]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Discussion Topic</span>
          </button>
          <button
            type="button"
            onClick={() => setType('MARGINALIA')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              type === 'MARGINALIA'
                ? 'border-amber-500 text-amber-700 dark:text-amber-300'
                : 'border-transparent text-[#80778B] dark:text-[#9E94AB] hover:text-[#2D253A] dark:hover:text-[#F1ECF7]'
            }`}
          >
            <Quote className="w-4 h-4 text-amber-500" />
            <span>Living Marginalia</span>
          </button>
        </div>

        <button
          onClick={reset}
          className="p-1.5 rounded-xl text-[#80778B] hover:text-[#2D253A] dark:hover:text-[#F1ECF7] hover:bg-stone-100 dark:hover:bg-[#251D30] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {type === 'DISCUSSION' ? (
          <>
            <div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Topic Title (e.g. Philosophical Symbolism in Act II)"
                maxLength={200}
                required
                className="w-full px-4 py-2.5 rounded-2xl text-sm font-semibold bg-[#FAF8F5] dark:bg-[#150F1E] border border-[#ECE7DF] dark:border-[#312740] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-[#523F71] dark:focus:border-[#FFDE88] transition-all"
              />
            </div>
            <div>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="What insights, questions, or perspectives would you like to share?"
                maxLength={5000}
                rows={4}
                required
                className="w-full px-4 py-3 rounded-2xl text-sm bg-[#FAF8F5] dark:bg-[#150F1E] border border-[#ECE7DF] dark:border-[#312740] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-[#523F71] dark:focus:border-[#FFDE88] transition-all resize-none leading-relaxed"
              />
            </div>
          </>
        ) : (
          <>
            {/* Quote highlight box */}
            <div className="rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border-l-4 border-amber-500 p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-1.5">
                <Quote className="w-3 h-3 text-amber-500" />
                Book Passage / Excerpt
              </div>
              <textarea
                value={quote}
                onChange={e => setQuote(e.target.value)}
                placeholder="Paste the book excerpt or sacred passage here…"
                maxLength={1000}
                rows={3}
                required
                className="w-full font-serif italic text-sm text-amber-950 dark:text-amber-100 bg-transparent placeholder-amber-700/60 dark:placeholder-amber-300/50 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Chapter reference */}
            <div>
              <input
                type="text"
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                placeholder="Chapter reference (optional, e.g. Chapter VII: The Veil of Mist)"
                maxLength={100}
                className="w-full px-4 py-2 rounded-2xl text-xs bg-[#FAF8F5] dark:bg-[#150F1E] border border-[#ECE7DF] dark:border-[#312740] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-[#523F71] dark:focus:border-[#FFDE88] transition-all"
              />
            </div>

            {/* Reflection */}
            <div>
              <textarea
                value={reflection}
                onChange={e => setReflection(e.target.value)}
                placeholder="Your scholarly reflection, marginalia commentary, or interpretation…"
                maxLength={2000}
                rows={3}
                required
                className="w-full px-4 py-3 rounded-2xl text-sm bg-[#FAF8F5] dark:bg-[#150F1E] border border-[#ECE7DF] dark:border-[#312740] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-[#523F71] dark:focus:border-[#FFDE88] transition-all resize-none leading-relaxed"
              />
            </div>
          </>
        )}

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[#80778B] dark:text-[#9E94AB]">
            Shared with all circle scholars
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-2xl text-xs font-bold text-[#80778B] hover:text-[#2D253A] dark:hover:text-[#F1ECF7] hover:bg-stone-100 dark:hover:bg-[#251D30] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPost.isPending}
              className="px-5 py-2 rounded-2xl text-xs font-bold bg-[#523F71] hover:bg-[#433258] dark:bg-[#725499] text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
            >
              {createPost.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing…</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Inscribe Post</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
