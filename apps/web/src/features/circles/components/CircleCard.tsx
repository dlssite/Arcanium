import React from 'react';
import { Users, BookOpen, Lock, ShieldCheck, Crown, Sparkles, ArrowRight, Flame } from 'lucide-react';
import type { CircleSummary } from '@arcanium/types';

interface CircleCardProps {
  circle: CircleSummary;
  onClick?: () => void;
  /** Compact mode used in the featured strip on the Community page */
  compact?: boolean;
}

// Map color classes to ambient gradients and neon glow accents
const COLOR_CONFIG: Record<string, { gradient: string; tagBg: string; border: string; glow: string; bar: string }> = {
  'bg-purple-500':  { gradient: 'from-purple-600/25 via-purple-500/10 to-transparent', tagBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30', border: 'hover:border-purple-400/60 dark:hover:border-purple-400/50', glow: 'rgba(168,85,247,0.18)', bar: 'from-purple-600 via-fuchsia-500 to-indigo-600' },
  'bg-violet-500':  { gradient: 'from-violet-600/25 via-violet-500/10 to-transparent', tagBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30', border: 'hover:border-violet-400/60 dark:hover:border-violet-400/50', glow: 'rgba(139,92,246,0.18)', bar: 'from-violet-600 via-purple-500 to-indigo-600' },
  'bg-indigo-500':  { gradient: 'from-indigo-600/25 via-indigo-500/10 to-transparent', tagBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30', border: 'hover:border-indigo-400/60 dark:hover:border-indigo-400/50', glow: 'rgba(99,102,241,0.18)', bar: 'from-indigo-600 via-blue-500 to-purple-600' },
  'bg-blue-500':    { gradient: 'from-blue-600/25 via-blue-500/10 to-transparent', tagBg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30', border: 'hover:border-blue-400/60 dark:hover:border-blue-400/50', glow: 'rgba(59,130,246,0.18)', bar: 'from-blue-600 via-cyan-500 to-indigo-600' },
  'bg-cyan-500':    { gradient: 'from-cyan-600/25 via-cyan-500/10 to-transparent', tagBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30', border: 'hover:border-cyan-400/60 dark:hover:border-cyan-400/50', glow: 'rgba(6,182,212,0.18)', bar: 'from-cyan-600 via-teal-500 to-blue-600' },
  'bg-teal-500':    { gradient: 'from-teal-600/25 via-teal-500/10 to-transparent', tagBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30', border: 'hover:border-teal-400/60 dark:hover:border-teal-400/50', glow: 'rgba(20,184,166,0.18)', bar: 'from-teal-600 via-emerald-500 to-cyan-600' },
  'bg-emerald-500': { gradient: 'from-emerald-600/25 via-emerald-500/10 to-transparent', tagBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', border: 'hover:border-emerald-400/60 dark:hover:border-emerald-400/50', glow: 'rgba(16,185,129,0.18)', bar: 'from-emerald-600 via-teal-500 to-green-600' },
  'bg-amber-500':   { gradient: 'from-amber-600/25 via-amber-500/10 to-transparent', tagBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', border: 'hover:border-amber-400/60 dark:hover:border-amber-400/50', glow: 'rgba(245,158,11,0.18)', bar: 'from-amber-500 via-orange-500 to-yellow-500' },
  'bg-orange-500':  { gradient: 'from-orange-600/25 via-orange-500/10 to-transparent', tagBg: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30', border: 'hover:border-orange-400/60 dark:hover:border-orange-400/50', glow: 'rgba(249,115,22,0.18)', bar: 'from-orange-600 via-amber-500 to-red-600' },
  'bg-rose-500':    { gradient: 'from-rose-600/25 via-rose-500/10 to-transparent', tagBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30', border: 'hover:border-rose-400/60 dark:hover:border-rose-400/50', glow: 'rgba(244,63,94,0.18)', bar: 'from-rose-600 via-pink-500 to-red-600' },
  'bg-pink-500':    { gradient: 'from-pink-600/25 via-pink-500/10 to-transparent', tagBg: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30', border: 'hover:border-pink-400/60 dark:hover:border-pink-400/50', glow: 'rgba(236,72,153,0.18)', bar: 'from-pink-600 via-rose-500 to-purple-600' },
  'bg-fuchsia-500': { gradient: 'from-fuchsia-600/25 via-fuchsia-500/10 to-transparent', tagBg: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30', border: 'hover:border-fuchsia-400/60 dark:hover:border-fuchsia-400/50', glow: 'rgba(217,70,239,0.18)', bar: 'from-fuchsia-600 via-purple-500 to-pink-600' },
};

export default function CircleCard({ circle, onClick, compact = false }: CircleCardProps) {
  const isOwner    = circle.membership?.role === 'OWNER';
  const isMod      = circle.membership?.role === 'MODERATOR';
  const isMember   = !!circle.membership && circle.membership.status === 'ACTIVE';
  const isPending  = circle.membership?.status === 'PENDING';
  const isPrivate  = circle.visibility === 'PRIVATE';

  const cfg = COLOR_CONFIG[circle.coverColor] || COLOR_CONFIG['bg-purple-500']!;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`group relative flex-shrink-0 w-56 sm:w-60 text-left rounded-3xl bg-white/95 dark:bg-[#1A1424]/95 backdrop-blur-md border border-[#ECE7DF] dark:border-[#312740] p-4 sm:p-4.5 shadow-soft-card dark:shadow-dark-card ${cfg.border} hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between`}
        style={{
          boxShadow: '0 4px 20px -2px rgba(67, 50, 88, 0.06)',
        }}
      >
        {/* Top Illuminated Foil Accent */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${cfg.bar}`} />

        {/* Ambient Top Glow Orbs */}
        <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${cfg.gradient} blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500`} />

        {/* Top Header Strip */}
        <div className="flex items-center justify-between w-full mb-3 pt-1 relative z-10">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs truncate ${cfg.tagBg}`}>
              {circle.tag}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isPrivate && (
              <span title="Private Sanctum" className="p-1 rounded-lg bg-stone-100 dark:bg-[#251D30] text-[#80778B] dark:text-[#9E94AB] border border-stone-200/50 dark:border-stone-700/50">
                <Lock className="w-3 h-3" />
              </span>
            )}
            {circle.activeNow > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {circle.activeNow}
              </span>
            )}
          </div>
        </div>

        {/* Title & Active Session / Description */}
        <div className="relative z-10 mb-3.5">
          <h4 className="font-serif font-bold text-sm sm:text-base text-[#2D253A] dark:text-[#F1ECF7] group-hover:text-[#523F71] dark:group-hover:text-[#FFDE88] transition-colors line-clamp-2 leading-snug">
            {circle.name}
          </h4>
          {circle.activeSession?.bookTitle ? (
            <div className="mt-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 px-2.5 py-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-[11px] font-serif font-bold text-amber-900 dark:text-amber-200 truncate">
                {circle.activeSession.bookTitle}
              </p>
            </div>
          ) : circle.description ? (
            <p className="text-[11px] text-[#80778B] dark:text-[#9E94AB] line-clamp-1 mt-1.5 leading-relaxed">
              {circle.description}
            </p>
          ) : null}
        </div>

        {/* Footer Meta Bar */}
        <div className="relative z-10 pt-3 border-t border-[#ECE7DF]/80 dark:border-[#312740] flex items-center justify-between text-[11px] text-[#80778B] dark:text-[#9E94AB]">
          <span className="flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5 text-[#523F71] dark:text-[#FFDE88]" />
            {circle.memberCount.toLocaleString()} scholars
          </span>
          <span className="font-bold text-xs text-[#523F71] dark:text-[#FFDE88] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
            Enter <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className={`group relative text-left rounded-3xl bg-white/95 dark:bg-[#1A1423]/95 backdrop-blur-md border border-[#ECE7DF] dark:border-[#312740] shadow-soft-card dark:shadow-dark-card ${cfg.border} hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#523F71] dark:focus:ring-[#FFDE88]`}
      style={{
        boxShadow: '0 4px 24px -2px rgba(67, 50, 88, 0.07), 0 2px 8px -1px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Decorative Gradient Top Header */}
      <div className={`h-3 w-full bg-gradient-to-r ${cfg.bar} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
      </div>

      {/* Luminous Ambient Background Glow */}
      <div className={`absolute top-0 right-0 w-48 h-48 rounded-full bg-gradient-to-br ${cfg.gradient} blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500`} />

      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between relative z-10">
        <div>
          {/* Header row: Tag + Privacy + Live Reading Beacon + Role */}
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-2xs ${cfg.tagBg}`}>
                {circle.tag}
              </span>
              {isPrivate && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-[#251D30] text-[#80778B] dark:text-[#9E94AB] border border-stone-200/60 dark:border-stone-700/40">
                  <Lock className="w-3 h-3" />
                  Private Sanctum
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {circle.activeNow > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  {circle.activeNow} reading now
                </span>
              )}

              {isOwner && (
                <span title="Circle Founder" className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  <Crown className="w-3 h-3 fill-current" />
                  Founder
                </span>
              )}
              {isMod && (
                <span title="Circle Moderator" className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                  <ShieldCheck className="w-3 h-3" />
                  Mod
                </span>
              )}
              {isMember && !isOwner && !isMod && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                  Joined
                </span>
              )}
            </div>
          </div>

          {/* Circle Title */}
          <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2D253A] dark:text-[#F1ECF7] group-hover:text-[#523F71] dark:group-hover:text-[#FFDE88] transition-colors leading-snug mb-2">
            {circle.name}
          </h3>

          {/* Description */}
          {circle.description && (
            <p className="text-xs sm:text-[13px] text-[#80778B] dark:text-[#9E94AB] line-clamp-2 leading-relaxed mb-4">
              {circle.description}
            </p>
          )}

          {/* Active Reading Session Capsule */}
          {circle.activeSession?.bookTitle && (
            <div className="mb-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-purple-500/10 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-purple-950/20 border border-amber-500/30 p-3.5 flex items-center gap-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-500 fill-current" />
                  Active Reading Session
                </div>
                <p className="text-xs font-serif font-bold text-amber-950 dark:text-amber-100 truncate mt-0.5">
                  {circle.activeSession.bookTitle}
                </p>
                {circle.activeSession.chapterHint && (
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-200/80 truncate">
                    {circle.activeSession.chapterHint}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info & CTA */}
        <div className="mt-2 pt-4 border-t border-[#ECE7DF] dark:border-[#312740] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-[#80778B] dark:text-[#9E94AB]">
            <div className="flex -space-x-2 overflow-hidden">
              <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#1A1423] bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shadow-xs">
                {circle.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#1A1423] bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-[9px] font-bold text-white shadow-xs">
                {circle.tag.replace('#', '').slice(0, 1).toUpperCase()}
              </div>
            </div>
            <span className="font-semibold text-[11px] sm:text-xs">
              {circle.memberCount.toLocaleString()} {circle.memberCount === 1 ? 'Scholar' : 'Scholars'}
            </span>
          </div>

          <div>
            {isMember ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#523F71] dark:text-[#FFDE88] group-hover:translate-x-1 transition-transform">
                Enter Sanctum <ArrowRight className="w-3.5 h-3.5" />
              </span>
            ) : isPending ? (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Pending Approval…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#523F71] dark:text-[#D1BEE6] group-hover:text-[#43335A] dark:group-hover:text-[#FFDE88] group-hover:translate-x-1 transition-all">
                {isPrivate ? 'Request Admission' : 'Join Guild'} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
