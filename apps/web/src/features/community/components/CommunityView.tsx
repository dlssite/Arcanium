import React, { useState, useRef } from 'react';
import {
  Users,
  MessageSquare,
  Sparkles,
  Heart,
  Share2,
  Plus,
  CircleDot,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Quote,
  Flame,
  Award,
  Search,
  Check,
  X,
  Compass,
  ScrollText,
} from 'lucide-react';
import { useCommunityQuery, useEchoMutation } from '../useCommunityQuery';
import { useNavigate } from 'react-router-dom';
import { features } from '../../../config/features';
import type { CircleSummary } from '@arcanium/types';
import CircleCard from '../../circles/components/CircleCard';

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function CommunitySkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 text-[#2D253A] dark:text-[#F1ECF7] w-full animate-pulse space-y-6">
      <div className="h-44 w-full bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
      <div className="h-36 w-full bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-52 bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
          ))}
        </div>
        <div className="lg:col-span-4 space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-60 bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Featured Circles Carousel
// ---------------------------------------------------------------------------

function FeaturedCirclesStrip({ circles }: { circles: CircleSummary[] }) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!circles || circles.length === 0) return null;

  function scroll(dir: 'left' | 'right') {
    if (scrollRef.current) {
      const offset = dir === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-[#523F71] dark:text-[#FFDE88] flex items-center justify-center">
            <CircleDot className="w-4 h-4" />
          </div>
          <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2D253A] dark:text-[#F1ECF7]">
            Featured Reading Circles
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-xl border border-[#ECE7DF] dark:border-[#312740] text-[#80778B] hover:text-[#2D253A] dark:hover:text-[#F1ECF7] hover:bg-stone-100 dark:hover:bg-[#251D30] transition-colors"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-xl border border-[#ECE7DF] dark:border-[#312740] text-[#80778B] hover:text-[#2D253A] dark:hover:text-[#F1ECF7] hover:bg-stone-100 dark:hover:bg-[#251D30] transition-colors"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => navigate('/circles')}
            className="flex items-center gap-1 text-xs font-bold text-[#523F71] dark:text-[#FFDE88] hover:underline ml-1"
          >
            <span>Explore all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-3.5 pt-1 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 snap-x"
      >
        {circles.map((circle) => (
          <div key={circle.id} className="snap-start shrink-0">
            <CircleCard
              circle={circle}
              compact
              onClick={() => navigate(`/circles/${circle.id}`)}
            />
          </div>
        ))}

        {/* Explore All Card CTA */}
        <button
          onClick={() => navigate('/circles')}
          className="snap-start flex-shrink-0 w-52 sm:w-56 rounded-2xl p-5 border-2 border-dashed border-[#ECE7DF] dark:border-[#352B44] text-[#80778B] dark:text-[#9E94AB] hover:border-purple-400 hover:text-[#523F71] dark:hover:text-[#FFDE88] transition-all flex flex-col items-center justify-center gap-3 group bg-white/40 dark:bg-[#1A1423]/40"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-[#523F71] dark:text-[#FFDE88] flex items-center justify-center group-hover:scale-110 transition-transform">
            <Compass className="w-5 h-5" />
          </div>
          <div className="text-center">
            <span className="text-xs font-bold block text-[#2D253A] dark:text-[#F1ECF7]">
              Explore All Sanctums
            </span>
            <span className="text-[10px] text-[#80778B] dark:text-[#9E94AB] mt-0.5 block">
              Discover specialized guilds
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Community View Component
// ---------------------------------------------------------------------------

export default function CommunityView() {
  const { data, isLoading, isError } = useCommunityQuery();
  const echoMutation = useEchoMutation();
  const navigate     = useNavigate();

  const [feedSearch, setFeedSearch] = useState('');
  const [feedFilter, setFeedFilter] = useState<'ALL' | 'MARGINALIA' | 'POPULAR'>('ALL');
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [newReflectionQuote, setNewReflectionQuote] = useState('');
  const [newReflectionText, setNewReflectionText] = useState('');
  const [newReflectionBook, setNewReflectionBook] = useState('');

  if (isLoading) return <CommunitySkeleton />;

  const circles         = data?.circles        ?? [];
  const rawPosts        = (data?.posts         ?? []).map((p) => ({
    ...p,
    echoCount:  p.echoCount  ?? 0,
    replyCount: p.replyCount ?? 0,
    book:       p.book       ?? (p as any).bookTitle ?? '',
  }));
  const featuredCircles = features.circles ? (data?.featuredCircles ?? []) : [];
  const challenge       = data?.challenge ?? null;

  const totalScholars   = challenge?.totalScholars  ?? 0;
  const completedPages  = challenge?.completedPages ?? 0;
  const targetPages     = challenge?.targetPages    ?? 1;
  const progressPercent = challenge?.progressPercent ?? 0;
  const title           = challenge?.title          ?? 'Weekly Archival Quest';
  const description     = challenge?.description    ?? 'No active challenge this week.';

  // Filter posts
  const posts = rawPosts.filter((p) => {
    if (feedFilter === 'POPULAR' && p.echoCount < 2) return false;
    if (!feedSearch.trim()) return true;
    const query = feedSearch.toLowerCase();
    return (
      p.author?.toLowerCase().includes(query) ||
      p.book?.toLowerCase().includes(query) ||
      p.quote?.toLowerCase().includes(query) ||
      p.reflection?.toLowerCase().includes(query)
    );
  });

  function copyQuote(quote: string, id: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(quote);
      setCopiedQuoteId(id);
      setTimeout(() => setCopiedQuoteId(null), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-3 sm:pt-4 px-4 sm:px-6 lg:px-0 text-[#2D253A] dark:text-[#F1ECF7] select-none w-full transition-colors duration-200">
      
      {/* Grand Archival Hero Header */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#39264D] via-[#4D356A] to-[#684C8B] p-5 sm:p-8 text-white shadow-xl overflow-hidden mb-6 sm:mb-8 border border-[#523A73]">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-purple-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/15 text-[#FFDE88] mb-2">
              <Sparkles className="w-3.5 h-3.5 fill-[#FFDE88]" />
              <span>The Grand Archival Scriptorium</span>
            </div>
            <h1 className="font-serif font-bold text-2xl sm:text-4xl lg:text-5xl leading-tight">
              Scholarly Community
            </h1>
            <p className="text-xs sm:text-sm text-stone-200/90 mt-1.5 sm:mt-2 leading-relaxed">
              {totalScholars > 0
                ? `Connect with ${totalScholars.toLocaleString()} fellow scholars, discover living marginalia, and explore collaborative reading circles.`
                : 'Share book marginalia, explore reading circles, and connect with fellow scholars across the realm.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-full text-xs font-bold bg-[#FFDE88] hover:bg-[#ffe8a8] text-[#2D223B] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 group"
            >
              <Plus className="w-4 h-4 text-[#2D223B] group-hover:rotate-90 transition-transform" />
              <span>Inscribe Reflection</span>
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Archival Quest Card */}
      {challenge && (
        <div className="relative rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1A1423] border border-amber-500/30 dark:border-amber-500/30 p-4 sm:p-6 text-[#2D253A] dark:text-[#F1ECF7] shadow-soft-card dark:shadow-dark-card overflow-hidden mb-6 sm:mb-8">
          <div className="absolute top-0 right-0 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                  Weekly Archival Quest
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                  {challenge.badgeReward || 'Scholar Seal'}
                </span>
              </div>
              <h3 className="font-serif font-bold text-lg sm:text-2xl text-[#2D253A] dark:text-[#F1ECF7]">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-[#80778B] dark:text-[#9E94AB] leading-relaxed">
                {description}
              </p>
            </div>

            {/* Progress Display */}
            <div className="w-full lg:w-72 bg-amber-500/5 dark:bg-amber-950/20 p-3.5 sm:p-4 rounded-2xl border border-amber-500/20 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-amber-900 dark:text-amber-200">Realm Progress</span>
                <span className="text-amber-600 dark:text-amber-400">{progressPercent}%</span>
              </div>
              <div className="w-full bg-amber-200/50 dark:bg-amber-950/60 rounded-full h-2 sm:h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#80778B] dark:text-[#9E94AB] mt-2 font-medium">
                <span>{completedPages.toLocaleString()} pages</span>
                <span>Goal: {targetPages.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Circles Strip */}
      <FeaturedCirclesStrip circles={featuredCircles} />

      {/* Main Dual-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        
        {/* Left Column: Living Marginalia & Echoes Feed */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Feed Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#ECE7DF] dark:border-[#312740]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-[#523F71] dark:text-[#FFDE88] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-[#2D253A] dark:text-[#F1ECF7]">
                Living Marginalia & Echoes
              </h2>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-1.5">
              {(['ALL', 'POPULAR'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFeedFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                    feedFilter === f
                      ? 'bg-[#523F71] text-white border-[#523F71] dark:bg-[#725499] dark:border-[#725499] shadow-xs'
                      : 'bg-white dark:bg-[#1A1423] border-[#ECE7DF] dark:border-[#312740] text-[#6D6282] dark:text-[#9E94AB] hover:border-purple-300'
                  }`}
                >
                  {f === 'ALL' ? 'Recent Echoes' : '🔥 Popular'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Marginalia */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80778B] dark:text-[#9E94AB]" />
            <input
              type="text"
              value={feedSearch}
              onChange={e => setFeedSearch(e.target.value)}
              placeholder="Search marginalia by quote, book, or scholar…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-white dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-[#523F71] dark:focus:border-[#FFDE88] transition-all shadow-xs"
            />
          </div>

          {/* Posts List */}
          {posts.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 text-[#523F71] dark:text-[#FFDE88] flex items-center justify-center mx-auto">
                <Quote className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#2D253A] dark:text-[#F1ECF7]">
                No reflections found
              </h3>
              <p className="text-xs text-[#80778B] dark:text-[#9E94AB] max-w-sm mx-auto">
                Be the first scholar to inscribe your thoughts in the communal scroll.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#1A1423] p-4 sm:p-6 border border-[#ECE7DF] dark:border-[#312740] shadow-soft-card dark:shadow-dark-card hover:border-purple-400/40 dark:hover:border-purple-500/40 transition-all duration-300"
                >
                  {/* Author Header */}
                  <div className="flex items-start sm:items-center justify-between gap-2.5 mb-3.5">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-700 via-[#523F71] to-indigo-800 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs">
                        {(post.author ?? '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-[#2D253A] dark:text-[#F1ECF7] truncate">
                            {post.author}
                          </h4>
                          {post.role && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 shrink-0">
                              {post.role}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#80778B] dark:text-[#9E94AB] mt-0.5">
                          {post.time}
                        </p>
                      </div>
                    </div>

                    {/* Book Citation Pill */}
                    {post.book && (
                      <span className="text-[10.5px] sm:text-[11px] font-bold text-[#523F71] dark:text-[#FFDE88] bg-purple-500/10 dark:bg-purple-500/15 px-2.5 sm:px-3 py-1 rounded-full border border-purple-500/20 truncate max-w-[120px] sm:max-w-[200px] shrink-0">
                        {post.book}
                      </span>
                    )}
                  </div>

                  {/* Illuminated Quote Box */}
                  <div className="rounded-xl sm:rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border-l-4 border-amber-500 p-3.5 sm:p-4 relative overflow-hidden">
                    <Quote className="absolute top-2 right-2 w-8 h-8 text-amber-500/15 pointer-events-none" />
                    <p className="font-serif italic text-sm sm:text-[15px] leading-relaxed text-amber-950 dark:text-amber-100">
                      “{post.quote}”
                    </p>
                    {post.chapter && (
                      <div className="mt-2 text-right">
                        <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300/80 bg-amber-500/15 px-2 py-0.5 rounded-full">
                          {post.chapter}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reflection Content */}
                  <p className="text-xs sm:text-sm leading-relaxed text-[#2D253A] dark:text-[#E2D4F3] mt-3">
                    {post.reflection}
                  </p>

                  {/* Interactive Action Bar */}
                  <div className="mt-4 pt-3 border-t border-[#ECE7DF] dark:border-[#312740] flex flex-wrap items-center justify-between gap-2 text-xs text-[#80778B] dark:text-[#9E94AB]">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Echo Button */}
                      <button
                        onClick={() => echoMutation.mutate(post.id)}
                        disabled={echoMutation.isPending}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-semibold hover:bg-amber-500/10 hover:text-amber-600 transition-all active:scale-95 disabled:opacity-60"
                      >
                        <Heart className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                        <span>Echo ({post.echoCount})</span>
                      </button>

                      {/* Reply counter */}
                      <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-semibold hover:bg-stone-100 dark:hover:bg-[#251D30] transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.replyCount} Reflections</span>
                      </button>
                    </div>

                    {/* Copy Quote Button */}
                    <button
                      onClick={() => copyQuote(post.quote, post.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold hover:bg-stone-100 dark:hover:bg-[#251D30] transition-colors"
                      title="Copy Quote passage"
                    >
                      {copiedQuoteId === post.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Quote className="w-3.5 h-3.5" />
                          <span>Copy Quote</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Community Sidebar & Active Sanctums */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Active Reading Sanctums Widget */}
          <div className="rounded-3xl bg-white dark:bg-[#1A1423] p-5 sm:p-6 border border-[#ECE7DF] dark:border-[#312740] shadow-soft-card dark:shadow-dark-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#523F71] dark:text-[#FFDE88]" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#2D253A] dark:text-[#F1ECF7]">
                  Active Reading Circles
                </h3>
              </div>
              {features.circles && (
                <button
                  onClick={() => navigate('/circles')}
                  className="text-xs font-bold text-[#523F71] dark:text-[#FFDE88] hover:underline"
                >
                  View All
                </button>
              )}
            </div>

            {circles.length === 0 ? (
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#150F1E] text-center space-y-1 text-xs text-[#80778B]">
                <p>No active reading circles yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {circles.slice(0, 4).map((circle) => (
                  <div
                    key={circle.id}
                    onClick={() => features.circles && navigate(`/circles/${circle.id}`)}
                    className="p-3.5 rounded-2xl bg-stone-50/70 dark:bg-[#150F1E] border border-stone-200/50 dark:border-[#2F243E] hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300">
                        {circle.tag}
                      </span>
                      {circle.activeNow > 0 && (
                        <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {circle.activeNow} reading
                        </span>
                      )}
                    </div>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-[#2D253A] dark:text-[#F1ECF7] group-hover:text-[#523F71] dark:group-hover:text-[#FFDE88] transition-colors truncate">
                      {circle.name}
                    </h4>
                    {circle.focusTitle && (
                      <p className="text-[11px] text-[#80778B] dark:text-[#9E94AB] truncate mt-0.5">
                        📖 {circle.focusTitle}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Archivist's Codex Tip Widget */}
          <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-amber-500/10 dark:from-purple-950/30 dark:to-amber-950/20 p-5 sm:p-6 border border-purple-500/20 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#523F71] dark:text-[#FFDE88] uppercase tracking-wider">
              <ScrollText className="w-4 h-4" />
              <span>The Code of the Scribes</span>
            </div>
            <p className="text-xs text-[#523F71] dark:text-[#CBC0D8] leading-relaxed">
              When inscribing marginalia, cite the chapter and passage thoughtfully. Living marginalia guides future scholars along the path of wisdom.
            </p>
          </div>
        </div>
      </div>

      {/* Inscribe Reflection Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setShowShareModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1A1423] rounded-3xl p-6 shadow-2xl border border-[#ECE7DF] dark:border-[#352B44] space-y-4 z-10 animate-scale-dialog">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Quote className="w-5 h-5 text-amber-500" />
                <h3 className="font-serif font-bold text-lg text-[#2D253A] dark:text-[#F1ECF7]">
                  Inscribe Communal Marginalia
                </h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-xl text-[#80778B] hover:text-[#2D253A] dark:hover:text-[#F1ECF7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#80778B] dark:text-[#9E94AB]">
              Share an illuminating excerpt and your scholarly commentary with the entire Arcanium realm.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                value={newReflectionBook}
                onChange={e => setNewReflectionBook(e.target.value)}
                placeholder="Book Title (e.g. Meditations of Marcus Aurelius)"
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-[#FAF8F5] dark:bg-[#150F1E] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D253A] dark:text-[#F1ECF7] focus:outline-none"
              />
              <textarea
                value={newReflectionQuote}
                onChange={e => setNewReflectionQuote(e.target.value)}
                placeholder="Sacred passage or excerpt quote…"
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl text-xs font-serif italic bg-[#FAF8F5] dark:bg-[#150F1E] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D253A] dark:text-[#F1ECF7] focus:outline-none resize-none"
              />
              <textarea
                value={newReflectionText}
                onChange={e => setNewReflectionText(e.target.value)}
                placeholder="Your reflection and marginalia notes…"
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-[#FAF8F5] dark:bg-[#150F1E] border border-[#ECE7DF] dark:border-[#352B44] text-[#2D253A] dark:text-[#F1ECF7] focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#80778B]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setNewReflectionQuote('');
                  setNewReflectionText('');
                  setNewReflectionBook('');
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#523F71] hover:bg-[#433258] text-white shadow-sm"
              >
                Publish Reflection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
