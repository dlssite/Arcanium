
/**
 * ChapterManager
 *
 * Full chapter management UI for a single creator work.
 * Route: /creator/works/:contentId/chapters
 *
 * Features:
 *  - Lists all chapters (drafts + published) via useCreatorChapters
 *  - Inline textarea editor for body text with save
 *  - Publish draft → live button
 *  - Delete draft chapter with confirmation
 *  - "Add Chapter" panel that opens an inline editor for a new chapter
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Save, Send, Trash2, Loader2,
  BookOpen, Eye, EyeOff, AlertCircle, RefreshCw, FileText,
} from 'lucide-react';
import { useCreatorChapters } from '../hooks/useCreatorChapters';
import { useCreatorWorks } from '../hooks/useCreatorWorks';
import type { CreatorChapterSummary } from '@arcanium/types';

// ---------------------------------------------------------------------------
// Add / Edit chapter inline panel
// ---------------------------------------------------------------------------

interface ChapterEditorProps {
  contentId:   string;
  chapter?:    CreatorChapterSummary;   // undefined = create mode
  nextNumber?: number;
  onDone:      () => void;
}

function ChapterEditor({ contentId, chapter, nextNumber = 1, onDone }: ChapterEditorProps) {
  const isEdit = Boolean(chapter);
  const { createAsync, isCreating, updateAsync, isUpdating } = useCreatorChapters(contentId);

  const [title,    setTitle]    = useState(chapter?.title ?? '');
  const [body,     setBody]     = useState('');
  const [isDraft,  setIsDraft]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const wordCount = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const isBusy    = isCreating || isUpdating;

  async function handleSave() {
    if (!body.trim() && !isEdit) { setError('Body text is required.'); return; }
    setError(null);
    try {
      if (isEdit && chapter) {
        const res = await updateAsync({ chapterId: chapter.id, body: { title: title || undefined, bodyText: body || undefined } });
        if (res.error) { setError(res.error.message); return; }
      } else {
        const res = await createAsync({ number: nextNumber, title: title || undefined, bodyText: body, isDraft });
        if (res.error) { setError(res.error.message); return; }
      }
      onDone();
    } catch (e: unknown) { setError((e as Error).message); }
  }

  return (
    <div className="bg-white dark:bg-[#1D1726] rounded-2xl border border-[#EFEAE2] dark:border-[#352B44] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[#2D223B] dark:text-[#F1ECF7]">
          {isEdit ? `Edit Chapter ${chapter?.number}` : `New Chapter ${nextNumber}`}
        </h3>
        <button onClick={onDone} className="text-xs text-[#80778B] dark:text-[#9F94AC] hover:text-[#43335A] dark:hover:text-[#C5BACF] transition-colors">
          Cancel
        </button>
      </div>

      <input
        className="w-full rounded-xl border border-[#EFEAE2] dark:border-[#352B44] bg-[#FAF8F5] dark:bg-[#120E18] text-sm text-[#2D223B] dark:text-[#F1ECF7] placeholder:text-[#A59DB0] px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#43335A]/30 dark:focus:ring-[#684C8B]/40 transition-all"
        placeholder="Chapter title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={300}
      />

      <div className="relative">
        <textarea
          className="w-full h-64 rounded-xl border border-[#EFEAE2] dark:border-[#352B44] bg-[#FAF8F5] dark:bg-[#120E18] text-sm text-[#2D223B] dark:text-[#F1ECF7] placeholder:text-[#A59DB0] px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#43335A]/30 dark:focus:ring-[#684C8B]/40 transition-all font-serif resize-y leading-relaxed"
          placeholder="Start writing your chapter here…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <span className="absolute bottom-2.5 right-3 text-[10px] font-mono text-[#A59DB0] dark:text-[#5A5268] pointer-events-none">
          {wordCount.toLocaleString()} words
        </span>
      </div>

      {!isEdit && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            onClick={() => setIsDraft((d) => !d)}
            className={`w-9 h-5 rounded-full border transition-all flex items-center px-0.5 ${isDraft ? 'bg-[#EFEAE2] dark:bg-[#2C2138] border-[#EFEAE2] dark:border-[#352B44]' : 'bg-[#43335A] dark:bg-[#684C8B] border-[#43335A] dark:border-[#684C8B]'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isDraft ? 'translate-x-0' : 'translate-x-4'}`} />
          </div>
          <span className="text-xs text-[#564D62] dark:text-[#C5BACF]">
            {isDraft ? 'Save as draft' : 'Publish immediately'}
          </span>
        </label>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={isBusy || (!body.trim() && !isEdit)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#43335A] dark:bg-[#684C8B] hover:bg-[#342647] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isEdit ? 'Save Changes' : isDraft ? 'Save Draft' : 'Publish'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chapter row
// ---------------------------------------------------------------------------

interface ChapterRowProps {
  chapter:       CreatorChapterSummary;
  contentId:     string;
  onEdit:        (ch: CreatorChapterSummary) => void;
}

function ChapterRow({ chapter, contentId, onEdit }: ChapterRowProps) {
  const { publishChapter, isPublishing, deleteChapter, isDeleting } = useCreatorChapters(contentId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${chapter.isDraft ? 'bg-[#FAF8F5] dark:bg-[#18132A] border-[#EFEAE2] dark:border-[#2C2138]' : 'bg-white dark:bg-[#1D1726] border-[#EFEAE2] dark:border-[#352B44]'}`}>
      {/* Chapter number */}
      <div className="w-8 h-8 rounded-lg bg-[#F2EDFA] dark:bg-[#2C213B] border border-[#E3D9F2] dark:border-[#43345A] flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-[#43335A] dark:text-[#C5BACF]">{chapter.number}</span>
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#2D223B] dark:text-[#F1ECF7] truncate">
          {chapter.title ?? `Chapter ${chapter.number}`}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[#80778B] dark:text-[#9F94AC]">
            {chapter.wordCount.toLocaleString()} words
          </span>
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${chapter.isDraft ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'}`}>
            {chapter.isDraft ? 'Draft' : 'Published'}
          </span>
          {chapter.publishedAt && (
            <span className="text-[10px] text-[#80778B] dark:text-[#9F94AC]">
              {new Date(chapter.publishedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onEdit(chapter)}
          title="Edit chapter"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#80778B] dark:text-[#9F94AC] hover:bg-[#F2EDFA] dark:hover:bg-[#2C213B] hover:text-[#43335A] dark:hover:text-[#C5BACF] active:scale-95 transition-all"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>

        {chapter.isDraft && (
          <button
            onClick={() => publishChapter(chapter.id)}
            disabled={isPublishing}
            title="Publish chapter"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 active:scale-95 transition-all disabled:opacity-50"
          >
            {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        )}

        {!chapter.isPublished && (
          confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => deleteChapter(chapter.id)} disabled={isDeleting} className="text-[10px] font-bold text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                {isDeleting ? '…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-[#80778B] px-1 py-1 hover:underline">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete draft"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChapterManager — main page component
// ---------------------------------------------------------------------------

export default function ChapterManager() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate      = useNavigate();

  const { chapters, isLoading, isError, publishedCount, draftCount } =
    useCreatorChapters(contentId ?? '');
  const { works } = useCreatorWorks();

  const work = works.find((w) => w.id === contentId);

  const [showAddEditor,  setShowAddEditor]  = useState(false);
  const [editingChapter, setEditingChapter] = useState<CreatorChapterSummary | null>(null);

  const nextNumber = (chapters[chapters.length - 1]?.number ?? 0) + 1;

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-5 sm:px-6 lg:px-0 w-full">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/creator/works')}
          className="w-9 h-9 rounded-xl bg-white dark:bg-[#1D1726] border border-[#EFEAE2] dark:border-[#352B44] flex items-center justify-center text-[#80778B] dark:text-[#9F94AC] hover:text-[#43335A] dark:hover:text-[#C5BACF] active:scale-95 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-serif font-bold text-[#2D223B] dark:text-[#F1ECF7] truncate">
            {work?.title ?? 'Chapters'}
          </h1>
          <p className="text-[11px] text-[#80778B] dark:text-[#9F94AC]">
            {publishedCount} published · {draftCount} draft
          </p>
        </div>
        <button
          onClick={() => { setEditingChapter(null); setShowAddEditor(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#43335A] dark:bg-[#684C8B] hover:bg-[#342647] active:scale-95 transition-all shadow-sm flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add Chapter
        </button>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total', value: chapters.length },
          { label: 'Published', value: publishedCount },
          { label: 'Drafts', value: draftCount },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-2.5 bg-white dark:bg-[#1D1726] rounded-xl border border-[#EFEAE2] dark:border-[#352B44]">
            <span className="text-lg font-bold font-serif text-[#2D223B] dark:text-[#F1ECF7]">{s.value}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#80778B] dark:text-[#9F94AC]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Add / edit inline editor */}
      {(showAddEditor || editingChapter) && (
        <div className="mb-5">
          <ChapterEditor
            contentId={contentId ?? ''}
            nextNumber={nextNumber}
            onDone={() => { setShowAddEditor(false); setEditingChapter(null); }}
            {...(editingChapter ? { chapter: editingChapter } : {})}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#43335A] dark:text-[#9B7BBF]" />
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-[#80778B] dark:text-[#9F94AC]">Could not load chapters.</p>
          <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 text-xs font-semibold text-[#43335A] dark:text-[#C5BACF] hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && chapters.length === 0 && !showAddEditor && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F2EDFA] dark:bg-[#2C213B] border border-[#E3D9F2] dark:border-[#43345A] flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[#9B7BBF] dark:text-[#7A5CA0]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2D223B] dark:text-[#F1ECF7]">No chapters yet</h3>
            <p className="text-xs text-[#80778B] dark:text-[#9F94AC] mt-0.5">Write your first chapter to begin serialising.</p>
          </div>
          <button onClick={() => setShowAddEditor(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#43335A] dark:bg-[#684C8B] hover:bg-[#342647] active:scale-95 transition-all">
            <Plus className="w-3.5 h-3.5" /> Write first chapter
          </button>
        </div>
      )}

      {/* Chapter list */}
      {!isLoading && !isError && chapters.length > 0 && (
        <div className="space-y-2">
          {/* Published section */}
          {publishedCount > 0 && (
            <>
              <div className="flex items-center gap-2 mb-1 mt-2">
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#80778B] dark:text-[#9F94AC]">Published</span>
              </div>
              {chapters.filter((c) => c.isPublished).map((ch) => (
                <ChapterRow key={ch.id} chapter={ch} contentId={contentId ?? ''} onEdit={(c) => { setShowAddEditor(false); setEditingChapter(c); }} />
              ))}
            </>
          )}
          {/* Drafts section */}
          {draftCount > 0 && (
            <>
              <div className="flex items-center gap-2 mb-1 mt-4">
                <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#80778B] dark:text-[#9F94AC]">Drafts</span>
              </div>
              {chapters.filter((c) => c.isDraft).map((ch) => (
                <ChapterRow key={ch.id} chapter={ch} contentId={contentId ?? ''} onEdit={(c) => { setShowAddEditor(false); setEditingChapter(c); }} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
