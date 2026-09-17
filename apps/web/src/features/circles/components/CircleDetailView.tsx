import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Lock, Loader2,
  MessageSquare, BookOpen, Crown, ShieldCheck,
  Share2, Check, UserPlus, Sparkles, Filter, Info,
  CheckCircle2, XCircle, Trash2, ChevronRight,
} from 'lucide-react';
import {
  useCircleDetail,
  useCirclePosts,
  useCircleMembers,
  useCircleRequests,
  useJoinCircle,
  useLeaveCircle,
  useApproveRequest,
  useRejectRequest,
  usePromoteMember,
  useDemoteMember,
  useRemoveMember,
} from '../useCirclesQuery';
import { useUserStore } from '../../../stores/useUserStore.js';
import CirclePostCard from './CirclePostCard';
import CirclePostComposer from './CirclePostComposer';
import CircleSessionBanner from './CircleSessionBanner';

// Loading Skeleton
function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-5 w-full">
      <div className="h-44 bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
      <div className="h-20 bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
      <div className="h-48 bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
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
  const { data: members, isLoading: membersLoading }        = useCircleMembers(circleId!);
  const { data: requests, isLoading: requestsLoading }      = useCircleRequests(circleId!);

  const joinCircle     = useJoinCircle();
  const leaveCircle    = useLeaveCircle();
  const approveRequest = useApproveRequest();
  const rejectRequest  = useRejectRequest();
  const promoteMember  = usePromoteMember();
  const demoteMember   = useDemoteMember();
  const removeMember   = useRemoveMember();

  // Active Tab state: 'discussions' | 'members' | 'about'
  const [activeTab, setActiveTab] = useState<'discussions' | 'members' | 'about'>('discussions');
  const [postFilter, setPostFilter] = useState<'ALL' | 'MARGINALIA' | 'DISCUSSION'>('ALL');
  const [joinMessage, setJoinMessage] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (circleLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pt-4 w-full">
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !circle) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-[#2D253A] dark:text-[#F1ECF7]">
          Sanctum Not Found or Access Restricted
        </h2>
        <p className="text-xs text-[#80778B] dark:text-[#9E94AB] max-w-sm">
          This circle may have been archived or is private to invited scholars.
        </p>
        <button
          onClick={() => navigate('/circles')}
          className="px-5 py-2 rounded-full text-xs font-bold bg-[#523F71] dark:bg-[#725499] text-white transition-all active:scale-95 shadow-sm"
        >
          ← Return to Directory
        </button>
      </div>
    );
  }

  const membership   = circle.membership;
  const isMember     = membership?.status === 'ACTIVE';
  const isPending    = membership?.status === 'PENDING';
  const isOwner      = membership?.role === 'OWNER';
  const isMod        = membership?.role === 'MODERATOR';
  const canManage    = isOwner || isMod;
  const canPost      = isMember;
  const isPrivate    = circle.visibility === 'PRIVATE';

  const rawPosts = postsData?.posts ?? [];
  const posts = rawPosts.filter(p => {
    if (postFilter === 'ALL') return true;
    return p.type === postFilter;
  });

  async function handleJoin() {
    if (isPrivate && !showJoinForm) {
      setShowJoinForm(true);
      return;
    }
    await joinCircle.mutateAsync({
      circleId: circleId!,
      ...(joinMessage ? { message: joinMessage } : {}),
    });
    setShowJoinForm(false);
    setJoinMessage('');
  }

  async function handleLeave() {
    if (!window.confirm('Depart from this reading circle?')) return;
    await leaveCircle.mutateAsync(circleId!);
    navigate('/circles');
  }

  function handleShare() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-3 sm:pt-4 px-4 sm:px-6 lg:px-0 text-[#2D253A] dark:text-[#F1ECF7] w-full transition-colors duration-200">
      
      {/* Back to Directory Button */}
      <button
        onClick={() => navigate('/circles')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#80778B] dark:text-[#9E94AB] hover:text-[#523F71] dark:hover:text-[#FFDE88] mb-3.5 sm:mb-4 py-1 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Reading Circles</span>
      </button>

      {/* Grand Hero Banner Card */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] shadow-soft-card dark:shadow-dark-card overflow-hidden mb-6">
        {/* Top Decorative Cover Accent */}
        <div className={`h-3 sm:h-4 w-full ${circle.coverColor} relative`}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent" />
        </div>

        <div className="p-4 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 sm:gap-6">
            <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
              {/* Circle Avatar Emblem */}
              <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl ${circle.coverColor} flex items-center justify-center text-white text-xl sm:text-2xl font-serif font-bold shadow-lg shrink-0`}>
                {circle.name.slice(0, 1).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    {circle.tag}
                  </span>
                  {isPrivate && (
                    <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-[#251D30] text-[#80778B] dark:text-[#9E94AB]">
                      <Lock className="w-3.5 h-3.5" />
                      Private Sanctum
                    </span>
                  )}
                  {isOwner && (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      <Crown className="w-3.5 h-3.5" />
                      Circle Founder
                    </span>
                  )}
                  {isMod && (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Moderator
                    </span>
                  )}
                </div>

                <h1 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight text-[#2D253A] dark:text-[#F1ECF7]">
                  {circle.name}
                </h1>

                {circle.description && (
                  <p className="text-xs sm:text-sm text-[#80778B] dark:text-[#9E94AB] mt-2 leading-relaxed max-w-3xl">
                    {circle.description}
                  </p>
                )}

                {/* Circle Meta Badges */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#ECE7DF] dark:border-[#312740] text-xs text-[#80778B] dark:text-[#9E94AB]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="w-4 h-4 text-[#523F71] dark:text-[#FFDE88]" />
                    {circle.memberCount.toLocaleString()} {circle.memberCount === 1 ? 'Scholar' : 'Scholars'}
                  </span>
                  {circle.activeNow > 0 && (
                    <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {circle.activeNow} reading now
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-2.5 shrink-0 self-start">
              {/* Share Button */}
              <button
                onClick={handleShare}
                className="p-2.5 rounded-2xl border border-[#ECE7DF] dark:border-[#312740] text-[#80778B] dark:text-[#9E94AB] hover:text-[#2D253A] dark:hover:text-[#F1ECF7] hover:bg-stone-100 dark:hover:bg-[#251D30] transition-colors"
                title="Share Sanctum link"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              </button>

              {/* Join / Leave / Pending States */}
              {!membership && (
                <>
                  {showJoinForm && isPrivate ? (
                    <div className="flex flex-col gap-2 w-72 bg-stone-50 dark:bg-[#150F1E] p-3 rounded-2xl border border-[#ECE7DF] dark:border-[#312740]">
                      <input
                        type="text"
                        value={joinMessage}
                        onChange={e => setJoinMessage(e.target.value)}
                        placeholder="Why do you wish to join? (optional)"
                        maxLength={300}
                        className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowJoinForm(false)}
                          className="flex-1 py-1.5 rounded-xl text-xs border border-[#ECE7DF] dark:border-[#312740] text-[#80778B]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleJoin}
                          disabled={joinCircle.isPending}
                          className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-[#523F71] text-white flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          {joinCircle.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Request
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleJoin}
                      disabled={joinCircle.isPending}
                      className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#523F71] hover:bg-[#433258] dark:bg-[#725499] text-white shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {joinCircle.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span>{isPrivate ? 'Request Admission' : 'Join Circle'}</span>
                    </button>
                  )}
                </>
              )}

              {isPending && (
                <span className="px-4 py-2 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Admission Pending Review…
                </span>
              )}

              {isMember && !isOwner && (
                <button
                  onClick={handleLeave}
                  disabled={leaveCircle.isPending}
                  className="px-4 py-2 rounded-full text-xs font-bold border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                >
                  Leave Sanctum
                </button>
              )}
            </div>
          </div>

          {/* Active Reading Session Banner */}
          <div className="mt-6">
            <CircleSessionBanner
              circleId={circleId!}
              session={circle.activeSession}
              canManage={canManage}
            />
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex border-t border-[#ECE7DF] dark:border-[#312740] bg-stone-50/70 dark:bg-[#150F1E] px-2 sm:px-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('discussions')}
            className={`flex-shrink-0 flex items-center gap-2 py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'discussions'
                ? 'border-[#523F71] dark:border-[#FFDE88] text-[#523F71] dark:text-[#FFDE88]'
                : 'border-transparent text-[#80778B] dark:text-[#9E94AB] hover:text-[#2D253A] dark:hover:text-[#F1ECF7]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Marginalia & Feed</span>
            {postsData?.total !== undefined && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300">
                {postsData.total}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex-shrink-0 flex items-center gap-2 py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'members'
                ? 'border-[#523F71] dark:border-[#FFDE88] text-[#523F71] dark:text-[#FFDE88]'
                : 'border-transparent text-[#80778B] dark:text-[#9E94AB] hover:text-[#2D253A] dark:hover:text-[#F1ECF7]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Scholars Directory</span>
            {circle.pendingRequestCount > 0 && canManage && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-black font-bold animate-pulse">
                {circle.pendingRequestCount} new
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex-shrink-0 flex items-center gap-2 py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'about'
                ? 'border-[#523F71] dark:border-[#FFDE88] text-[#523F71] dark:text-[#FFDE88]'
                : 'border-transparent text-[#80778B] dark:text-[#9E94AB] hover:text-[#2D253A] dark:hover:text-[#F1ECF7]'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Codex & Lore</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Discussions & Marginalia */}
      {activeTab === 'discussions' && (
        <div className="space-y-6">
          {/* Post composer for members */}
          {canPost && <CirclePostComposer circleId={circleId!} />}

          {/* Feed Filter Chips */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['ALL', 'MARGINALIA', 'DISCUSSION'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPostFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    postFilter === f
                      ? 'bg-[#523F71] text-white border-[#523F71] dark:bg-[#725499] dark:border-[#725499] shadow-xs'
                      : 'bg-white dark:bg-[#1A1423] border-[#ECE7DF] dark:border-[#312740] text-[#6D6282] dark:text-[#9E94AB] hover:border-purple-300'
                  }`}
                >
                  {f === 'ALL' ? 'All Reflections' : f === 'MARGINALIA' ? '📖 Passages & Marginalia' : '💬 Discussions'}
                </button>
              ))}
            </div>
            <span className="text-xs text-[#80778B] dark:text-[#9E94AB] font-mono">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          {/* Posts Feed */}
          {postsLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-44 bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-white dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 text-[#523F71] dark:text-[#FFDE88] flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#2D253A] dark:text-[#F1ECF7]">
                The Codex is currently quiet
              </h3>
              <p className="text-xs text-[#80778B] dark:text-[#9E94AB] max-w-sm mx-auto">
                Be the first scholar to inscribe a reflection or spark a chapter discussion in this circle.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <CirclePostCard
                  key={post.id}
                  post={post}
                  circleId={circleId!}
                  isMember={isMember}
                  canModerate={canManage}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Members Directory & Requests */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Pending Requests Queue (for private circles & moderators) */}
          {canManage && requests && requests.length > 0 && (
            <div className="rounded-3xl bg-amber-500/10 border border-amber-500/30 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                <UserPlus className="w-4 h-4 text-amber-600" />
                <span>Pending Admission Requests ({requests.length})</span>
              </div>
              <div className="space-y-2.5">
                {requests.map(req => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#1A1423] border border-amber-500/20 shadow-xs"
                  >
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#2D253A] dark:text-[#F1ECF7]">
                        {req.displayName}
                      </h4>
                      {req.message && (
                        <p className="text-xs text-[#80778B] dark:text-[#9E94AB] italic mt-0.5">
                          “{req.message}”
                        </p>
                      )}
                      <span className="text-[10px] text-[#80778B]">{req.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => rejectRequest.mutate({ circleId: circleId!, requestId: req.id })}
                        disabled={rejectRequest.isPending}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => approveRequest.mutate({ circleId: circleId!, requestId: req.id })}
                        disabled={approveRequest.isPending}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#523F71] text-white hover:bg-[#433258] transition-colors flex items-center gap-1"
                      >
                        {approveRequest.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Admit Scholar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="rounded-3xl bg-white dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] shadow-soft-card p-6 space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#2D253A] dark:text-[#F1ECF7]">
              Scholars of the Circle
            </h3>

            {membersLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-14 bg-stone-200/70 dark:bg-[#1E1729] rounded-2xl" />
                ))}
              </div>
            ) : !members?.length ? (
              <p className="text-xs text-[#80778B] dark:text-[#9E94AB]">No members list available.</p>
            ) : (
              <div className="divide-y divide-[#ECE7DF] dark:divide-[#312740]">
                {members.map(m => {
                  const isSelf = m.userId === userId;
                  const isItemOwner = m.role === 'OWNER';
                  const isItemMod = m.role === 'MODERATOR';

                  return (
                    <div key={m.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-800 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                          {m.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-[#2D253A] dark:text-[#F1ECF7]">
                              {m.displayName}
                            </span>
                            {isItemOwner && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Crown className="w-3 h-3" /> Owner
                              </span>
                            )}
                            {isItemMod && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                <ShieldCheck className="w-3 h-3" /> Mod
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#80778B] dark:text-[#9E94AB]">
                            Joined {new Date(m.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Moderator Controls */}
                      {isOwner && !isSelf && (
                        <div className="flex items-center gap-1.5">
                          {isItemMod ? (
                            <button
                              onClick={() => demoteMember.mutate({ circleId: circleId!, userId: m.userId })}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                            >
                              Demote
                            </button>
                          ) : (
                            <button
                              onClick={() => promoteMember.mutate({ circleId: circleId!, userId: m.userId })}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                            >
                              Make Mod
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove ${m.displayName} from the circle?`)) {
                                removeMember.mutate({ circleId: circleId!, userId: m.userId });
                              }
                            }}
                            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10"
                            title="Remove scholar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: About & Codex Lore */}
      {activeTab === 'about' && (
        <div className="rounded-3xl bg-white dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] shadow-soft-card p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="font-serif font-bold text-xl text-[#2D253A] dark:text-[#F1ECF7] mb-2">
              Sanctum Codex & Archival Lore
            </h3>
            <p className="text-xs sm:text-sm text-[#80778B] dark:text-[#9E94AB] leading-relaxed">
              {circle.description || 'No special lore inscribed for this reading sanctum yet.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#ECE7DF] dark:border-[#312740]">
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#150F1E] border border-stone-200/60 dark:border-[#2F243E]">
              <span className="text-[11px] font-bold text-[#523F71] dark:text-[#FFDE88] uppercase tracking-wider block mb-1">
                Founded By
              </span>
              <p className="text-sm font-bold text-[#2D253A] dark:text-[#F1ECF7]">
                {circle.ownerName}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#150F1E] border border-stone-200/60 dark:border-[#2F243E]">
              <span className="text-[11px] font-bold text-[#523F71] dark:text-[#FFDE88] uppercase tracking-wider block mb-1">
                Consecration Date
              </span>
              <p className="text-sm font-bold text-[#2D253A] dark:text-[#F1ECF7]">
                {new Date(circle.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
