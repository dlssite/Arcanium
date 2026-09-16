import React, { useState } from 'react';
import { Send, Loader2, Trash2 } from 'lucide-react';
import type { CirclePostReply } from '@arcanium/types';
import { useCircleReplies, useCreateReply, useDeleteReply } from '../useCirclesQuery';
import { useUserStore } from '../../../stores/useUserStore.js';

interface CircleReplyListProps {
  circleId:   string;
  postId:     string;
  /** Preview replies passed from the post list response (avoids extra fetch on first render) */
  preview?:   CirclePostReply[];
  isMember:   boolean;
  canModerate: boolean;
}

export default function CircleReplyList({
  circleId,
  postId,
  preview = [],
  isMember,
  canModerate,
}: CircleReplyListProps) {
  const { user }     = useUserStore();
  const userId       = (user as any)?.id as string | undefined;
  const createReply  = useCreateReply(circleId, postId);
  const deleteReply  = useDeleteReply(circleId, postId);

  const { data, isLoading } = useCircleReplies(circleId, postId);

  const [body, setBody] = useState('');

  const replies: CirclePostReply[] = data?.replies ?? preview;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    await createReply.mutateAsync({ body: body.trim() });
    setBody('');
  }

  return (
    <div className="mt-3 pt-3 border-t border-stone-100 dark:border-[#2F243E] space-y-3">
      {isLoading && preview.length === 0 && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#9A8FA7]" />
        </div>
      )}

      {replies.map((r) => (
        <div key={r.id} className={`flex gap-2.5 group ${r.isRemoved ? 'opacity-40' : ''}`}>
          {/* Avatar */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-800 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">
            {r.author.slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-[#2D223B] dark:text-[#F1ECF7]">{r.author}</span>
              <span className="text-[10px] text-[#9A8FA7]">{r.time}</span>
            </div>
            <p className="text-xs text-[#564B63] dark:text-[#CBC0D8] leading-relaxed mt-0.5">
              {r.isRemoved ? 'This reply was removed.' : r.body}
            </p>
          </div>

          {/* Delete */}
          {!r.isRemoved && (r.authorId === userId || canModerate) && (
            <button
              onClick={() => deleteReply.mutate(r.id)}
              disabled={deleteReply.isPending}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 transition-all shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {/* Reply composer */}
      {isMember && (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write a reply…"
            maxLength={1000}
            className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-[#FAF8F5] dark:bg-[#120E18] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none focus:border-purple-400 transition-colors"
          />
          <button
            type="submit"
            disabled={createReply.isPending || !body.trim()}
            className="p-1.5 rounded-xl bg-[#43335A] hover:bg-[#342647] text-white transition-all disabled:opacity-50 shrink-0"
          >
            {createReply.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </form>
      )}
    </div>
  );
}
