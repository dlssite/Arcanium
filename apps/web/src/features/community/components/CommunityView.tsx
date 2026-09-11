// @ts-nocheck
// TODO: Full TypeScript typing — tracked as M5 in web-app-audit.md.
// File was converted from .jsx during the M1 view relocation sprint.
// Proper prop interfaces and return types to be added in the Phase 4 TS pass.
import React from 'react';
import {
  Users,
  MessageSquare,
  Sparkles,
  Heart,
  Share2,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  MOCK_READING_CIRCLES,
  MOCK_MARGINALIA_POSTS,
  MOCK_COMMUNITY_CHALLENGE,
} from '../../../mocks/mockData.js';
import { useCommunityQuery, useEchoMutation } from '../../community/useCommunityQuery.ts';
import { avatarImg } from '../../../mocks/mockData.js';

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function CommunitySkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-4 sm:px-6 lg:px-0 w-full animate-pulse">
      <div className="h-8 w-56 bg-stone-200 dark:bg-stone-700 rounded-2xl mb-2" />
      <div className="h-4 w-80 bg-stone-200 dark:bg-stone-700 rounded-xl mb-8" />
      <div className="h-32 w-full bg-stone-200 dark:bg-stone-700 rounded-3xl mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-stone-200 dark:bg-stone-700 rounded-2xl" />)}
        </div>
        <div className="lg:col-span-8 space-y-4">
          {[1,2].map(i => <div key={i} className="h-48 bg-stone-200 dark:bg-stone-700 rounded-3xl" />)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CommunityView() {
  const { data, isLoading, isError } = useCommunityQuery();
  const echoMutation = useEchoMutation();

  // Show skeleton while loading
  if (isLoading) return <CommunitySkeleton />;

  // Fall back to mock data when DB is empty or on error (graceful degradation).
  // Normalise mock circles to API shape (mock uses `members`, API uses `memberCount`).
  const normaliseMockCircle = (c) => ({
    id: c.id,
    name: c.name,
    tag: c.tag,
    focusTitle: c.focus ?? c.focusTitle ?? null,
    memberCount: c.members ?? c.memberCount ?? 0,
    activeNow: c.activeNow ?? 0,
  });

  const rawCircles = data?.circles?.length ? data.circles : MOCK_READING_CIRCLES.map(normaliseMockCircle);
  const circles = rawCircles.map((c) => ({
    ...c,
    memberCount: c.memberCount ?? 0,
    activeNow: c.activeNow ?? 0,
  }));

  const posts = (data?.posts?.length ? data.posts : MOCK_MARGINALIA_POSTS).map((p) => ({
    ...p,
    echoCount:  p.echoCount  ?? 0,
    replyCount: p.replyCount ?? p.replies ?? 0,
    avatarUrl:  p.avatarUrl  ?? p.avatar  ?? null,
    book:       p.book       ?? p.bookTitle ?? '',
  }));
  const challenge = data?.challenge ?? MOCK_COMMUNITY_CHALLENGE;

  const totalScholars = challenge?.totalScholars ?? MOCK_COMMUNITY_CHALLENGE.totalScholars;
  const completedPages   = challenge?.completedPages   ?? MOCK_COMMUNITY_CHALLENGE.completedPages;
  const targetPages      = challenge?.targetPages      ?? MOCK_COMMUNITY_CHALLENGE.targetPages;
  const progressPercent  = challenge?.progressPercent  ?? MOCK_COMMUNITY_CHALLENGE.progressPercent;
  const title            = challenge?.title            ?? MOCK_COMMUNITY_CHALLENGE.title;
  const description      = challenge?.description      ?? MOCK_COMMUNITY_CHALLENGE.description;

  const handleEcho = (id) => {
    echoMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-4 sm:px-6 lg:px-0 text-[#2D223B] dark:text-[#F1ECF7] select-none w-full transition-colors duration-200">

      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#342646] dark:text-[#F1ECF7]">
            Archival Community
          </h1>
          <p className="text-xs sm:text-sm text-[#80778B] dark:text-[#9F94AC] mt-1">
            Connect with {totalScholars.toLocaleString()} fellow scholars, share marginalia, and explore reading circles
          </p>
        </div>
        <button className="self-start sm:self-auto bg-[#43335A] hover:bg-[#342647] dark:bg-[#725499] text-white px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm active:scale-95 transition-all">
          <Plus className="w-4 h-4" />
          <span>New Reflection</span>
        </button>
      </header>

      {/* Weekly Challenge Banner */}
      <div className="bg-gradient-to-r from-[#39264D] via-[#4D356A] to-[#684C8B] rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden mb-8 border border-[#523A73]">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#FFDE88] font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 fill-[#FFDE88]" />
              <span>Weekly Archival Quest</span>
            </div>
            <h3 className="font-serif font-bold text-xl sm:text-2xl">{title}</h3>
            <p className="text-xs text-stone-200 mt-1">{description}</p>
          </div>

          <div className="w-full sm:w-56 bg-black/25 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10 flex-shrink-0">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span>Progress</span>
              <span className="text-[#FFDE88]">{progressPercent}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#FFDE88] to-[#DE9B35] h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-300 mt-1.5 block text-right">
              {completedPages.toLocaleString()} / {targetPages.toLocaleString()} pages
            </span>
          </div>
        </div>
      </div>

      {/* Dual Column: Reading Circles + Marginalia Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">

        {/* Reading Circles */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-[#2D223B] dark:text-[#F1ECF7] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#43335A] dark:text-[#DE9B35]" />
              <span>Reading Circles</span>
            </h3>
            <span className="text-xs text-[#80778B] dark:text-[#9F94AC]">
              {circles.length} Active
            </span>
          </div>

          <div className="space-y-3">
            {circles.map((circle) => (
              <div
                key={circle.id}
                className="bg-white dark:bg-[#1D1726] rounded-2xl p-4 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="font-bold bg-[#F2EDFA] dark:bg-[#2C213B] text-[#554271] dark:text-[#D1BEE6] px-2.5 py-0.5 rounded-full">
                    {circle.tag}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {circle.activeNow} reading now
                  </span>
                </div>
                <h4 className="font-serif font-bold text-sm text-[#2D223B] dark:text-[#F1ECF7] group-hover:text-[#43335A] dark:group-hover:text-[#FFDE88] transition-colors">
                  {circle.name}
                </h4>
                {circle.focusTitle && (
                  <p className="text-xs text-[#80778B] dark:text-[#9F94AC] mt-0.5">
                    Reading: {circle.focusTitle}
                  </p>
                )}
                <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-[#2F243E] flex items-center justify-between text-xs text-[#80778B] dark:text-[#9F94AC]">
                  <span>{circle.memberCount.toLocaleString()} Scholars</span>
                  <span className="font-semibold text-[#43335A] dark:text-[#D1BEE6] group-hover:underline">
                    Join Circle →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marginalia Feed */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-[#2D223B] dark:text-[#F1ECF7] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#43335A] dark:text-[#DE9B35]" />
              <span>Living Marginalia & Highlights</span>
            </h3>
            <span className="text-xs text-[#80778B] dark:text-[#9F94AC]">Recent Echoes</span>
          </div>

          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-[#1D1726] rounded-3xl p-5 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs hover:shadow-md transition-all">
                {/* Author row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-stone-200 dark:border-stone-700 flex-shrink-0">
                      <img
                        src={post.avatarUrl ?? post.avatar ?? avatarImg}
                        alt={post.author}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#2D223B] dark:text-[#F1ECF7] leading-none">
                        {post.author}
                      </h4>
                      <p className="text-[10px] text-[#80778B] dark:text-[#9F94AC] mt-0.5">
                        {post.role} • {post.time}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#51406B] dark:text-[#C5B3DC] bg-[#FAF6EE] dark:bg-[#2A2038] px-2.5 py-1 rounded-full border border-[#ECE4D4] dark:border-[#3D2E50]">
                    {post.book ?? post.bookTitle}
                  </span>
                </div>

                {/* Quote */}
                <div className="bg-[#FAF8F5] dark:bg-[#251D30] border-l-[3px] border-[#DE9B35] rounded-r-2xl p-3.5 my-2.5">
                  <p className="font-serif italic text-xs sm:text-[13.5px] leading-relaxed text-[#43335A] dark:text-[#E2D4F3]">
                    {post.quote}
                  </p>
                  {(post.chapter) && (
                    <span className="text-[10px] text-[#9A8EA6] mt-1.5 block text-right font-mono">
                      {post.chapter}
                    </span>
                  )}
                </div>

                {/* Reflection */}
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#564B63] dark:text-[#CBC0D8] mt-2">
                  {post.reflection}
                </p>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-[#2F243E] flex items-center justify-between text-xs text-[#80778B] dark:text-[#9F94AC]">
                  <button
                    onClick={() => handleEcho(post.id)}
                    disabled={echoMutation.isPending}
                    className="flex items-center gap-1.5 hover:text-[#DE9B35] transition-colors active:scale-95 disabled:opacity-60"
                  >
                    <Heart className="w-4 h-4 text-[#DE9B35]" />
                    <span>Echo ({post.echoCount})</span>
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-[#43335A] dark:hover:text-white transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.replyCount ?? post.replies ?? 0} Reflections</span>
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-[#43335A] dark:hover:text-white transition-colors">
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
