import React, { useState } from 'react';
import { ImageIcon, Plus, Trash2, Pencil, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';
import { useDefaultAvatarManagement, type AdminDefaultAvatar, type AdminDefaultAvatarInput } from '../hooks/useDefaultAvatarManagement';
import { Card, CardHeader, Button, Input, Modal } from '../components/ui';

// ---------------------------------------------------------------------------
// Avatar Form — shared for create & edit
// ---------------------------------------------------------------------------
interface AvatarFormProps {
  initial?:  Partial<AdminDefaultAvatarInput>;
  isEdit?:   boolean;
  onSave:    (data: AdminDefaultAvatarInput) => Promise<void>;
  onCancel:  () => void;
  saving:    boolean;
  error:     string | null;
}

function AvatarForm({ initial, isEdit, onSave, onCancel, saving, error }: AvatarFormProps) {
  const [url,       setUrl]       = useState(initial?.url       ?? '');
  const [label,     setLabel]     = useState(initial?.label     ?? '');
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [enabled,   setEnabled]   = useState(initial?.enabled   ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ url: url.trim(), label: label.trim(), sortOrder: Number(sortOrder), enabled });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      {/* Preview */}
      {url && (
        <div className="flex justify-center">
          <img
            src={url}
            alt="Preview"
            className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/30 shadow"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
          Image URL <span className="text-rose-500">*</span>
        </label>
        <Input
          type="url"
          placeholder="https://example.com/avatar.png"
          value={url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
          Label <span className="text-[#9E94B3] font-normal">(shown as tooltip)</span>
        </label>
        <Input
          placeholder="e.g. Mystical Fox"
          value={label}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
          maxLength={80}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
            Sort Order
          </label>
          <Input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSortOrder(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6D6282] dark:text-[#9E94B3] mb-1">
            Enabled
          </label>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors w-full ${
              enabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-[#FAF7F2] dark:bg-[#1A1528] border-[#E8E2D8] dark:border-[#2A223D] text-[#9E94AB]'
            }`}
          >
            {enabled
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft  className="w-4 h-4" />}
            {enabled ? 'Visible' : 'Hidden'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" type="submit" isLoading={saving}>
          {isEdit ? 'Save Changes' : 'Add Avatar'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// DefaultAvatarsPage
// ---------------------------------------------------------------------------
export const DefaultAvatarsPage: React.FC = () => {
  const {
    avatars, isLoading,
    createAvatar, updateAvatar, deleteAvatar,
    isCreating, isUpdating, isDeleting,
  } = useDefaultAvatarManagement();

  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<AdminDefaultAvatar | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDefaultAvatar | null>(null);
  const [formError,    setFormError]    = useState<string | null>(null);

  async function handleCreate(data: AdminDefaultAvatarInput) {
    setFormError(null);
    try { await createAvatar(data); setShowCreate(false); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'Failed to create'); }
  }

  async function handleUpdate(data: AdminDefaultAvatarInput) {
    if (!editTarget) return;
    setFormError(null);
    try { await updateAvatar(editTarget.id, data); setEditTarget(null); }
    catch (e) { setFormError(e instanceof Error ? e.message : 'Failed to update'); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteAvatar(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function toggleEnabled(avatar: AdminDefaultAvatar) {
    await updateAvatar(avatar.id, { enabled: !avatar.enabled });
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide flex items-center gap-2">
            <ImageIcon className="w-7 h-7 text-purple-500" />
            Default Avatars
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Manage the preset avatar library users can pick from when editing their profile
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => { setShowCreate(true); setFormError(null); }}
        >
          Add Avatar
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Avatar Library"
          subtitle={`${avatars.length} avatar${avatars.length !== 1 ? 's' : ''} — ${avatars.filter(a => a.enabled).length} visible to users`}
          icon={<ImageIcon className="w-4 h-4" />}
        />

        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse aspect-square rounded-2xl bg-[#FAF7F2] dark:bg-[#1A1528]" />
            ))}
          </div>
        ) : avatars.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ImageIcon className="w-10 h-10 text-[#C5BACF] mx-auto" />
            <p className="text-sm text-[#9E94AB] dark:text-[#6D6282]">No avatars yet.</p>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
              Add the first avatar
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-4">
            {avatars.map((avatar) => (
              <div
                key={avatar.id}
                className={`group relative flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all ${
                  avatar.enabled
                    ? 'border-[#E8E2D8] dark:border-[#2A223D] bg-[#FAF7F2] dark:bg-[#120E1C]'
                    : 'border-dashed border-[#D0C9DA] dark:border-[#2A223D] bg-[#F5F2EF] dark:bg-[#0E0B17] opacity-60'
                }`}
              >
                {/* Avatar image */}
                <div className="relative w-full aspect-square">
                  <img
                    src={avatar.url}
                    alt={avatar.label || 'Avatar'}
                    className="w-full h-full rounded-xl object-cover"
                  />
                  {/* Hover action overlay */}
                  <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => { setEditTarget(avatar); setFormError(null); }}
                      className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={avatar.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                      title="Open URL"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => setDeleteTarget(avatar)}
                      className="w-7 h-7 rounded-lg bg-rose-500/70 hover:bg-rose-500 flex items-center justify-center text-white transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Label + toggle */}
                <div className="w-full flex items-center justify-between gap-1 px-0.5">
                  <span className="text-[10px] text-[#6D6282] dark:text-[#9E94B3] truncate font-medium flex-1">
                    {avatar.label || <span className="italic opacity-50">no label</span>}
                  </span>
                  <button
                    onClick={() => toggleEnabled(avatar)}
                    title={avatar.enabled ? 'Disable' : 'Enable'}
                    className="shrink-0 transition-colors"
                  >
                    {avatar.enabled
                      ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                      : <ToggleLeft  className="w-4 h-4 text-[#9E94AB]" />}
                  </button>
                </div>

                {/* Sort order chip */}
                <span className="text-[9px] font-mono text-[#9E94AB] dark:text-[#6D6282]">
                  #{avatar.sortOrder}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create modal */}
      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)}
          title="Add Default Avatar"
          subtitle="New avatar will appear in the user profile picker">
          <AvatarForm
            onSave={handleCreate} onCancel={() => setShowCreate(false)}
            saving={isCreating} error={formError}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal isOpen onClose={() => setEditTarget(null)}
          title="Edit Avatar"
          subtitle={editTarget.label ? `Editing: ${editTarget.label}` : 'Editing avatar'}>
          <AvatarForm
            initial={{ url: editTarget.url, label: editTarget.label, sortOrder: editTarget.sortOrder, enabled: editTarget.enabled }}
            isEdit
            onSave={handleUpdate} onCancel={() => setEditTarget(null)}
            saving={isUpdating} error={formError}
          />
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal isOpen onClose={() => setDeleteTarget(null)}
          title="Delete Avatar"
          subtitle="This avatar will be removed from the picker immediately."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" size="sm" isLoading={isDeleting} onClick={handleDelete}>
                Delete
              </Button>
            </div>
          }
        >
          <div className="flex items-center gap-4">
            <img
              src={deleteTarget.url}
              alt={deleteTarget.label || 'Avatar'}
              className="w-14 h-14 rounded-xl object-cover border border-[#E8E2D8] dark:border-[#2A223D] shrink-0"
            />
            <p className="text-sm text-[#2D253A] dark:text-[#F3EFFC]">
              Delete <strong>{deleteTarget.label || 'this avatar'}</strong>? Users who already set it as their picture keep it, but it will no longer appear in the picker.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
