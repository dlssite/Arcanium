import React, { useState } from 'react';
import { Heart, MessageSquare, Pin, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { CirclePost } from '@arcanium/types';
import { useToggleEchoPost, useDeletePost, usePinPost } from '../useCirclesQuery';
import { useUserStore } from '../../../stores/useUserStore.js';
import CircleReplyList from './CircleReplyList';

interface CirclePostCardProps {
  post:        CirclePost;
  circleId:    string;
  isMember:    boolean;
  canModerate: boolean; // OWNER or MODERATOR
}

export default function CirclePostCard({
  post,
  circleId,
  isMember,
  canModerate,
}: CirclePostCardProps) {
  const { user }    = useUserStore();
  const userId      = (user as any)?.id as string | undefined;
  const echoPost    = useToggleEchoPost(circleId);
  const deletePost  = useDeletePost();
  const pinPost     = usePinPost();

  const [showReplies, setShowReplies] = useState(false);

  const isAuthor = post.authorId === userId;
  const canDelete = isAuthor || canModerate;

  if (post.isRemoved) return null;

  return (
    <div className={`bg-white dark:bg-[#1D1726] rounded-3xl border transition-all ${
      post.isPinned
        ? 'border-amber-300/60 dark:border-amber-500/30 shadow-[0_0_0_2px_rgba(245,158,11,0.12)]'
        : 'border-[#ECE7DF] dark:border-[#352B44] shadow-xs hover:shadow-md'
    }`}>
      <div className="p-5">
        {/* Pinned badge */}
        {post.isPinned && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-2.5">
            <Pin className="w-3 h-3 fill-current" />
            PINNED
          </div>
        )}

        {/* Author row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-800 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {post.author.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-[#2D223B] dark:text-[#F1ECF7] leading-none">{post.author}</p>
              <p className="text-[10px] text-[#80778B] dark:text-[#9F94AC] mt-0.5">{post.role} · {post.time}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {canModerate && (
              <button
                onClick={() => pinPost.mutate({ circleId, postId: post.id })}
                className={`p-1.5 rounded-xl transition-colors ${
                  post.isPinned
                    ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                    : 'text-[#9A8FA7] hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                }`}
                title={post.isPinned ? 'Unpin' : 'Pin post'}
              >
                <Pin className={`w-3.5 h-3.5 ${post.isPinned ? 'fill-current' : ''}`} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => deletePost.mutate({ circleId, postId: post.id })}
                disabled={deletePost.isPending}
                className="p-1.5 rounded-xl text-[#9A8FA7] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                title="Delete post"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Post content */}
        {post.type === 'MARGINALIA' ? (
          <>
            <div className="bg-[#FAF8F5] dark:bg-[#251D30] border-l-[3px] border-[#DE9B35] rounded-r-2xl p-3.5 my-2">
              <p className="font-serif italic text-xs sm:text-[13.5px] leading-relaxed text-[#43335A] dark:text-[#E2D4F3]">
                {post.quote}
              </p>
              {post.chapter && (
                <span className="text-[10px] text-[#9A8EA6] mt-1.5 block text-right font-mono">
                  {post.chapter}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-[13px] leading-relaxed text-[#564B63] dark:text-[#CBC0D8] mt-2">
              {post.reflection}
            </p>
          </>
        ) : (
          <>
            <h3 className="font-serif font-bold text-sm sm:text-base text-[#2D223B] dark:text-[#F1ECF7] mb-2">
              {post.title}
            </h3>
            <p className="text-xs sm:text-[13px] leading-relaxed text-[#564B63] dark:text-[#CBC0D8]">
              {post.body}
            </p>
          </>
        )}

        {/* Actions bar */}
        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-[#2F243E] flex items-center gap-4 text-xs text-[#80778B] dark:text-[#9F94AC]">
          {/* Echo */}
          <button
            onClick={() => echoPost.mutate(post.id)}
            disabled={echoPost.isPending}
            className={`flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-60 ${
              post.echoed
                ? 'text-[#DE9B35]'
                : 'hover:text-[#DE9B35]'
            }`}
          >
            <Heart className={`w-4 h-4 ${post.echoed ? 'fill-current' : ''}`} />
            <span>Echo ({post.echoCount})</span>
          </button>

          {/* Replies toggle */}
          <button
            onClick={() => setShowReplies(v => !v)}
            className="flex items-center gap-1.5 hover:text-[#43335A] dark:hover:text-white transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.replyCount} {post.replyCount === 1 ? 'Reply' : 'Replies'}</span>
            {showReplies
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />
            }
          </button>
        </div>

        {/* Replies */}
        {showReplies && (
          <CircleReplyList
            circleId={circleId}
            postId={post.id}
            preview={post.replyPreview ?? []}
            isMember={isMember}
            canModerate={canModerate}
          />
        )}
      </div>
    </div>
  );
}
