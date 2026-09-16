import React, { useState } from 'react';
import { MessageSquare, Quote, Send, Loader2 } from 'lucide-react';
import type { CreateCirclePostInput } from '@arcanium/types';
import { useCreatePost } from '../useCirclesQuery';

interface CirclePostComposerProps {
  circleId: string;
}

export default function CirclePostComposer({ circleId }: CirclePostComposerProps) {
  const createPost = useCreatePost(circleId);

  const [type,       setType]       = useState<'MARGINALIA' | 'DISCUSSION'>('DISCUSSION');
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
      if (!title.trim() || !body.trim()) { setError('Title and body are required.'); return; }
      input = { type: 'DISCUSSION', title: title.trim(), body: body.trim() };
    } else {
      if (!quote.trim() || !reflection.trim()) { setError('Quote and reflection are required.'); return; }
      input = { type: 'MARGINALIA', quote: quote.trim(), reflection: reflection.trim(), chapter: chapter.trim() || undefined };
    }

    try {
      await createPost.mutateAsync(input);
      reset();
    } catch {
      setError('Failed to post. Please try again.');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1D1726] rounded-2xl border border-[#ECE7DF] dark:border-[#352B44] text-[#9A8FA7] text-sm hover:border-purple-300 dark:hover:border-purple-500/40 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-800 flex items-center justify-center shrink-0">
          <Send className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm text-[#9A8FA7] group-hover:text-[#6D6282] dark:group-hover:text-[#C5B3DC] transition-colors">
          Share a reflection or start a discussion…
        </span>
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1D1726] rounded-2xl border border-[#ECE7DF] dark:border-[#352B44] overflow-hidden">
      {/* Type tabs */}
      <div className="flex border-b border-[#ECE7DF] dark:border-[#352B44]">
        {([
          { id: 'DISCUSSION', label: 'Discussion', icon: MessageSquare },
          { id: 'MARGINALIA', label: 'Marginalia', icon: Quote },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setType(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
              type === id
                ? 'text-purple-700 dark:text-purple-300 border-b-2 border-purple-600'
                : 'text-[#9A8FA7] hover:text-[#6D6282] dark:hover:text-[#C5B3DC]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {type === 'DISCUSSION' ? (
          <>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Discussion title…"
              maxLength={200}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#FAF8F5] dark:bg-[#120E18] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none focus:border-purple-400 transition-colors"
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={5000}
              rows={4}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#FAF8F5] dark:bg-[#120E18] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none focus:border-purple-400 transition-colors resize-none"
            />
          </>
        ) : (
          <>
            <div className="bg-[#FAF8F5] dark:bg-[#120E18] border-l-[3px] border-[#DE9B35] rounded-r-xl p-3">
              <textarea
                value={quote}
                onChange={e => setQuote(e.target.value)}
                placeholder="Paste a quote from the book…"
                maxLength={1000}
                rows={3}
                required
                className="w-full text-sm font-serif italic bg-transparent text-[#43335A] dark:text-[#E2D4F3] placeholder-[#9A8FA7] focus:outline-none resize-none"
              />
            </div>
            <input
              type="text"
              value={chapter}
              onChange={e => setChapter(e.target.value)}
              placeholder="Chapter reference (optional)"
              maxLength={100}
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-[#FAF8F5] dark:bg-[#120E18] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none focus:border-purple-400 transition-colors"
            />
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="Your reflection on this passage…"
              maxLength={2000}
              rows={3}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#FAF8F5] dark:bg-[#120E18] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none focus:border-purple-400 transition-colors resize-none"
            />
          </>
        )}

        {error && (
          <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-500/20">
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#9A8FA7] hover:text-[#6D6282] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPost.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#43335A] hover:bg-[#342647] dark:bg-[#725499] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPost.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Post
          </button>
        </div>
      </form>
    </div>
  );
}
