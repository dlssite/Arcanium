
/**
 * CreateWorkModal — form to create a new serialised work.
 * Fields: title, type (enum), synopsis, cover image URL, genres (multi-select pills).
 * Submits via useCreatorWorks.createAsync → POST /api/v1/creator.
 */
import React, { useState } from 'react';
import { X, BookOpen, Loader2, AlertCircle, ImageIcon } from 'lucide-react';
import { useCreatorWorks } from '../hooks/useCreatorWorks';
import { useCategoriesQuery } from '../../../hooks/useCategoriesQuery';

const CONTENT_TYPES = [
  { value: 'WEB_NOVEL',    label: 'Web Novel' },
  { value: 'LIGHT_NOVEL',  label: 'Light Novel' },
  { value: 'EBOOK',        label: 'E-Book' },
  { value: 'COMIC',        label: 'Comic' },
  { value: 'MANGA',        label: 'Manga' },
  { value: 'WEBTOON',      label: 'Webtoon' },
] as const;

// Genre options are removed — fetched from the API via useCategoriesQuery

interface CreateWorkModalProps {
  isOpen:  boolean;
  onClose: () => void;
  onCreated?: (contentId: string, slug: string) => void;
}

const inputCls = 'w-full rounded-xl border border-[#EFEAE2] dark:border-[#352B44] bg-white dark:bg-[#1D1726] text-sm text-[#2D223B] dark:text-[#F1ECF7] placeholder:text-[#A59DB0] dark:placeholder:text-[#5A5268] px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#43335A]/30 dark:focus:ring-[#684C8B]/40 focus:border-[#43335A] dark:focus:border-[#684C8B] transition-all';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-[#564D62] dark:text-[#C5BACF] mb-1.5">
      {children}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

export default function CreateWorkModal({ isOpen, onClose, onCreated }: CreateWorkModalProps) {
  const { createAsync, isCreating, createError } = useCreatorWorks();
  const { data: categories = [], isLoading: genresLoading } = useCategoriesQuery();

  const [title,        setTitle]        = useState('');
  const [type,         setType]         = useState<string>('WEB_NOVEL');
  const [synopsis,     setSynopsis]     = useState('');
  const [coverUrl,     setCoverUrl]     = useState('');
  const [genres,       setGenres]       = useState<string[]>([]);
  const [fieldError,   setFieldError]   = useState<string | null>(null);

  if (!isOpen) return null;

  function toggleGenre(genre: string) {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((x) => x !== genre) : prev.length < 5 ? [...prev, genre] : prev,
    );
  }

  function validate(): string | null {
    if (!title.trim())           return 'Title is required.';
    if (title.trim().length > 300) return 'Title must be 300 characters or fewer.';
    if (coverUrl.trim() && !/^https?:\/\/.+/.test(coverUrl.trim()))
      return 'Cover URL must start with http:// or https://.';
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setFieldError(err); return; }
    setFieldError(null);
    try {
      const res = await createAsync({
        title: title.trim(),
        type: type as import('@arcanium/types').ContentType,
        language: 'en',
        synopsis: synopsis.trim() || undefined,
        coverImageUrl: coverUrl.trim() || undefined,
        genres,
      });
      if (res.error) { setFieldError(res.error.message); return; }
      handleClose();
      if (res.data) onCreated?.(res.data.id, res.data.slug);
    } catch (e: unknown) {
      setFieldError((e as Error).message ?? 'Failed to create work.');
    }
  }

  function handleClose() {
    setTitle(''); setType('WEB_NOVEL'); setSynopsis('');
    setCoverUrl(''); setGenres([]); setFieldError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="New Work">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
      <div className="relative z-10 w-full sm:max-w-lg bg-[#FAF8F5] dark:bg-[#18132A] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#EFEAE2] dark:border-[#352B44] flex flex-col max-h-[92dvh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#EFEAE2] dark:border-[#2C2138] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F2EDFA] dark:bg-[#2C213B] border border-[#E3D9F2] dark:border-[#43345A] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#43335A] dark:text-[#C5BACF]" />
            </div>
            <h2 className="text-base font-serif font-bold text-[#2D223B] dark:text-[#F1ECF7]">New Work</h2>
          </div>
          <button onClick={handleClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center text-[#80778B] dark:text-[#9F94AC] hover:bg-[#EFEAE2] dark:hover:bg-[#2C2138] active:scale-95 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 no-scrollbar">
          <div>
            <FieldLabel required>Title</FieldLabel>
            <input className={inputCls} placeholder="e.g. The Obsidian Archive" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} />
          </div>

          <div>
            <FieldLabel required>Content type</FieldLabel>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
              {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel>Synopsis <span className="text-[#A59DB0] font-normal">(optional)</span></FieldLabel>
            <textarea className={`${inputCls} resize-none`} rows={4} placeholder="Brief description readers will see…" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} maxLength={2000} />
          </div>

          <div>
            <FieldLabel>Cover image URL <span className="text-[#A59DB0] font-normal">(optional)</span></FieldLabel>
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} placeholder="https://…" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} type="url" />
              {coverUrl && /^https?:\/\/.+/.test(coverUrl) && (
                <div className="w-12 h-12 rounded-xl border border-[#EFEAE2] dark:border-[#352B44] overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-[#2A2136]">
                  <img src={coverUrl} alt="cover preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              {(!coverUrl || !/^https?:\/\/.+/.test(coverUrl)) && (
                <div className="w-12 h-12 rounded-xl border border-dashed border-[#EFEAE2] dark:border-[#352B44] flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-5 h-5 text-[#C5BACF] dark:text-[#5A5268]" />
                </div>
              )}
            </div>
          </div>

          <div>
            <FieldLabel>Genres <span className="text-[#A59DB0] font-normal">(up to 5)</span></FieldLabel>
            {genresLoading ? (
              <div className="flex gap-2 mt-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-7 w-20 rounded-lg bg-stone-100 dark:bg-[#2A2136] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {categories.map((cat) => {
                  const sel = genres.includes(cat.genre);
                  return (
                    <button key={cat.id} type="button" onClick={() => toggleGenre(cat.genre)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 ${sel ? 'bg-[#43335A] dark:bg-[#684C8B] text-white border-transparent' : 'bg-white dark:bg-[#1D1726] text-[#564D62] dark:text-[#C5BACF] border-[#EFEAE2] dark:border-[#352B44] hover:border-[#C5BACF]'}`}>
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {(fieldError || createError) && (
            <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {fieldError ?? createError?.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-3 border-t border-[#EFEAE2] dark:border-[#2C2138] flex-shrink-0">
          <button onClick={handleClose} disabled={isCreating} className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#564D62] dark:text-[#C5BACF] bg-[#EFEAE2] dark:bg-[#2C2138] hover:bg-[#E8E1D5] dark:hover:bg-[#352844] active:scale-95 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isCreating || !title.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#43335A] dark:bg-[#684C8B] hover:bg-[#342647] dark:hover:bg-[#563D75] active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
            {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : 'Create Work'}
          </button>
        </div>
      </div>
    </div>
  );
}
