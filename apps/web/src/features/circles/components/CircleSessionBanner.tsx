import React, { useState } from 'react';
import { BookOpen, StopCircle, Play, Loader2, Sparkles, Flame, Plus, X } from 'lucide-react';
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
    await startSession.mutateAsync({
      bookTitle: bookTitle.trim() || undefined,
      chapterHint: chapterHint.trim() || undefined,
    });
    setShowForm(false);
    setBookTitle('');
    setChapterHint('');
  }

  async function handleEnd() {
    if (!window.confirm('Conclude the active reading session for all circle members?')) return;
    await endSession.mutateAsync();
  }

  if (!session && !canManage) return null;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 dark:border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-purple-500/10 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-purple-950/30 p-4 sm:p-5 shadow-sm">
      {session ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Pulsing Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 ring-2 ring-white dark:ring-[#1A1423]" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  <Flame className="w-3 h-3 text-amber-500 fill-current animate-pulse" />
                  Active Reading Session
                </span>
              </div>
              <h4 className="font-serif font-bold text-base sm:text-lg text-amber-950 dark:text-amber-100 truncate leading-snug">
                {session.bookTitle ?? 'Open Archival Study Session'}
              </h4>
              {session.chapterHint && (
                <p className="text-xs text-amber-800/80 dark:text-amber-200/80 truncate font-medium">
                  {session.chapterHint}
                </p>
              )}
            </div>
          </div>

          {/* Action controls */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {canManage && (
              <>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-500/30 text-amber-800 dark:text-amber-200 hover:bg-amber-500/10 transition-colors"
                >
                  Change Book
                </button>
                <button
                  onClick={handleEnd}
                  disabled={endSession.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-50 active:scale-95"
                >
                  {endSession.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <StopCircle className="w-3.5 h-3.5" />
                  )}
                  End Session
                </button>
              </>
            )}
          </div>
        </div>
      ) : canManage ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                No active session currently underway
              </p>
              <p className="text-[11px] text-amber-800/70 dark:text-amber-300/70">
                Start a reading session to synchronize chapter discussions with your scholars.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="self-start sm:self-center flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-[#523F71] hover:bg-[#433258] dark:bg-[#725499] text-white shadow-sm transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Session
          </button>
        </div>
      ) : null}

      {/* Start / Update Session Modal Form */}
      {showForm && (
        <div className="mt-4 pt-4 border-t border-amber-500/20 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
              {session ? 'Update Active Session' : 'Convene Reading Session'}
            </span>
            <button
              onClick={() => setShowForm(false)}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleStart} className="space-y-2.5">
            <input
              type="text"
              value={bookTitle}
              onChange={e => setBookTitle(e.target.value)}
              placeholder="Book title (e.g. The Grimoire of Elder Dreams)"
              maxLength={200}
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-[#1A1423] border border-amber-500/30 text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={chapterHint}
              onChange={e => setChapterHint(e.target.value)}
              placeholder="Chapter focus hint (e.g. Chapter 4 — The Alchemical Crucible)"
              maxLength={200}
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-[#1A1423] border border-amber-500/30 text-[#2D253A] dark:text-[#F1ECF7] placeholder-[#80778B] focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#80778B] dark:text-[#9E94AB] hover:bg-stone-200/50 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={startSession.isPending}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {startSession.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {session ? 'Update Session' : 'Commence Session'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
