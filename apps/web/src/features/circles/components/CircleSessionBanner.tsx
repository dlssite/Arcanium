import React, { useState } from 'react';
import { BookOpen, StopCircle, Play, Loader2 } from 'lucide-react';
import type { CircleSession } from '@arcanium/types';
import { useStartSession, useEndSession } from '../useCirclesQuery';

interface CircleSessionBannerProps {
  circleId:   string;
  session:    CircleSession | null;
  canManage:  boolean; // true if user is OWNER or MODERATOR
}

export default function CircleSessionBanner({
  circleId,
  session,
  canManage,
}: CircleSessionBannerProps) {
  const startSession = useStartSession(circleId);
  const endSession   = useEndSession(circleId);

  const [showForm,    setShowForm]    = useState(false);
  const [bookTitle,   setBookTitle]   = useState('');
  const [chapterHint, setChapterHint] = useState('');

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    await startSession.mutateAsync({ bookTitle: bookTitle || undefined, chapterHint: chapterHint || undefined });
    setShowForm(false);
    setBookTitle('');
    setChapterHint('');
  }

  async function handleEnd() {
    await endSession.mutateAsync();
  }

  if (!session && !canManage) return null;

  return (
    <div className="rounded-2xl border border-amber-200/60 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
      {session ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 mb-0.5">
                Active Reading Session
              </p>
              <p className="font-serif font-bold text-sm text-amber-800 dark:text-amber-200 leading-snug truncate">
                {session.bookTitle ?? 'Open Session'}
              </p>
              {session.chapterHint && (
                <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-0.5 truncate">
                  {session.chapterHint}
                </p>
              )}
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowForm(true)}
                className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 hover:underline px-2 py-1"
              >
                New
              </button>
              <button
                onClick={handleEnd}
                disabled={endSession.isPending}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-colors disabled:opacity-50"
              >
                {endSession.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <StopCircle className="w-3.5 h-3.5" />
                }
                End
              </button>
            </div>
          )}
        </div>
      ) : canManage ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
            No active session — start one to focus the circle.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
          >
            <Play className="w-3.5 h-3.5" />
            Start Session
          </button>
        </div>
      ) : null}

      {/* Start session form */}
      {showForm && (
        <form onSubmit={handleStart} className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-500/20 space-y-2">
          <input
            type="text"
            value={bookTitle}
            onChange={e => setBookTitle(e.target.value)}
            placeholder="Book title (optional)"
            maxLength={200}
            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#1D1726] border border-amber-200 dark:border-amber-500/30 text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none"
          />
          <input
            type="text"
            value={chapterHint}
            onChange={e => setChapterHint(e.target.value)}
            placeholder="Chapter hint, e.g. Chapter 12 — The Descent (optional)"
            maxLength={200}
            className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#1D1726] border border-amber-200 dark:border-amber-500/30 text-[#2D223B] dark:text-[#F1ECF7] placeholder-[#9A8FA7] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl text-xs font-medium border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={startSession.isPending}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {startSession.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Start
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
