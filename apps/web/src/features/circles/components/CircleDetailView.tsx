import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Lock, Loader2,
  MessageSquare, Bell, BellOff,
} from 'lucide-react';
import { useCircleDetail, useCirclePosts, useJoinCircle, useLeaveCircle } from '../useCirclesQuery';
import { useUserStore } from '../../../stores/useUserStore.js';
import CirclePostCard from './CirclePostCard';
import CirclePostComposer from './CirclePostComposer';
import CircleSessionBanner from './CircleSessionBanner';

// Loading skeleton
function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4 w-full">
      <div className="h-32 bg-stone-200 dark:bg-stone-700/40 rounded-3xl" />
      <div className="h-48 bg-stone-200 dark:bg-stone-700/40 rounded-3xl" />
      <div className="h-48 bg-stone-200 dark:bg-stone-700/40 rounded-3xl" />
    </div>
  );
}

export default function CircleDetailView() {
  const { circleId } = useParams<{ circleId: string }>();
  const navigate      = useNavigate();
  const { user }      = useUserStore();
  const userId        = (user as any)?.id as string | undefined;

  const { data: circle, isLoading: circleLoading, isError } = useCircleDetail(circleId!);
  const { data: postsData, isLoading: postsLoading }        = useCirclePosts(circleId!);

  const joinCircle  = useJoinCircle();
  const leaveCircle = useLeaveCircle();

  const [joinMessage, setJoinMessage] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);

  if (circleLoading) return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] px-4 sm:px-6 lg:px-0 pt-4 w-full">
      <DetailSkeleton />
    </div>
  );

  if (isError || !circle) return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] flex flex-col items-center justify-center gap-3">
      <p className="text-sm text-rose-500">Circle not found.</p>
      <button onClick={() => navigate('/circles')} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
        ← Back to Circles
      </button>
    </div>
  );

  const membership   = circle.membership;
  const isMember     = membership?.status === 'ACTIVE';
  const isPending    = membership?.status === 'PENDING';
  const isOwner      = membership?.role === 'OWNER';
  const isMod        = membership?.role === 'MODERATOR';
  const canManage    = isOwner || isMod;
  const canPost      = isMember;
  const isPrivate    = circle.visibility === 'PRIVATE';

  const posts        = postsData?.posts ?? [];

  async function handleJoin() {
    if (isPrivate) {
      if (!showJoinForm) { setShowJoinForm(true); return; }
    }
    await joinCircle.mutateAsync({ circleId: circleId!, ...(joinMessage ? { message: joinMessage } : {}) });
    setShowJoinForm(false);
    setJoinMessage('');
  }

  async function handleLeave() {
    if (!confirm('Leave this circle?')) return;
    await leaveCircle.mutateAsync(circleId!);
    navigate('/circles');
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-4 sm:px-6 lg:px-0 text-[#2D223B] dark:text-[#F1ECF7] w-full transition-colors duration-200">

      {/* Back nav */}
      <button
        onClick={() => navigate('/circles')}
        className="flex items-center gap-1.5 text-xs text-[#80778B] dark:text-[#9F94AC] hover:text-[#43335A] dark:hover:text-white mb-5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Reading Circles
      </button>

      {/* Circle header card */}
      <div className="bg-white dark:bg-[#1D1726] rounded-3xl border border-[#ECE7DF] dark:border-[#352B44] p-5 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            {/* Color dot */}
            <div className={`w-12 h-12 rounded-2xl ${circle.coverColor} shrink-0 shadow-sm`} />

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] font-bold bg-[#F2EDFA] dark:bg-[#2C213B] text-[#554271] dark:text-[#D1BEE6] px-2.5 py-0.5 rounded-full">
                  {circle.tag}
                </span>
                {isPrivate && (
                  <span className="flex items-center gap-0.5 text-[10px] text-[#9A8FA7]">
                    <Lock className="w-3 h-3" />
                    Private
                  </span>
                )}
              </div>
              <h1 className="font-serif font-bold text-xl sm:text-2xl text-[#2D223B] dark:text-[#F1ECF7] leading-snug">
                {circle.name}
              </h1>
              {circle.description && (
                <p className="text-sm text-[#80778B] dark:text-[#9F94AC] mt-1 leading-relaxed">
                  {circle.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-[#9A8FA7]">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {circle.memberCount.toLocaleString()} Scholars
                </span>
                {circle.activeNow > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {circle.activeNow} reading now
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Join / Leave / Pending */}
          <div className="flex items-center gap-2 shrink-0">
            {!membership && (
              <>
                {showJoinForm && isPrivate ? (
                  <div className="flex flex-col gap-2 w-64">
                    <input
                      type="text"
                      value={joinMessage}
                      onChange={e => setJoinMessage(e.target.value)}
                      placeholder="Why do you want to join? (optional)"
                      maxLength={300}
                      className="px-3 py-2 rounded-xl text-xs bg-[#FAF8F5] dark:bg-[#120E18] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowJoinForm(false)} className="flex-1 py-2 rounded-xl text-xs border border-[#ECE7DF] dark:border-[#352B44] text-[#9A8FA7]">
                        Cancel
                      </button>
                      <button
                        onClick={handleJoin}
                        disabled={joinCircle.isPending}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#43335A] text-white flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {joinCircle.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Request
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joinCircle.isPending}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-[#43335A] hover:bg-[#342647] dark:bg-[#725499] text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {joinCircle.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isPrivate ? '🔒 Request to Join' : 'Join Circle'}
                  </button>
                )}
              </>
            )}

            {isPending && (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/20">
                Request pending…
              </span>
            )}

            {isMember && !isOwner && (
              <button
                onClick={handleLeave}
                disabled={leaveCircle.isPending}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all disabled:opacity-50"
              >
                Leave
              </button>
            )}
          </div>
        </div>

        {/* Session banner */}
        {(circle.activeSession || canManage) && (
          <div className="mt-4">
            <CircleSessionBanner
              circleId={circleId!}
              session={circle.activeSession}
              canManage={canManage}
            />
          </div>
        )}
      </div>

      {/* Private circle preview message */}
      {isPrivate && !isMember && !isPending && (
        <div className="bg-white dark:bg-[#1D1726] rounded-2xl border border-[#ECE7DF] dark:border-[#352B44] p-8 text-center space-y-2">
          <Lock className="w-8 h-8 text-[#9A8FA7] mx-auto" />
          <p className="text-sm text-[#6D6282] dark:text-[#9E94B3]">
            This is a private circle. Join to see posts and discussions.
          </p>
        </div>
      )}

      {/* Posts feed */}
      {(isMember || !isPrivate) && (
        <div className="space-y-4">
          {/* Post composer */}
          {canPost && <CirclePostComposer circleId={circleId!} />}

          {/* Posts */}
          {postsLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-40 bg-stone-200 dark:bg-stone-700/40 rounded-3xl" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-[#C5BACF] mx-auto" />
              <p className="text-sm text-[#9A8FA7]">No posts yet. Be the first to share.</p>
            </div>
          ) : (
            posts.map(post => (
              <CirclePostCard
                key={post.id}
                post={post}
                circleId={circleId!}
                isMember={isMember}
                canModerate={canManage}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
