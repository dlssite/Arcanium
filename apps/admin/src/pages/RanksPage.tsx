import React, { useState, useEffect } from 'react';
import {
  Trophy, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  ChevronUp, ChevronDown, Sparkles, Save, RotateCcw, Loader2,
} from 'lucide-react';
import { useRankManagement, useXpConfig, type AdminRankDefinition, type AdminRankInput, type XpConfig } from '../hooks/useRankManagement';
import { Card, CardHeader, Button, Input, Modal } from '../components/ui';

// ---------------------------------------------------------------------------
// Icon options available for ranks
// ---------------------------------------------------------------------------
const ICON_OPTIONS = [
  'Feather','BookOpen','Book','Search','Shield','Scroll',
  'Moon','Sparkles','Sun','Crown','Star','Flame','Award',
  'Zap','Globe','Lock','Eye','Heart',
];

// ---------------------------------------------------------------------------
// Colour options
// ---------------------------------------------------------------------------
const COLOR_OPTIONS = [
  { label: 'Stone',    value: 'text-stone-400'  },
  { label: 'Amber',    value: 'text-amber-500'  },
  { label: 'Lime',     value: 'text-lime-600'   },
  { label: 'Cyan',     value: 'text-cyan-500'   },
  { label: 'Blue',     value: 'text-blue-500'   },
  { label: 'Violet',   value: 'text-violet-500' },
  { label: 'Purple',   value: 'text-purple-500' },
  { label: 'Rose',     value: 'text-rose-500'   },
  { label: 'Orange',   value: 'text-orange-400' },
  { label: 'Yellow',   value: 'text-yellow-400' },
];

// ---------------------------------------------------------------------------
// Rank Form
// ---------------------------------------------------------------------------
interface RankFormProps {
  initial?:  Partial<AdminRankInput>;
  isEdit?:   boolean;
  onSave:    (data: AdminRankInput) => Promise<void>;
  onCancel:  () => void;
  saving:    boolean;
  error:     string | null;
}

function RankForm({ initial, isEdit, onSave, onCancel, saving, error }: RankFormProps) {
  const [level,       setLevel]       = useState(String(initial?.level       ?? ''));
  const [title,       setTitle]       = useState(initial?.title              ?? '');
  const [xpRequired,  setXpRequired]  = useState(String(initial?.xpRequired  ?? ''));
  const [icon,        setIcon]        = useState(initial?.icon               ?? 'Scroll');
  const [colorClass,  setColorClass]  = useState(initial?.colorClass         ?? 'text-stone-500');
  const [description, setDescription] = useState(initial?.description        ?? '');
  const [enabled,     setEnabled]     = useState(initial?.enabled             ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      level:       Number(level),
      title:       title.trim(),
      xpRequired:  Number(xpRequired),
      icon,
      colorClass,
      description: description.trim() || undefined,
      enabled,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
            Level <span className="text-rose-500">*</span>
          </label>
          <Input type="number" min={1} max={100} value={level}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLevel(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
            XP Required <span className="text-rose-500">*</span>
          </label>
          <Input type="number" min={0} value={xpRequired}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setXpRequired(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
          Title <span className="text-rose-500">*</span>
        </label>
        <Input placeholder="e.g. Eternal Archivist" value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          maxLength={80} required />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
          Description
        </label>
        <Input placeholder="Short flavour text…" value={description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
          maxLength={300} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">Icon</label>
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs bg-[#FAF7F2] dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D] text-[#2D253A] dark:text-[#F3EFFC] focus:outline-none"
          >
            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">Colour</label>
          <select
            value={colorClass}
            onChange={(e) => setColorClass(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs bg-[#FAF7F2] dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D] text-[#2D253A] dark:text-[#F3EFFC] focus:outline-none"
          >
            {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <button type="button" onClick={() => setEnabled((v: boolean) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
            enabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-[#FAF7F2] dark:bg-[#1A1528] border-[#E8E2D8] dark:border-[#2A223D] text-[#9E94AB]'
          }`}>
          {enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {enabled ? 'Enabled — visible to users' : 'Disabled — hidden from users'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" type="submit" isLoading={saving}>
          {isEdit ? 'Save Changes' : 'Create Rank'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// XpSourcesCard — live editable XP source amounts
// ---------------------------------------------------------------------------

const XP_SOURCE_META: { source: keyof XpConfig; label: string; description: string; min: number; max: number }[] = [
  { source: 'LIBRARY_ADD',    label: 'Add to Library',   description: 'Once per book per user',         min: 0, max: 1000  },
  { source: 'CHAPTER_READ',   label: 'Read a Chapter',   description: 'Once per chapter per user',      min: 0, max: 1000  },
  { source: 'REVIEW_SUBMIT',  label: 'Submit a Review',  description: 'Once per book per user',         min: 0, max: 1000  },
  { source: 'BOOK_COMPLETE',  label: 'Complete a Book',  description: 'Once per book per user',         min: 0, max: 10000 },
  { source: 'STREAK_7_DAY',   label: '7-Day Streak',     description: 'Every 7-day streak milestone',   min: 0, max: 5000  },
  { source: 'STREAK_30_DAY',  label: '30-Day Streak',    description: 'Every 30-day streak milestone',  min: 0, max: 10000 },
];

function XpSourcesCard() {
  const { xpConfig, isLoading, updateXpConfig, resetXpConfig, isSaving, isResetting } = useXpConfig();

  // Local draft state seeded from server values
  const [draft, setDraft] = useState<Partial<XpConfig>>({});
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Seed draft when server data arrives
  useEffect(() => {
    if (xpConfig) { setDraft({ ...xpConfig }); setDirty(false); }
  }, [xpConfig]);

  function handleChange(source: keyof XpConfig, raw: string) {
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;
    setDraft((d: Partial<XpConfig>) => ({ ...d, [source]: val }));
    setDirty(true);
    setSaveError(null);
  }

  async function handleSave() {
    setSaveError(null);
    try {
      await updateXpConfig(draft);
      setDirty(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  async function handleReset() {
    setSaveError(null);
    await resetXpConfig();
    setDirty(false);
  }

  return (
    <Card>
      <CardHeader
        title="XP Sources"
        subtitle="How much XP readers earn per action — changes take effect within 5 minutes"
        icon={<Sparkles className="w-4 h-4" />}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#9E94AB]" />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {XP_SOURCE_META.map(({ source, label, description, min, max }) => (
            <div key={source} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D]">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC]">{label}</p>
                <p className="text-[10px] text-[#9E94AB] dark:text-[#6D6282]">{description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={draft[source] ?? xpConfig?.[source] ?? 0}
                  onChange={e => handleChange(source, e.target.value)}
                  className="w-20 px-2 py-1 text-right text-xs font-mono font-bold rounded-lg bg-white dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D] text-[#2D253A] dark:text-[#F3EFFC] focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 w-6">XP</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {saveError && (
        <p className="mt-2 text-xs text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
          {saveError}
        </p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E8E2D8] dark:border-[#2A223D]">
        <Button
          variant="ghost"
          size="sm"
          isLoading={isResetting}
          onClick={handleReset}
          icon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Reset to Defaults
        </Button>
        <Button
          variant="primary"
          size="sm"
          isLoading={isSaving}
          disabled={!dirty}
          onClick={handleSave}
          icon={<Save className="w-3.5 h-3.5" />}
        >
          Save Changes
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RanksPage
// ---------------------------------------------------------------------------
export const RanksPage: React.FC = () => {
  const {
    ranks, isLoading,
    createRank, updateRank, deleteRank, seedDefaults,
    isCreating, isUpdating, isDeleting, isSeeding,
  } = useRankManagement();

  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<AdminRankDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRankDefinition | null>(null);
  const [formError,    setFormError]    = useState<string | null>(null);

  async function handleCreate(data: AdminRankInput) {
    setFormError(null);
    try { await createRank(data); setShowCreate(false); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'Failed to create'); }
  }

  async function handleUpdate(data: AdminRankInput) {
    if (!editTarget) return;
    setFormError(null);
    try { await updateRank(editTarget.id, data); setEditTarget(null); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'Failed to update'); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteRank(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function shiftLevel(rank: AdminRankDefinition, dir: 'up' | 'down') {
    const newLevel = dir === 'up' ? rank.level - 1 : rank.level + 1;
    if (newLevel < 1) return;
    // Swap with adjacent rank if it exists
    const sibling = ranks.find(r => r.level === newLevel);
    if (sibling) await updateRank(sibling.id, { level: rank.level });
    await updateRank(rank.id, { level: newLevel });
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            Rank Definitions
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Manage XP thresholds, titles, and icons for each reader rank
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" isLoading={isSeeding} onClick={seedDefaults}>
            Seed Defaults
          </Button>
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => { setShowCreate(true); setFormError(null); }}>
            New Rank
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Rank Ladder"
          subtitle={`${ranks.length} rank${ranks.length !== 1 ? 's' : ''} — ${ranks.filter(r => r.enabled).length} active`}
          icon={<Trophy className="w-4 h-4" />}
        />

        {isLoading ? (
          <div className="space-y-2 mt-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse h-14 rounded-xl bg-[#FAF7F2] dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D]" />
            ))}
          </div>
        ) : ranks.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Trophy className="w-10 h-10 text-[#C5BACF] mx-auto" />
            <p className="text-sm text-[#9E94AB] dark:text-[#6D6282]">No ranks yet.</p>
            <Button variant="outline" size="sm" onClick={seedDefaults} isLoading={isSeeding}>
              Seed 10 default ranks
            </Button>
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {ranks.map((rank, idx) => (
              <div key={rank.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                  rank.enabled
                    ? 'border-[#E8E2D8] dark:border-[#2A223D] bg-[#FAF7F2] dark:bg-[#120E1C]'
                    : 'border-dashed border-[#D0C9DA] dark:border-[#2A223D] bg-[#F5F2EF] dark:bg-[#0E0B17] opacity-60'
                }`}
              >
                {/* Level badge */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border bg-white dark:bg-[#1A1528] shrink-0 ${rank.colorClass} border-current/20`}>
                  {rank.level}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC] truncate">{rank.title}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
                      {rank.xpRequired.toLocaleString()} XP
                    </span>
                    {!rank.enabled && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-stone-400/15 text-stone-500 border border-stone-400/25">
                        Hidden
                      </span>
                    )}
                  </div>
                  {rank.description && (
                    <p className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] truncate mt-0.5 italic">{rank.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => shiftLevel(rank, 'up')} disabled={idx === 0}
                    className="p-1.5 rounded-lg text-[#9E94AB] hover:text-blue-500 hover:bg-blue-500/10 disabled:opacity-20 transition-colors cursor-pointer">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => shiftLevel(rank, 'down')} disabled={idx === ranks.length - 1}
                    className="p-1.5 rounded-lg text-[#9E94AB] hover:text-blue-500 hover:bg-blue-500/10 disabled:opacity-20 transition-colors cursor-pointer">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditTarget(rank); setFormError(null); }}
                    className="p-1.5 rounded-lg text-[#9E94AB] hover:text-purple-600 hover:bg-purple-500/10 transition-colors cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(rank)}
                    className="p-1.5 rounded-lg text-[#9E94AB] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* XP Source config card — live editable */}
      <XpSourcesCard />

      {/* Create modal */}
      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)} title="Create Rank" subtitle="Add a new rank to the ladder">
          <RankForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={isCreating} error={formError} />
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal isOpen onClose={() => setEditTarget(null)} title="Edit Rank" subtitle={`Editing: ${editTarget.title}`}>
          <RankForm
            initial={{ level: editTarget.level, title: editTarget.title, xpRequired: editTarget.xpRequired, icon: editTarget.icon, colorClass: editTarget.colorClass, description: editTarget.description ?? '', enabled: editTarget.enabled }}
            isEdit onSave={handleUpdate} onCancel={() => setEditTarget(null)} saving={isUpdating} error={formError}
          />
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal isOpen onClose={() => setDeleteTarget(null)} title="Delete Rank"
          subtitle="This rank will be removed. Users who earned it keep their XP."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" size="sm" isLoading={isDeleting} onClick={handleDelete}>Delete</Button>
            </div>
          }>
          <p className="text-sm text-[#2D253A] dark:text-[#F3EFFC]">
            Delete <strong>Lv.{deleteTarget.level} — {deleteTarget.title}</strong>?
          </p>
        </Modal>
      )}
    </div>
  );
};
