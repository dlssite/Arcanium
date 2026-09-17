import React, { useState } from 'react';
import { Heart, MessageSquare, Pin, Trash2, ChevronDown, ChevronUp, Quote, Sparkles } from 'lucide-react';
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
    <div
      className={`relative rounded-3xl bg-white dark:bg-[#1A1423] border transition-all duration-300 overflow-hidden shadow-soft-card dark:shadow-dark-card ${
        post.isPinned
          ? 'border-amber-400/60 dark:border-amber-400/40 ring-1 ring-amber-400/30 dark:ring-amber-400/20'
          : 'border-[#ECE7DF] dark:border-[#312740] hover:border-purple-400/40 dark:hover:border-purple-500/40'
      }`}
    >
      {/* Pinned Accent Header */}
      {post.isPinned && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent px-5 py-1.5 border-b border-amber-400/30 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest">
            <Pin className="w-3 h-3 fill-current rotate-45 text-amber-500" />
            Pinned Codex Announcement
          </span>
          <Sparkles className="w-3 h-3 text-amber-500" />
        </div>
      )}

      <div className="p-5 sm:p-6">
        {/* Author row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-700 via-[#523F71] to-indigo-800 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs">
              {post.author.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-[#2D253A] dark:text-[#F1ECF7]">
                  {post.author}
                </h4>
                {post.role && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    {post.role}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#80778B] dark:text-[#9E94AB] mt-0.5">
                {post.time}
              </p>
            </div>
          </div>

          {/* Moderation Actions */}
          <div className="flex items-center gap-1">
            {canModerate && (
              <button
                onClick={() => pinPost.mutate({ circleId, postId: post.id })}
                className={`p-2 rounded-xl transition-all ${
                  post.isPinned
                    ? 'text-amber-500 bg-amber-500/10'
                    : 'text-[#80778B] hover:text-amber-500 hover:bg-amber-500/10'
                }`}
                title={post.isPinned ? 'Unpin from top' : 'Pin to top'}
              >
                <Pin className={`w-4 h-4 ${post.isPinned ? 'fill-current' : ''}`} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => {
                  if (window.confirm('Delete this post and all its replies?')) {
                    deletePost.mutate({ circleId, postId: post.id });
                  }
                }}
                disabled={deletePost.isPending}
                className="p-2 rounded-xl text-[#80778B] hover:text-rose-600 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                title="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Post Content */}
        {post.type === 'MARGINALIA' ? (
          <div className="space-y-3">
            {/* Illuminated Quote Box */}
            <div className="rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border-l-4 border-amber-500 p-4 relative overflow-hidden">
              <Quote className="absolute top-2 right-2 w-10 h-10 text-amber-500/10 pointer-events-none" />
              <p className="font-serif italic text-sm sm:text-base leading-relaxed text-amber-950 dark:text-amber-100">
                “{post.quote}”
              </p>
              {post.chapter && (
                <div className="mt-2 text-right">
                  <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300/80 bg-amber-500/15 px-2.5 py-0.5 rounded-full">
                    {post.chapter}
                  </span>
                </div>
              )}
            </div>

            {/* Reflection Commentary */}
            <p className="text-xs sm:text-sm leading-relaxed text-[#2D253A] dark:text-[#E2D4F3] pt-1">
              {post.reflection}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#2D253A] dark:text-[#F1ECF7] leading-snug">
              {post.title}
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-[#523F71] dark:text-[#CBC0D8]">
              {post.body}
            </p>
          </div>
        )}

        {/* Interactive Actions Bar */}
        <div className="mt-5 pt-3.5 border-t border-[#ECE7DF] dark:border-[#312740] flex items-center justify-between text-xs text-[#80778B] dark:text-[#9E94AB]">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Echo Button */}
            <button
              onClick={() => echoPost.mutate(post.id)}
              disabled={echoPost.isPending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-60 ${
                post.echoed
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'hover:bg-amber-500/10 hover:text-amber-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${post.echoed ? 'fill-current text-amber-500' : ''}`} />
              <span>Echo ({post.echoCount})</span>
            </button>

            {/* Replies Toggle */}
            <button
              onClick={() => setShowReplies(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all hover:bg-stone-100 dark:hover:bg-[#251D30] ${
                showReplies
                  ? 'text-[#523F71] dark:text-[#FFDE88] bg-purple-500/10'
                  : 'text-[#80778B] dark:text-[#9E94AB]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{post.replyCount} {post.replyCount === 1 ? 'Reply' : 'Replies'}</span>
              {showReplies ? (
                <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Threaded Replies Drawer */}
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
