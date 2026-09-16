import React from 'react';
import { Users, BookOpen, Lock } from 'lucide-react';
import type { CircleSummary } from '@arcanium/types';

interface CircleCardProps {
  circle: CircleSummary;
  onClick?: () => void;
  /** Compact mode used in the featured strip on the Community page */
  compact?: boolean;
}

export default function CircleCard({ circle, onClick, compact = false }: CircleCardProps) {
  const isOwner    = circle.membership?.role === 'OWNER';
  const isMod      = circle.membership?.role === 'MODERATOR';
  const isMember   = !!circle.membership && circle.membership.status === 'ACTIVE';
  const isPending  = circle.membership?.status === 'PENDING';
  const isPrivate  = circle.visibility === 'PRIVATE';

  const memberLabel = isOwner ? 'Owner' : isMod ? 'Mod' : isMember ? 'Member' : isPending ? 'Pending' : null;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex-shrink-0 w-44 bg-white dark:bg-[#1D1726] rounded-2xl p-3.5 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs hover:shadow-md transition-all text-left group active:scale-95"
      >
        {/* Color bar */}
        <div className={`h-1 w-8 rounded-full mb-2.5 ${circle.coverColor}`} />

        <div className="flex items-start justify-between gap-1 mb-1">
          <span className="text-[10px] font-bold bg-[#F2EDFA] dark:bg-[#2C213B] text-[#554271] dark:text-[#D1BEE6] px-2 py-0.5 rounded-full truncate max-w-[70%]">
            {circle.tag}
          </span>
          {isPrivate && <Lock className="w-3 h-3 text-[#9A8FA7] dark:text-[#6D6282] shrink-0 mt-0.5" />}
        </div>

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
              {circle.activeNow} now
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-[#1D1726] rounded-2xl p-4 border border-[#ECE7DF] dark:border-[#352B44] shadow-xs hover:shadow-md transition-all text-left group active:scale-[0.99]"
    >
      {/* Top row: tag + privacy + member badge */}
      <div className="flex items-center justify-between text-[11px] mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-bold bg-[#F2EDFA] dark:bg-[#2C213B] text-[#554271] dark:text-[#D1BEE6] px-2.5 py-0.5 rounded-full">
            {circle.tag}
          </span>
          {isPrivate && (
            <span className="flex items-center gap-0.5 text-[#9A8FA7] dark:text-[#6D6282]">
              <Lock className="w-3 h-3" />
              <span className="text-[10px]">Private</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {circle.activeNow > 0 && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {circle.activeNow} reading now
            </span>
          )}
          {memberLabel && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-semibold">
              {memberLabel}
            </span>
          )}
        </div>
      </div>

      {/* Name + description */}
      <h4 className="font-serif font-bold text-sm text-[#2D223B] dark:text-[#F1ECF7] group-hover:text-[#43335A] dark:group-hover:text-[#FFDE88] transition-colors leading-snug">
        {circle.name}
      </h4>

      {circle.description && (
        <p className="text-xs text-[#80778B] dark:text-[#9F94AC] mt-1 line-clamp-2">
          {circle.description}
        </p>
      )}

      {/* Active session pill */}
      {circle.activeSession?.bookTitle && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-500/20 rounded-xl px-2.5 py-1.5">
          <BookOpen className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-amber-700 dark:text-amber-300 font-medium truncate">
            Reading: {circle.activeSession.bookTitle}
            {circle.activeSession.chapterHint && ` · ${circle.activeSession.chapterHint}`}
          </span>
        </div>
      )}

      {/* Footer: members + join hint */}
      <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-[#2F243E] flex items-center justify-between text-xs text-[#80778B] dark:text-[#9F94AC]">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {circle.memberCount.toLocaleString()} Scholars
        </span>
        {!isMember && !isPending && (
          <span className="font-semibold text-[#43335A] dark:text-[#D1BEE6] group-hover:underline">
            {isPrivate ? 'Request to join →' : 'Join Circle →'}
          </span>
        )}
        {isPending && (
          <span className="text-amber-600 dark:text-amber-400 font-medium">Request pending…</span>
        )}
      </div>
    </button>
  );
}
