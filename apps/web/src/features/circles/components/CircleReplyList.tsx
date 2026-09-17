import React, { useState } from 'react';
import { Send, Loader2, Trash2, CornerDownRight } from 'lucide-react';
import type { CirclePostReply } from '@arcanium/types';
import { useCircleReplies, useCreateReply, useDeleteReply } from '../useCirclesQuery';
import { useUserStore } from '../../../stores/useUserStore.js';

interface CircleReplyListProps {
  circleId:   string;
  postId:     string;
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
    <div className="mt-4 pt-4 border-t border-[#ECE7DF] dark:border-[#312740] space-y-3.5 animate-fadeIn">
      {isLoading && preview.length === 0 && (
        <div className="flex items-center justify-center py-4 gap-2 text-xs text-[#80778B] dark:text-[#9E94AB]">
          <Loader2 className="w-4 h-4 animate-spin text-[#523F71] dark:text-[#FFDE88]" />
          <span>Retrieving replies…</span>
        </div>
      )}

      {/* Reply items */}
      <div className="space-y-2.5">
        {replies.map((r) => (
          <div
            key={r.id}
            className={`flex items-start gap-3 p-3 rounded-2xl bg-stone-50/70 dark:bg-[#150F1E] border border-stone-200/50 dark:border-[#2C213B] transition-all group ${
              r.isRemoved ? 'opacity-40 italic' : ''
            }`}
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-700 via-[#523F71] to-indigo-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs">
              {r.author.slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2D253A] dark:text-[#F1ECF7]">
                    {r.author}
                  </span>
                  <span className="text-[10px] text-[#80778B] dark:text-[#9E94AB]">
                    {r.time}
                  </span>
                </div>

                {/* Delete Reply Button */}
                {!r.isRemoved && (r.authorId === userId || canModerate) && (
                  <button
                    onClick={() => deleteReply.mutate(r.id)}
                    disabled={deleteReply.isPending}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/10 text-[#80778B] hover:text-rose-600 transition-all shrink-0"
                    title="Delete reply"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <p className="text-xs sm:text-[13px] text-[#523F71] dark:text-[#CBC0D8] leading-relaxed mt-1">
                {r.isRemoved ? 'This reflection was removed.' : r.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply composer */}
      {isMember ? (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Add your marginalia or reflection…"
              maxLength={1000}
              className="w-full pl-3.5 pr-4 py-2 rounded-2xl text-xs bg-white dark:bg-[#1F172C] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-[#523F71] dark:focus:border-[#FFDE88] transition-colors shadow-xs"
            />
          </div>
          <button
            type="submit"
            disabled={createReply.isPending || !body.trim()}
            className="p-2.5 rounded-2xl bg-[#523F71] hover:bg-[#433258] dark:bg-[#725499] text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
            title="Send reply"
          >
            {createReply.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-center text-[#80778B] dark:text-[#9E94AB] italic py-1">
          Join this circle to participate in discussions.
        </p>
      )}
    </div>
  );
}
