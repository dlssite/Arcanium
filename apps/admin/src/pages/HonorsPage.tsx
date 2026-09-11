
import React, { useState } from 'react';
import {
  Award, Plus, Trash2, Pencil, Check, X, Search,
  Moon, Sparkles, BookOpen, Compass,
  Scroll, Clock, Shield, Users, Zap,
} from 'lucide-react';
import { useBadgeManagement, type AdminBadge, type AdminBadgeInput } from '../hooks/useBadgeManagement';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@arcanium/api-client';
import { Card, CardHeader, Badge, Button, Input, Modal } from '../components/ui';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, React.ReactNode> = {
  Moon:     <Moon     className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  BookOpen: <BookOpen className="w-4 h-4" />,
  Compass:  <Compass  className="w-4 h-4" />,
  Scroll:   <Scroll   className="w-4 h-4" />,
  Clock:    <Clock    className="w-4 h-4" />,
  Shield:   <Shield   className="w-4 h-4" />,
  Award:    <Award    className="w-4 h-4" />,
  Zap:      <Zap      className="w-4 h-4" />,
  Users:    <Users    className="w-4 h-4" />,
};
const ICON_OPTIONS = Object.keys(ICON_MAP);

const TIER_OPTIONS = ['Bronze Talisman', 'Silver Talisman', 'Gold Talisman', 'Legendary', 'Special'];

const COLOR_PRESETS = [
  { label: 'Amber',   value: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60' },
  { label: 'Purple',  value: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60' },
  { label: 'Rose',    value: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60' },
  { label: 'Emerald', value: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60' },
  { label: 'Blue',    value: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60' },
  { label: 'Indigo',  value: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60' },
  { label: 'Stone',   value: 'text-stone-400 bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60' },
  { label: 'Cyan',    value: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60' },
];

// ---------------------------------------------------------------------------
// Badge Form — shared for create and edit
// ---------------------------------------------------------------------------
interface BadgeFormState {
  key:          string;
  title:        string;
  description:  string;
  iconName:     string;
  colorClasses: string;
  tier:         string;
  criteria:     string;
  manualOnly:   boolean;
}

function emptyForm(initial?: Partial<AdminBadgeInput>): BadgeFormState {
  return {
    key:          initial?.key          ?? '',
    title:        initial?.title        ?? '',
    description:  initial?.description  ?? '',
    iconName:     initial?.iconName     ?? 'Award',
    colorClasses: initial?.colorClasses ?? (COLOR_PRESETS[0]?.value ?? ''),
    tier:         initial?.tier         ?? 'Bronze Talisman',
    criteria:     initial?.criteria     ?? '',
    manualOnly:   initial?.manualOnly   ?? false,
  };
}

interface BadgeFormProps {
  initial?: Partial<AdminBadgeInput>;
  isEdit?:  boolean;
  onSave:   (data: AdminBadgeInput) => Promise<void>;
  onCancel: () => void;
  saving:   boolean;
  error:    string | null;
}

function BadgeForm({ initial, isEdit, onSave, onCancel, saving, error }: BadgeFormProps) {
  const [form, setForm] = useState<BadgeFormState>(() => emptyForm(initial));
  const set = (k: keyof BadgeFormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    const body: AdminBadgeInput = {
      key:          form.key.trim(),
      title:        form.title.trim(),
      description:  form.description.trim(),
      iconName:     form.iconName,
      colorClasses: form.colorClasses,
      tier:         form.tier,
      manualOnly:   form.manualOnly,
      enabled:      true,
    };
    if (form.criteria.trim()) body.criteria = form.criteria.trim();
    onSave(body);
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">
            Key <span className="text-rose-500">*</span>
          </label>
          <Input
            value={form.key}
            onChange={e => set('key', e.target.value.replace(/[^a-z0-9_]/g, ''))}
            placeholder="night_owl"
            disabled={isEdit}
          />
          {!isEdit && <p className="text-[10px] text-[#9E94AB] mt-0.5">snake_case, cannot be changed after creation</p>}
        </div>
        <div>
          <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">
            Title <span className="text-rose-500">*</span>
          </label>
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Night Owl Archivist" />
        </div>
      </div>

      <div>
        <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">
          Description <span className="text-rose-500">*</span>
        </label>
        <Input value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="What the reader did to earn this badge" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">Icon</label>
          <select value={form.iconName} onChange={e => set('iconName', e.target.value)}
            className="w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] px-3 py-2 focus:outline-none focus:border-purple-500">
            {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">Tier</label>
          <select value={form.tier} onChange={e => set('tier', e.target.value)}
            className="w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] px-3 py-2 focus:outline-none focus:border-purple-500">
            {TIER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => set('manualOnly', !form.manualOnly)}
          className={`w-8 h-4 rounded-full transition-colors cursor-pointer relative shrink-0 ${form.manualOnly ? 'bg-purple-600' : 'bg-[#E8E2D8] dark:bg-[#2A223D]'}`}>
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${form.manualOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-xs font-medium text-[#2D253A] dark:text-[#F3EFFC]">Manual-only award</span>
        <span className="text-[10px] text-[#9E94AB]">(admin can award; never auto-unlocked by activity)</span>
      </div>

      <div>
        <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1.5">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map(p => (
            <button key={p.value} type="button" onClick={() => set('colorClasses', p.value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer ${p.value} ${form.colorClasses === p.value ? 'ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-[#15101F]' : ''}`}>
              {form.colorClasses === p.value && <Check className="w-2.5 h-2.5" />}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 py-1">
        <div className={`flex items-center justify-center w-12 h-12 rounded-2xl border ${form.colorClasses}`}>
          {ICON_MAP[form.iconName] ?? <Award className="w-4 h-4" />}
        </div>
        <div>
          <div className="text-sm font-semibold text-[#2D253A] dark:text-[#F3EFFC]">{form.title || 'Badge Title'}</div>
          <div className="text-[10px] text-[#9E94AB] dark:text-[#6D6282]">{form.tier}</div>
        </div>
      </div>

      <div>
        <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">
          Auto-unlock hint <span className="text-[10px] text-[#9E94AB] font-normal">(optional)</span>
        </label>
        <Input value={form.criteria} onChange={e => set('criteria', e.target.value)}
          placeholder="e.g. readingStreak >= 7" />
      </div>

      {error && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" isLoading={saving} onClick={handleSubmit}>
          {isEdit ? 'Save Changes' : 'Create Badge'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Award Panel — search users and award/revoke badges for them
// ---------------------------------------------------------------------------
interface AwardPanelProps {
  badges:      AdminBadge[];
  onAward:     (userId: string, badgeId: string, note?: string) => Promise<unknown>;
  onRevoke:    (userId: string, badgeId: string) => Promise<unknown>;
  isAwarding:  boolean;
  isRevoking:  boolean;
}

function AwardPanel({ badges, onAward, onRevoke, isAwarding, isRevoking }: AwardPanelProps) {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  const [userSearch,   setUserSearch]   = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; displayName: string; email: string; avatarUrl: string | null } | null>(null);
  const [selectedBadgeId, setSelectedBadgeId] = useState('');
  const [note,         setNote]         = useState('');
  const [actionError,  setActionError]  = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users-search', userSearch],
    enabled:  isAuthenticated && userSearch.trim().length >= 2,
    queryFn:  async () => {
      const res = await adminApi.getContent({ q: userSearch, limit: 8 } as never);
      // Use the users endpoint instead
      const r = await fetch(`/api/v1/admin/users?search=${encodeURIComponent(userSearch)}&limit=8`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('arcanium_admin_token') ?? ''}` },
      });
      return r.json() as Promise<{ data: { users: { id: string; displayName: string; email: string; avatarUrl: string | null }[] } }>;
    },
    staleTime: 10_000,
  });

  const userBadgesQuery = useQuery({
    queryKey: ['admin', 'user-badges', selectedUser?.id],
    enabled:  isAuthenticated && !!selectedUser,
    queryFn:  () => adminApi.listUserBadges(selectedUser!.id),
    staleTime: 10_000,
  });

  const awardedBadgeIds = new Set(
    (userBadgesQuery.data?.data ?? []).map(a => a.badgeId)
  );

  const userList = (usersQuery.data as { data?: { users?: { id: string; displayName: string; email: string; avatarUrl: string | null }[] } } | undefined)?.data?.users ?? [];

  const handleAward = async () => {
    if (!selectedUser || !selectedBadgeId) return;
    setActionError(null);
    try {
      await onAward(selectedUser.id, selectedBadgeId, note.trim() || undefined);
      setNote('');
      setSelectedBadgeId('');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const handleRevoke = async (badgeId: string) => {
    if (!selectedUser) return;
    setActionError(null);
    try { await onRevoke(selectedUser.id, badgeId); }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Failed'); }
  };

  return (
    <div className="space-y-4">
      {/* User search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E94AB]" />
        <input
          value={userSearch}
          onChange={e => { setUserSearch(e.target.value); setSelectedUser(null); }}
          placeholder="Search readers by name or email..."
          className="w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] pl-9 pr-3 py-2 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* User results */}
      {!selectedUser && userSearch.trim().length >= 2 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {usersQuery.isLoading && (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse h-10 rounded-lg bg-[#FAF7F2] dark:bg-[#1A1528]" />
            ))
          )}
          {!usersQuery.isLoading && userList.length === 0 && (
            <p className="text-xs text-[#9E94AB] py-2 text-center">No users found</p>
          )}
          {userList.map(u => (
            <button key={u.id} onClick={() => setSelectedUser(u)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] hover:border-purple-400/50 transition-colors cursor-pointer text-left">
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-purple-700 dark:text-purple-300">
                {u.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#2D253A] dark:text-[#F3EFFC] truncate">{u.displayName}</div>
                <div className="text-[10px] text-[#9E94AB] truncate">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected user + their badges */}
      {selectedUser && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300">
                {selectedUser.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-semibold text-purple-800 dark:text-purple-200">{selectedUser.displayName}</div>
                <div className="text-[10px] text-[#9E94AB]">{selectedUser.email}</div>
              </div>
            </div>
            <button onClick={() => { setSelectedUser(null); setUserSearch(''); }}
              className="text-[#9E94AB] hover:text-rose-500 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current badges for this user */}
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[#9E94AB] dark:text-[#6D6282] mb-2">
              Current Awards ({awardedBadgeIds.size})
            </p>
            {userBadgesQuery.isLoading ? (
              <div className="animate-pulse h-8 rounded bg-[#FAF7F2] dark:bg-[#1A1528]" />
            ) : awardedBadgeIds.size === 0 ? (
              <p className="text-xs text-[#9E94AB] italic">No badges awarded yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(userBadgesQuery.data?.data ?? []).map(award => (
                  <div key={award.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-semibold ${award.badge.colorClasses}`}>
                    {ICON_MAP[award.badge.iconName] ?? <Award className="w-3 h-3" />}
                    <span>{award.badge.title}</span>
                    <button onClick={() => handleRevoke(award.badgeId)}
                      className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer" title="Revoke">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Award new badge */}
          <div className="space-y-2 pt-1 border-t border-[#E8E2D8] dark:border-[#2A223D]">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[#9E94AB] dark:text-[#6D6282]">
              Award a badge
            </p>
            <select value={selectedBadgeId} onChange={e => setSelectedBadgeId(e.target.value)}
              className="w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] px-3 py-2 focus:outline-none focus:border-purple-500">
              <option value="">Select a badge...</option>
              {badges.filter(b => b.enabled && !awardedBadgeIds.has(b.id)).map(b => (
                <option key={b.id} value={b.id}>{b.title} ({b.tier})</option>
              ))}
            </select>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note for this award..." />
            {actionError && (
              <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{actionError}</div>
            )}
            <Button variant="primary" size="sm" isLoading={isAwarding || isRevoking}
              onClick={handleAward} disabled={!selectedBadgeId}>
              Award Badge
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main HonorsPage
// ---------------------------------------------------------------------------
export const HonorsPage: React.FC = () => {
  const {
    badges, badgesLoading,
    createBadge, updateBadge, deleteBadge, seedDefaults,
    awardBadge, revokeBadge,
    isCreating, isUpdating, isDeleting, isAwarding, isRevoking, isSeeding,
  } = useBadgeManagement();

  const [showCreate,    setShowCreate]    = useState(false);
  const [editTarget,    setEditTarget]    = useState<AdminBadge | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<AdminBadge | null>(null);
  const [formError,     setFormError]     = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<AdminBadge | null>(null);

  const handleCreate = async (data: AdminBadgeInput) => {
    setFormError(null);
    try { await createBadge(data); setShowCreate(false); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'Failed to create badge'); }
  };

  const handleUpdate = async (data: AdminBadgeInput) => {
    if (!editTarget) return;
    setFormError(null);
    try { await updateBadge(editTarget.id, data); setEditTarget(null); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'Failed to update badge'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteBadge(deleteTarget.id);
    setDeleteTarget(null);
    if (selectedBadge?.id === deleteTarget.id) setSelectedBadge(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide flex items-center gap-2">
            <Award className="w-7 h-7 text-amber-500" />
            Honors & Badge Management
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Define badge catalog, award honors to readers, and revoke if needed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" isLoading={isSeeding} onClick={seedDefaults}>
            Seed Defaults
          </Button>
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => { setShowCreate(true); setFormError(null); }}>
            New Badge
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Badge Catalog (2 cols) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Badge Catalog"
              subtitle={`${badges.length} badge${badges.length !== 1 ? 's' : ''} defined`}
              icon={<Award className="w-4 h-4" />}
            />

            {badgesLoading ? (
              <div className="space-y-2 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-14 rounded-xl bg-[#FAF7F2] dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D]" />
                ))}
              </div>
            ) : badges.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <Award className="w-10 h-10 text-[#C5BACF] mx-auto" />
                <p className="text-sm text-[#9E94AB] dark:text-[#6D6282]">No badges yet.</p>
                <Button variant="outline" size="sm" onClick={seedDefaults} isLoading={isSeeding}>
                  Seed 8 default badges
                </Button>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {badges.map(badge => (
                  <div key={badge.id}
                    onClick={() => setSelectedBadge(b => b?.id === badge.id ? null : badge)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                      selectedBadge?.id === badge.id
                        ? 'border-purple-500/50 bg-purple-500/5'
                        : 'border-[#E8E2D8] dark:border-[#2A223D] bg-[#FAF7F2] dark:bg-[#120E1C] hover:border-purple-400/40'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl border shrink-0 ${badge.colorClasses}`}>
                      {ICON_MAP[badge.iconName] ?? <Award className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC]">{badge.title}</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-full border border-amber-500/25">
                          {badge.tier}
                        </span>
                        {badge.manualOnly && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 rounded-full border border-purple-500/25">
                            Manual
                          </span>
                        )}
                        {!badge.enabled && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-stone-400/15 text-stone-500 rounded-full border border-stone-400/25">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] truncate mt-0.5">{badge.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-[#9E94AB] font-mono mr-2">
                        {badge._count?.awards ?? 0} awarded
                      </span>
                      <button onClick={e => { e.stopPropagation(); setEditTarget(badge); setFormError(null); }}
                        className="p-1.5 rounded-lg text-[#9E94AB] hover:text-purple-600 hover:bg-purple-500/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(badge); }}
                        className="p-1.5 rounded-lg text-[#9E94AB] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Award list for selected badge */}
          {selectedBadge && (
            <BadgeAwardList badge={selectedBadge} onRevoke={revokeBadge} isRevoking={isRevoking} />
          )}
        </div>

        {/* ── RIGHT: Award Panel ────────────────────────────────────────────── */}
        <div>
          <Card>
            <CardHeader
              title="Award a Badge"
              subtitle="Search for a reader and grant an honor"
              icon={<Users className="w-4 h-4" />}
            />
            <div className="mt-2">
              <AwardPanel
                badges={badges}
                onAward={awardBadge}
                onRevoke={revokeBadge}
                isAwarding={isAwarding}
                isRevoking={isRevoking}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)} title="Create New Badge"
          subtitle="Define a new honor for the Arcanium archive">
          <BadgeForm onSave={handleCreate} onCancel={() => setShowCreate(false)}
            saving={isCreating} error={formError} />
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal isOpen onClose={() => setEditTarget(null)} title="Edit Badge"
          subtitle={`Editing: ${editTarget.title}`}>
          <BadgeForm
            initial={{ ...editTarget, criteria: editTarget.criteria ?? undefined }}
            isEdit onSave={handleUpdate}
            onCancel={() => setEditTarget(null)} saving={isUpdating} error={formError} />
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal isOpen onClose={() => setDeleteTarget(null)} title="Delete Badge"
          subtitle="This will also remove all user awards for this badge."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" size="sm" isLoading={isDeleting} onClick={handleDelete}>
                Delete Permanently
              </Button>
            </div>
          }>
          <p className="text-sm text-[#2D253A] dark:text-[#F3EFFC]">
            Delete <strong>{deleteTarget.title}</strong> and revoke it from all{' '}
            {deleteTarget._count?.awards ?? 0} reader{deleteTarget._count?.awards !== 1 ? 's' : ''}?
          </p>
        </Modal>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// BadgeAwardList — who has this badge, rendered below the selected badge row
// (defined after HonorsPage so it can reference the same ICON_MAP)
// ---------------------------------------------------------------------------
interface BadgeAwardListProps {
  badge:     AdminBadge;
  onRevoke:  (userId: string, badgeId: string) => Promise<unknown>;
  isRevoking: boolean;
}

function BadgeAwardList({ badge, onRevoke, isRevoking }: BadgeAwardListProps) {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  const awardsQuery = useQuery({
    queryKey: ['admin', 'badge-awards', badge.id],
    enabled:  isAuthenticated,
    queryFn:  () => adminApi.listBadgeAwards(badge.id),
    staleTime: 15_000,
  });

  const awards = awardsQuery.data?.data ?? [];

  return (
    <Card>
      <CardHeader
        title={`"${badge.title}" — Awarded To`}
        subtitle={`${awards.length} reader${awards.length !== 1 ? 's' : ''} hold this honor`}
        icon={<div className={`flex items-center justify-center w-6 h-6 rounded-lg border ${badge.colorClasses}`}>{ICON_MAP[badge.iconName]}</div>}
      />
      {awardsQuery.isLoading ? (
        <div className="space-y-2 mt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse h-10 rounded-lg bg-[#FAF7F2] dark:bg-[#1A1528]" />
          ))}
        </div>
      ) : awards.length === 0 ? (
        <p className="text-xs text-[#9E94AB] dark:text-[#6D6282] py-4 text-center italic">
          No one has been awarded this badge yet.
        </p>
      ) : (
        <div className="space-y-2 mt-2">
          {awards.map(award => (
            <div key={award.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] group">
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-purple-700 dark:text-purple-300">
                {award.user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[#2D253A] dark:text-[#F3EFFC] truncate">
                  {award.user?.displayName ?? award.userId}
                </div>
                <div className="text-[10px] text-[#9E94AB] truncate">
                  {award.user?.email ?? ''} &bull; {new Date(award.awardedAt).toLocaleDateString()}
                  {award.note && <span className="italic ml-1">— {award.note}</span>}
                </div>
              </div>
              <button
                onClick={() => onRevoke(award.userId, award.badgeId)}
                disabled={isRevoking}
                className="p-1.5 rounded-lg text-[#9E94AB] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
                title="Revoke badge"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
