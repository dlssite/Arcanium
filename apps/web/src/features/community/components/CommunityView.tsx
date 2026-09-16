// @ts-nocheck
// TODO: Full TypeScript typing — tracked as M5 in web-app-audit.md.
import React from 'react';
import {
  Users,
  MessageSquare,
  Sparkles,
  Heart,
  Share2,
  Plus,
  CircleDot,
  ArrowRight,
} from 'lucide-react';
import { useCommunityQuery, useEchoMutation } from '../../community/useCommunityQuery.ts';
import { useNavigate } from 'react-router-dom';
import { features } from '../../../config/features.ts';
import type { CircleSummary } from '@arcanium/types';

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
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-stone-200 dark:bg-stone-700 rounded-2xl" />)}
        </div>
        <div className="lg:col-span-8 space-y-4">
          {[1, 2].map(i => <div key={i} className="h-48 bg-stone-200 dark:bg-stone-700 rounded-3xl" />)}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Featured Circles Strip — renders nothing when empty
// ---------------------------------------------------------------------------

function FeaturedCirclesStrip({ circles }: { circles: CircleSummary[] }) {
  const navigate = useNavigate();

  if (!circles || circles.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif font-bold text-lg text-[#2D223B] dark:text-[#F1ECF7] flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          Featured Circles
        </h3>
        <button
          onClick={() => navigate('/circles')}
          className="flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:underline"
        >
          View all circles
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
        {circles.map((circle) => (
          <button
            key={circle.id}
            onClick={() => navigate(`/circles/${circle.id}`)}
            className="flex-shrink-0 w-44 bg-white dark:bg-[#1D1726] rounded-2xl p-3.5 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs hover:shadow-md transition-all text-left group active:scale-95"
          >
            <div className={`h-1 w-8 rounded-full mb-2.5 ${circle.coverColor}`} />
            <span className="text-[10px] font-bold bg-[#F2EDFA] dark:bg-[#2C213B] text-[#554271] dark:text-[#D1BEE6] px-2 py-0.5 rounded-full truncate block max-w-full mb-1">
              {circle.tag}
            </span>
            <h4 className="font-serif font-bold text-xs text-[#2D223B] dark:text-[#F1ECF7] leading-snug group-hover:text-[#43335A] dark:group-hover:text-[#FFDE88] transition-colors line-clamp-2 mb-2">
              {circle.name}
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-[#80778B] dark:text-[#9F94AC]">
              <span className="flex items-center gap-0.5">
                <Users className="w-3 h-3" />
                {circle.memberCount.toLocaleString()}
              </span>
              {circle.activeNow > 0 && (
                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {circle.activeNow}
                </span>
              )}
            </div>
          </button>
        ))}

        {/* Explore CTA */}
        <button
          onClick={() => navigate('/circles')}
          className="flex-shrink-0 w-44 rounded-2xl p-3.5 border border-dashed border-[#C5B9D0] dark:border-[#3D2E50] text-[#9A8FA7] hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex flex-col items-center justify-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-full border border-current flex items-center justify-center group-hover:bg-purple-50 dark:group-hover:bg-purple-950/20 transition-colors">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold text-center leading-tight">Explore all circles</span>
        </button>
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
  const navigate     = useNavigate();

  if (isLoading) return <CommunitySkeleton />;

  // Real data only — no mock fallbacks
  const circles        = data?.circles        ?? [];
  const posts          = (data?.posts         ?? []).map((p) => ({
    ...p,
    echoCount:  p.echoCount  ?? 0,
    replyCount: p.replyCount ?? 0,
    book:       p.book       ?? p.bookTitle   ?? '',
  }));
  const featuredCircles = features.circles ? (data?.featuredCircles ?? []) : [];
  const challenge       = data?.challenge ?? null;

  const totalScholars  = challenge?.totalScholars  ?? 0;
  const completedPages = challenge?.completedPages ?? 0;
  const targetPages    = challenge?.targetPages    ?? 1;
  const progressPercent = challenge?.progressPercent ?? 0;
  const title          = challenge?.title          ?? 'Weekly Archival Quest';
  const description    = challenge?.description    ?? 'No active challenge this week.';

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-4 sm:px-6 lg:px-0 text-[#2D223B] dark:text-[#F1ECF7] select-none w-full transition-colors duration-200">

      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#342646] dark:text-[#F1ECF7]">
            Archival Community
          </h1>
          <p className="text-xs sm:text-sm text-[#80778B] dark:text-[#9F94AC] mt-1">
            {totalScholars > 0
              ? `Connect with ${totalScholars.toLocaleString()} fellow scholars, share marginalia, and explore reading circles`
              : 'Share marginalia, explore reading circles, and connect with fellow scholars'}
          </p>
        </div>
        <button className="self-start sm:self-auto bg-[#43335A] hover:bg-[#342647] dark:bg-[#725499] text-white px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm active:scale-95 transition-all">
          <Plus className="w-4 h-4" />
          <span>New Reflection</span>
        </button>
      </header>

      {/* Weekly Challenge Banner — only shown when there is an active challenge */}
      {challenge && (
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
      )}

      {/* Featured Circles Strip — renders nothing when empty */}
      <FeaturedCirclesStrip circles={featuredCircles} />

      {/* Dual Column: Reading Circles + Marginalia Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">

        {/* Reading Circles */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-[#2D223B] dark:text-[#F1ECF7] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#43335A] dark:text-[#DE9B35]" />
              Reading Circles
            </h3>
            {circles.length > 0 && (
              <span className="text-xs text-[#80778B] dark:text-[#9F94AC]">
                {circles.length} Active
              </span>
            )}
          </div>

          {circles.length === 0 ? (
            <div className="bg-white dark:bg-[#1D1726] rounded-2xl p-6 border border-[#ECE7DF] dark:border-[#352B44] text-center space-y-2">
              <CircleDot className="w-8 h-8 text-[#C5BACF] mx-auto" />
              <p className="text-xs text-[#80778B] dark:text-[#9F94AC]">No active circles yet.</p>
              {features.circles && (
                <button
                  onClick={() => navigate('/circles')}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Browse circles →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {circles.map((circle) => (
                <div
                  key={circle.id}
                  onClick={() => features.circles && navigate(`/circles/${circle.id}`)}
                  className={`bg-white dark:bg-[#1D1726] rounded-2xl p-4 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs hover:shadow-md transition-all group ${features.circles ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="font-bold bg-[#F2EDFA] dark:bg-[#2C213B] text-[#554271] dark:text-[#D1BEE6] px-2.5 py-0.5 rounded-full">
                      {circle.tag}
                    </span>
                    {circle.activeNow > 0 && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {circle.activeNow} reading now
                      </span>
                    )}
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
                    {features.circles && (
                      <span className="font-semibold text-[#43335A] dark:text-[#D1BEE6] group-hover:underline">
                        View Circle →
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Marginalia Feed */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-[#2D223B] dark:text-[#F1ECF7] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#43335A] dark:text-[#DE9B35]" />
              Living Marginalia & Highlights
            </h3>
            <span className="text-xs text-[#80778B] dark:text-[#9F94AC]">Recent Echoes</span>
          </div>

          {posts.length === 0 ? (
            <div className="bg-white dark:bg-[#1D1726] rounded-3xl p-8 border border-[#ECE7DF] dark:border-[#352B44] text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-[#C5BACF] mx-auto" />
              <p className="text-sm text-[#80778B] dark:text-[#9F94AC]">
                No reflections yet. Be the first to share a marginalia post.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-white dark:bg-[#1D1726] rounded-3xl p-5 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs hover:shadow-md transition-all">
                  {/* Author row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-800 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                        {(post.author ?? '?').slice(0, 2).toUpperCase()}
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
                      {post.book}
                    </span>
                  </div>

                  {/* Quote */}
                  <div className="bg-[#FAF8F5] dark:bg-[#251D30] border-l-[3px] border-[#DE9B35] rounded-r-2xl p-3.5 my-2.5">
                    <p className="font-serif italic text-xs sm:text-[13.5px] leading-relaxed text-[#43335A] dark:text-[#E2D4F3]">
                      {post.quote}
                    </p>
                    {post.chapter && (
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
                      onClick={() => echoMutation.mutate(post.id)}
                      disabled={echoMutation.isPending}
                      className="flex items-center gap-1.5 hover:text-[#DE9B35] transition-colors active:scale-95 disabled:opacity-60"
                    >
                      <Heart className="w-4 h-4 text-[#DE9B35]" />
                      <span>Echo ({post.echoCount})</span>
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-[#43335A] dark:hover:text-white transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.replyCount} Reflections</span>
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-[#43335A] dark:hover:text-white transition-colors">
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
