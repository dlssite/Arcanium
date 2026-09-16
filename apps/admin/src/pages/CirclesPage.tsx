import React, { useState, useEffect } from 'react';
import {
  CircleDot, Plus, Trash2, Archive, Star, StarOff,
  Users, MessageSquare, Search, Filter, ChevronLeft,
  ChevronRight, Save, Loader2, Lock, Globe, X,
  UserMinus, Flag, CheckCircle,
} from 'lucide-react';
import {
  useCircleManagement,
  type AdminCircleSummary,
  type AdminCreateCircleInput,
  type CircleConfig,
} from '../hooks/useCircleManagement';
import { Card, CardHeader, Badge, Button, Input, Select, Modal } from '../components/ui';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COVER_COLORS = [
  'bg-purple-500','bg-violet-500','bg-indigo-500','bg-blue-500',
  'bg-cyan-500',  'bg-teal-500',  'bg-emerald-500','bg-amber-500',
  'bg-orange-500','bg-rose-500',  'bg-pink-500',  'bg-fuchsia-500',
];

function VisibilityBadge({ visibility }: { visibility: string }) {
  return visibility === 'PUBLIC' ? (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
      <Globe className="w-2.5 h-2.5" /> Public
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
      <Lock className="w-2.5 h-2.5" /> Private
    </span>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit form
// ---------------------------------------------------------------------------
interface CircleFormProps {
  initial?: Partial<AdminCreateCircleInput & { isArchived?: boolean; isFeatured?: boolean; featuredOrder?: number }>;
  isEdit?:  boolean;
  onSave:   (data: AdminCreateCircleInput) => Promise<void>;
  onCancel: () => void;
  saving:   boolean;
  error:    string | null;
}

function CircleForm({ initial, isEdit, onSave, onCancel, saving, error }: CircleFormProps) {
  const [name,        setName]        = useState(initial?.name        ?? '');
  const [tag,         setTag]         = useState(initial?.tag         ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [visibility,  setVisibility]  = useState<'PUBLIC'|'PRIVATE'>(initial?.visibility  ?? 'PUBLIC');
  const [coverColor,  setCoverColor]  = useState(initial?.coverColor  ?? 'bg-purple-500');
  const [ownerId,     setOwnerId]     = useState(initial?.ownerId     ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ name: name.trim(), tag: tag.trim(), description: description.trim() || undefined, visibility, coverColor, ownerId: ownerId.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
            Name <span className="text-rose-500">*</span>
          </label>
          <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Shadow Readers Guild" maxLength={80} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
            Tag <span className="text-rose-500">*</span>
          </label>
          <Input value={tag} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTag(e.target.value)} placeholder="#DarkFantasy" maxLength={30} required />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this circle about?"
          maxLength={500} rows={3}
          className="w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] placeholder-[#9E94AB] px-3 py-2 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      {!isEdit && (
        <div>
          <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
            Owner User ID <span className="text-rose-500">*</span>
          </label>
          <Input value={ownerId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOwnerId(e.target.value)} placeholder="cuid..." required />
          <p className="text-[10px] text-[#9E94AB] mt-0.5">The user who will be set as OWNER of this circle</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1.5">Visibility</label>
        <div className="flex gap-2">
          {(['PUBLIC', 'PRIVATE'] as const).map(v => (
            <button key={v} type="button" onClick={() => setVisibility(v)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                visibility === v
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-[#FAF7F2] dark:bg-[#120E1C] text-[#6D6282] dark:text-[#9E94B3] border-[#E8E2D8] dark:border-[#2A223D] hover:border-purple-400'
              }`}>
              {v === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-2">Cover Color</label>
        <div className="flex flex-wrap gap-2">
          {COVER_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setCoverColor(c)}
              className={`w-6 h-6 rounded-full ${c} transition-transform ${coverColor === c ? 'ring-2 ring-offset-1 ring-purple-500 scale-110' : 'hover:scale-105'}`} />
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" type="submit" isLoading={saving}>
          {isEdit ? 'Save Changes' : 'Create Circle'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Min Rank Config card — mirrors XpSourcesCard from RanksPage
// ---------------------------------------------------------------------------
function CircleMinRankCard({ circleConfig, configLoading, updateConfig, isConfigSaving }: {
  circleConfig: import('../hooks/useCircleManagement').CircleConfig | null;
  configLoading: boolean;
  updateConfig: (body: import('../hooks/useCircleManagement').CircleConfig) => Promise<unknown>;
  isConfigSaving: boolean;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (circleConfig && draft === null) {
      setDraft(circleConfig.minRankLevel);
      setDirty(false);
    }
  }, [circleConfig]);

  async function handleSave() {
    if (draft === null) return;
    setSaveError(null);
    try {
      await updateConfig({ minRankLevel: draft });
      setDirty(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  return (
    <Card>
      <CardHeader
        title="Circle Min Rank Config"
        subtitle="Minimum rank level for USER-role accounts to create circles (1–10). Verified Writers, Mods, and Admins are always allowed."
        icon={<CircleDot className="w-4 h-4" />}
      />

      {configLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[#9E94AB]" />
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D]">
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC]">Minimum Rank Level</p>
            <p className="text-[10px] text-[#9E94AB] dark:text-[#6D6282]">Users below this rank cannot create circles</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number" min={1} max={10}
              value={draft ?? circleConfig?.minRankLevel ?? 3}
              onChange={e => { setDraft(Number(e.target.value)); setDirty(true); setSaveError(null); }}
              className="w-16 px-2 py-1 text-right text-xs font-mono font-bold rounded-lg bg-white dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D] text-[#2D253A] dark:text-[#F3EFFC] focus:outline-none focus:border-purple-500"
            />
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 w-8">/ 10</span>
          </div>
        </div>
      )}

      {saveError && (
        <p className="mt-2 text-xs text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{saveError}</p>
      )}

      <div className="flex justify-end mt-3 pt-2 border-t border-[#E8E2D8] dark:border-[#2A223D]">
        <Button variant="primary" size="sm" isLoading={isConfigSaving} disabled={!dirty} onClick={handleSave}
          icon={<Save className="w-3.5 h-3.5" />}>
          Save Changes
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Circle Detail Modal — tabs: Posts | Members | Join Requests
// ---------------------------------------------------------------------------
type DetailTab = 'members' | 'posts' | 'requests';

function CircleDetailModal({
  circle,
  onClose,
  removeMember,
  removePost,
  approveRequest,
  rejectRequest,
}: {
  circle: import('../hooks/useCircleManagement').AdminCircleDetail | null;
  onClose: () => void;
  removeMember: (circleId: string, userId: string) => Promise<unknown>;
  removePost: (circleId: string, postId: string) => Promise<unknown>;
  approveRequest: (circleId: string, requestId: string) => Promise<unknown>;
  rejectRequest: (circleId: string, requestId: string) => Promise<unknown>;
}) {
  const [tab, setTab] = useState<DetailTab>('members');

  const members  = circle?.members  ?? [];
  const requests = circle?.requests ?? [];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={circle ? `${circle.name}` : 'Circle Detail'}
      subtitle={circle ? `${circle.tag} · ${circle.memberCount} members · ${circle.postCount} posts` : ''}
      maxWidth="xl"
    >
      {!circle ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#9E94AB]" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-[#E8E2D8] dark:border-[#2A223D]">
            {([
              { id: 'members',  label: 'Members',       count: members.length },
              { id: 'posts',    label: 'Posts',          count: circle.postCount },
              { id: 'requests', label: 'Join Requests',  count: requests.filter(r => r.status === 'PENDING').length, hidden: circle.visibility !== 'PRIVATE' },
            ] as const).map(t => {
              if ((t as any).hidden) return null;
              return (
                <button key={t.id} onClick={() => setTab(t.id as DetailTab)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-purple-600 text-purple-700 dark:text-purple-300'
                      : 'border-transparent text-[#9E94AB] hover:text-[#2D253A] dark:hover:text-[#F3EFFC]'
                  }`}>
                  {t.label}
                  {(t.count ?? 0) > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Members tab */}
          {tab === 'members' && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-xs text-[#9E94AB] py-4 text-center">No members.</p>
              ) : members.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {m.displayName.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC] truncate">{m.displayName}</p>
                    <p className="text-[10px] text-[#9E94AB]">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
                  </div>
                  <Badge
                    variant={m.role === 'OWNER' ? 'purple' : m.role === 'MODERATOR' ? 'info' : 'neutral'}
                    size="sm"
                  >
                    {m.role}
                  </Badge>
                  {m.role !== 'OWNER' && (
                    <button
                      onClick={() => removeMember(circle.id, m.userId)}
                      className="p-1.5 rounded-lg text-[#9E94AB] hover:text-rose-600 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Remove member"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Posts tab */}
          {tab === 'posts' && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <p className="text-xs text-[#9E94AB] italic pb-1">
                Showing recent posts. Removed posts are struck through.
              </p>
              {circle.postCount === 0 ? (
                <p className="text-xs text-[#9E94AB] py-4 text-center">No posts yet.</p>
              ) : (
                <p className="text-xs text-[#9E94AB] py-2 text-center">
                  Use the posts API endpoint to view and moderate individual posts for this circle.
                </p>
              )}
            </div>
          )}

          {/* Join Requests tab */}
          {tab === 'requests' && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {requests.length === 0 ? (
                <p className="text-xs text-[#9E94AB] py-4 text-center">No join requests.</p>
              ) : requests.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {r.displayName.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC] truncate">{r.displayName}</p>
                    {r.message && <p className="text-[10px] text-[#9E94AB] truncate italic">"{r.message}"</p>}
                  </div>
                  <Badge
                    variant={r.status === 'PENDING' ? 'warning' : r.status === 'APPROVED' ? 'success' : 'error'}
                    size="sm"
                  >
                    {r.status}
                  </Badge>
                  {r.status === 'PENDING' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => approveRequest(circle.id, r.id)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => rejectRequest(circle.id, r.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 transition-colors"
                        title="Reject"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main CirclesPage
// ---------------------------------------------------------------------------
export const CirclesPage: React.FC = () => {
  const {
    circles, total, isLoading, isError,
    searchQuery, setSearchQuery,
    visibilityFilter, setVisibilityFilter,
    statusFilter, setStatusFilter,
    page, setPage, hasMore,
    selectedCircleId, setSelectedCircleId,
    selectedCircle, detailLoading,
    createCircle, updateCircle, deleteCircle,
    featureCircle, archiveCircle,
    removeMember, removePost, approveRequest, rejectRequest,
    isCreating, isUpdating, isDeleting,
    circleConfig, configLoading, updateConfig, isConfigSaving,
  } = useCircleManagement();

  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<AdminCircleSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCircleSummary | null>(null);
  const [formError,    setFormError]    = useState<string | null>(null);

  async function handleCreate(data: AdminCreateCircleInput) {
    setFormError(null);
    try { await createCircle(data); setShowCreate(false); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'Failed to create'); }
  }

  async function handleUpdate(data: AdminCreateCircleInput) {
    if (!editTarget) return;
    setFormError(null);
    try { await updateCircle(editTarget.id, data); setEditTarget(null); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'Failed to update'); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteCircle(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide flex items-center gap-2">
            <CircleDot className="w-7 h-7 text-purple-500" />
            Reading Circles
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Manage all circles, members, posts, and join requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="purple" size="md">
            {isLoading ? 'Loading…' : `${total} Circles`}
          </Badge>
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => { setShowCreate(true); setFormError(null); }}>
            New Circle
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search circles by name…"
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={visibilityFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setVisibilityFilter(e.target.value as any)}
            options={[
              { label: 'All Visibility', value: 'ALL'     },
              { label: 'Public',         value: 'PUBLIC'  },
              { label: 'Private',        value: 'PRIVATE' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as any)}
            options={[
              { label: 'All Status',   value: 'ALL'      },
              { label: 'Active',       value: 'ACTIVE'   },
              { label: 'Archived',     value: 'ARCHIVED' },
              { label: 'Featured',     value: 'FEATURED' },
            ]}
          />
        </div>
      </Card>

      {/* ── Circles Table ───────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF7F2] dark:bg-[#120E1C] border-b border-[#E8E2D8] dark:border-[#2A223D] text-[11px] uppercase tracking-wider text-[#9E94AB] dark:text-[#6D6282] font-semibold">
              <tr>
                <th className="py-3.5 px-4">Circle</th>
                <th className="py-3.5 px-4">Visibility</th>
                <th className="py-3.5 px-4">Owner</th>
                <th className="py-3.5 px-4">Members</th>
                <th className="py-3.5 px-4">Posts</th>
                <th className="py-3.5 px-4">Featured</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D8] dark:divide-[#2A223D] text-xs">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="py-3.5 px-4">
                        <div className="h-4 bg-[#E8E2D8] dark:bg-[#2A223D] rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-rose-500 text-xs">
                    Failed to load circles. Check the API connection and refresh.
                  </td>
                </tr>
              ) : circles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6D6282] dark:text-[#9E94B3]">
                    No circles matching the current filters.
                  </td>
                </tr>
              ) : (
                circles.map((c) => (
                  <tr key={c.id} className="table-row-hover">
                    {/* Name / Tag */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${c.coverColor}`} />
                        <div className="min-w-0">
                          <button
                            onClick={() => setSelectedCircleId(c.id)}
                            className="font-semibold text-[#2D253A] dark:text-[#F3EFFC] hover:text-purple-600 dark:hover:text-purple-300 transition-colors text-left truncate block max-w-[180px]"
                          >
                            {c.name}
                          </button>
                          <span className="text-[10px] text-[#9E94AB] font-mono">{c.tag}</span>
                        </div>
                      </div>
                      {c.isArchived && (
                        <span className="mt-1 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-stone-400/15 text-stone-500 border border-stone-400/25">
                          ARCHIVED
                        </span>
                      )}
                    </td>

                    {/* Visibility */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <VisibilityBadge visibility={c.visibility} />
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[#6D6282] dark:text-[#9E94B3]">
                      {c.ownerName}
                    </td>

                    {/* Members */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[#2D253A] dark:text-[#F3EFFC] font-mono">
                        <Users className="w-3 h-3 text-[#9E94AB]" />
                        {c.memberCount.toLocaleString()}
                      </div>
                    </td>

                    {/* Posts */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[#2D253A] dark:text-[#F3EFFC] font-mono">
                        <MessageSquare className="w-3 h-3 text-[#9E94AB]" />
                        {c.postCount.toLocaleString()}
                      </div>
                    </td>

                    {/* Featured toggle */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => featureCircle(c.id, !c.isFeatured)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          c.isFeatured
                            ? 'text-amber-500 hover:bg-amber-500/10'
                            : 'text-[#C5BACF] hover:text-amber-400 hover:bg-amber-500/10'
                        }`}
                        title={c.isFeatured ? 'Unfeature circle' : 'Feature circle'}
                      >
                        {c.isFeatured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm"
                          onClick={() => setSelectedCircleId(c.id)}
                          className="text-xs text-purple-700 dark:text-purple-300">
                          Detail
                        </Button>
                        <Button variant="outline" size="sm"
                          onClick={() => { setEditTarget(c); setFormError(null); }}
                          className="text-xs">
                          Edit
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => archiveCircle(c.id, !c.isArchived)}
                          icon={<Archive className="w-3 h-3" />}
                          className="text-xs"
                          title={c.isArchived ? 'Unarchive' : 'Archive'}
                        >
                          {c.isArchived ? 'Restore' : 'Archive'}
                        </Button>
                        <Button variant="danger" size="sm"
                          onClick={() => setDeleteTarget(c)}
                          icon={<Trash2 className="w-3 h-3" />}
                          className="text-xs">
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(hasMore || page > 1) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E2D8] dark:border-[#2A223D]">
            <span className="text-xs text-[#9E94AB]">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                icon={<ChevronLeft className="w-3.5 h-3.5" />}>Prev</Button>
              <span className="text-xs font-mono text-[#6D6282] dark:text-[#9E94B3]">Page {page}</span>
              <Button variant="ghost" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}
                icon={<ChevronRight className="w-3.5 h-3.5" />}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Min Rank Config Card ────────────────────────────────────────────── */}
      <CircleMinRankCard
        circleConfig={circleConfig}
        configLoading={configLoading}
        updateConfig={updateConfig}
        isConfigSaving={isConfigSaving}
      />

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Detail modal */}
      {selectedCircleId && (
        <CircleDetailModal
          circle={selectedCircle}
          onClose={() => setSelectedCircleId(null)}
          removeMember={removeMember}
          removePost={removePost}
          approveRequest={approveRequest}
          rejectRequest={rejectRequest}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)} title="Create Circle"
          subtitle="Create a new reading circle on behalf of any user">
          <CircleForm onSave={handleCreate} onCancel={() => setShowCreate(false)}
            saving={isCreating} error={formError} />
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal isOpen onClose={() => setEditTarget(null)} title="Edit Circle"
          subtitle={`Editing: ${editTarget.name}`}>
          <CircleForm
            initial={editTarget as any}
            isEdit
            onSave={handleUpdate}
            onCancel={() => setEditTarget(null)}
            saving={isUpdating}
            error={formError}
          />
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal isOpen onClose={() => setDeleteTarget(null)} title="Delete Circle"
          subtitle="This will permanently delete the circle and all its posts, replies, and members."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" size="sm" isLoading={isDeleting} onClick={handleDelete}>
                Delete Permanently
              </Button>
            </div>
          }>
          <p className="text-sm text-[#2D253A] dark:text-[#F3EFFC]">
            Delete <strong>{deleteTarget.name}</strong>? This removes{' '}
            {deleteTarget.memberCount} member{deleteTarget.memberCount !== 1 ? 's' : ''} and{' '}
            {deleteTarget.postCount} post{deleteTarget.postCount !== 1 ? 's' : ''}.
          </p>
        </Modal>
      )}
    </div>
  );
};
