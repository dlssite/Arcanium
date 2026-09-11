
import React, { useState } from 'react';
import { Library, Plus, Trash2, Pencil, X, Search, BookOpen, ChevronRight } from 'lucide-react';
import { useCollectionManagement, type CollectionSummary, type CollectionInput } from '../hooks/useCollectionManagement';
import { useContentCatalog } from '../hooks/useContentCatalog';
import { Card, CardHeader, Badge, Button, Input, Modal } from '../components/ui';

// ---------------------------------------------------------------------------
// Color palette for collection dots
// ---------------------------------------------------------------------------
const COLOR_OPTIONS = [
  { label: 'Purple',  value: 'bg-purple-400' },
  { label: 'Emerald', value: 'bg-emerald-500' },
  { label: 'Amber',   value: 'bg-amber-400'  },
  { label: 'Rose',    value: 'bg-rose-400'   },
  { label: 'Blue',    value: 'bg-blue-400'   },
  { label: 'Cyan',    value: 'bg-cyan-400'   },
  { label: 'Indigo',  value: 'bg-indigo-400' },
  { label: 'Stone',   value: 'bg-stone-400'  },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Collection Form (create / edit)
// ---------------------------------------------------------------------------
interface CollectionFormProps {
  initial?: Partial<CollectionInput>;
  isEdit?:  boolean;
  onSave:   (data: CollectionInput) => Promise<void>;
  onCancel: () => void;
  saving:   boolean;
  error:    string | null;
}

function CollectionForm({ initial, isEdit, onSave, onCancel, saving, error }: CollectionFormProps) {
  const [name,        setName]        = useState(initial?.name        ?? '');
  const [slug,        setSlug]        = useState(initial?.slug        ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [coverColor,  setCoverColor]  = useState(initial?.coverColor  ?? 'bg-purple-400');
  const [enabled,     setEnabled]     = useState(initial?.enabled     ?? true);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!isEdit) setSlug(slugify(v));
  };

  const handleSave = () => onSave({
    name: name.trim(), slug: slug.trim(), description: description.trim(),
    coverColor, enabled,
  });

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">
            Name <span className="text-rose-500">*</span>
          </label>
          <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Grimoires & Spells" />
        </div>
        <div>
          <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">
            Slug <span className="text-rose-500">*</span>
          </label>
          <Input
            value={slug}
            onChange={e => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))}
            placeholder="grimoires-spells"
            disabled={isEdit}
          />
          {!isEdit && <p className="text-[10px] text-[#9E94AB] mt-0.5">Auto-generated · becomes the URL</p>}
        </div>
      </div>

      <div>
        <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="A curated selection of fantasy grimoires, spell books, and magical academy stories..."
          className="w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] placeholder-[#9E94AB] px-3 py-2 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      <div>
        <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-2">Sidebar Dot Color</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map(c => (
            <button key={c.value} type="button"
              onClick={() => setCoverColor(c.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all cursor-pointer ${
                coverColor === c.value
                  ? 'border-purple-500 ring-2 ring-purple-500 ring-offset-1 dark:ring-offset-[#15101F] bg-white dark:bg-[#1D1528]'
                  : 'border-[#E8E2D8] dark:border-[#2A223D] bg-[#FAF7F2] dark:bg-[#120E1C] text-[#6D6282] dark:text-[#9E94B3]'
              }`}
            >
              <span className={`w-3 h-3 rounded-full shrink-0 ${c.value}`} />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setEnabled(v => !v)}
          className={`w-8 h-4 rounded-full transition-colors cursor-pointer relative shrink-0 ${enabled ? 'bg-purple-600' : 'bg-[#E8E2D8] dark:bg-[#2A223D]'}`}>
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-xs font-medium text-[#2D253A] dark:text-[#F3EFFC]">
          {enabled ? 'Visible to readers' : 'Hidden from readers'}
        </span>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 dark:text-rose-300">{error}</div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" isLoading={saving} onClick={handleSave}>
          {isEdit ? 'Save Changes' : 'Create Collection'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CollectionsPage
// ---------------------------------------------------------------------------
export const CollectionsPage: React.FC = () => {
  const {
    collections, isLoading, isError,
    selectedId, setSelectedId,
    entries, entriesLoading,
    createCollection, updateCollection, deleteCollection,
    addEntry, removeEntry,
    isCreating, isUpdating, isDeleting, isAddingEntry,
  } = useCollectionManagement();

  const { contentList, isLoading: catalogLoading, searchQuery, setSearchQuery } = useContentCatalog();

  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<CollectionSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CollectionSummary | null>(null);
  const [formError,    setFormError]    = useState<string | null>(null);
  const [addingId,     setAddingId]     = useState<string | null>(null);

  const selectedCollection = collections.find(c => c.id === selectedId) ?? null;

  const handleCreate = async (data: CollectionInput) => {
    setFormError(null);
    try { await createCollection(data); setShowCreate(false); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Failed"); }
  };

  const handleUpdate = async (data: CollectionInput) => {
    if (!editTarget) return;
    setFormError(null);
    try { await updateCollection(editTarget.id, data); setEditTarget(null); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Failed"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCollection(deleteTarget.id);
    setDeleteTarget(null);
  };

  const entryIds = new Set(entries.map(e => e.contentId));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide flex items-center gap-2">
            <Library className="w-7 h-7 text-purple-500" />
            Special Collections
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Curated book collections shown in the web app sidebar and on dedicated collection pages
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => { setShowCreate(true); setFormError(null); }}>
          New Collection
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Collection list */}
        <div className="space-y-3">
          <Card>
            <CardHeader title="Collections" subtitle={`${collections.length} total`} icon={<Library className="w-4 h-4" />} />
            <div className="space-y-2 mt-2">
              {isLoading && Array.from({length:4}).map((_,i)=>(
                <div key={i} className="animate-pulse h-14 rounded-xl bg-[#FAF7F2] dark:bg-[#1A1528]" />
              ))}
              {!isLoading && collections.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-[#9E94AB] dark:text-[#6D6282]">No collections yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Create first collection</Button>
                </div>
              )}
              {collections.map(col => (
                <div key={col.id} onClick={() => setSelectedId(col.id === selectedId ? null : col.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                    selectedId === col.id
                      ? "border-purple-500/50 bg-purple-500/5"
                      : "border-[#E8E2D8] dark:border-[#2A223D] bg-[#FAF7F2] dark:bg-[#120E1C] hover:border-purple-400/40"
                  }`}>
                  <span className={`w-3 h-3 rounded-full shrink-0 ${col.coverColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC] truncate">{col.name}</p>
                    <p className="text-[10px] text-[#9E94AB] mt-0.5">{col._count?.entries ?? 0} books{!col.enabled ? " · Hidden" : ""}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={e=>{e.stopPropagation();setEditTarget(col);setFormError(null);}}
                      className="p-1.5 rounded-lg text-[#9E94AB] hover:text-purple-600 hover:bg-purple-500/10 cursor-pointer transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e=>{e.stopPropagation();setDeleteTarget(col);}}
                      className="p-1.5 rounded-lg text-[#9E94AB] hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-[#C5BACF] shrink-0 transition-transform ${selectedId === col.id ? "rotate-90" : ""}`} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT: Collection detail + book management */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedCollection ? (
            <Card>
              <div className="py-16 flex flex-col items-center gap-3 text-[#9E94AB] dark:text-[#6D6282]">
                <Library className="w-10 h-10 opacity-40" />
                <p className="text-sm">Select a collection to manage its books</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Collection info header */}
              <Card>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full shrink-0 ${selectedCollection.coverColor}`} />
                    <div>
                      <h2 className="text-sm font-bold text-[#2D253A] dark:text-[#F3EFFC]">{selectedCollection.name}</h2>
                      <p className="text-[10px] text-[#9E94AB] mt-0.5 font-mono">/collection/{selectedCollection.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                      selectedCollection.enabled
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-stone-400/10 text-stone-500 border-stone-400/30"
                    }`}>{selectedCollection.enabled ? "Live" : "Hidden"}</span>
                    <Badge variant="purple" size="sm">{entries.length} books</Badge>
                  </div>
                </div>
                {selectedCollection.description && (
                  <p className="text-xs text-[#6D6282] dark:text-[#9E94B3] mt-2 leading-relaxed">{selectedCollection.description}</p>
                )}
              </Card>

              {/* Book list for this collection */}
              <Card>
                <CardHeader title="Books in Collection" subtitle="Drag to reorder (coming soon)" icon={<BookOpen className="w-4 h-4" />} />
                <div className="space-y-2 mt-2">
                  {entriesLoading && Array.from({length:3}).map((_,i)=>(
                    <div key={i} className="animate-pulse h-12 rounded-lg bg-[#FAF7F2] dark:bg-[#1A1528]" />
                  ))}
                  {!entriesLoading && entries.length === 0 && (
                    <p className="text-xs text-[#9E94AB] dark:text-[#6D6282] py-4 text-center italic">
                      No books yet. Search below to add some.
                    </p>
                  )}
                  {entries.map((entry, idx) => (
                    <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] group">
                      <span className="text-[10px] font-mono text-[#9E94AB] w-5 text-center shrink-0">{idx+1}</span>
                      {entry.content.coverImageUrl && (
                        <img src={entry.content.coverImageUrl} alt={entry.content.title} className="w-8 h-11 object-cover rounded-md shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#2D253A] dark:text-[#F3EFFC] truncate">{entry.content.title}</p>
                        <p className="text-[10px] text-[#9E94AB]">{entry.content.type.replace("_"," ")} · {entry.content.chapterCount} ch</p>
                      </div>
                      <button onClick={() => removeEntry(selectedId!, entry.id)}
                        className="p-1.5 rounded-lg text-[#9E94AB] hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Add books from catalog */}
              <Card>
                <CardHeader title="Add Books from Catalog" subtitle="Search and pin books to this collection" icon={<Search className="w-4 h-4" />} />
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E94AB]" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search books by title..."
                      className="w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] pl-9 pr-3 py-2 focus:outline-none focus:border-purple-500" />
                  </div>
                  {searchQuery.trim().length > 0 && (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {catalogLoading ? Array.from({length:3}).map((_,i)=>(
                        <div key={i} className="animate-pulse h-10 rounded-lg bg-[#FAF7F2] dark:bg-[#1A1528]" />
                      )) : contentList.length === 0 ? (
                        <p className="text-xs text-[#9E94AB] py-2 text-center">No books found</p>
                      ) : contentList.map(item => {
                        const alreadyAdded = entryIds.has(item.id);
                        return (
                          <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D]">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[#2D253A] dark:text-[#F3EFFC] truncate">{item.title}</p>
                              <p className="text-[10px] text-[#9E94AB]">{item.type.replace("_"," ")} · by {item.author}</p>
                            </div>
                            {alreadyAdded ? (
                              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-500/25 font-medium shrink-0">Added</span>
                            ) : (
                              <Button variant="outline" size="sm"
                                isLoading={addingId === item.id}
                                onClick={async () => {
                                  setAddingId(item.id);
                                  try { await addEntry(selectedId!, item.id); }
                                  finally { setAddingId(null); }
                                }}>
                                + Add
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)} title="New Special Collection"
          subtitle="Create a curated collection that appears in the web app sidebar">
          <CollectionForm onSave={handleCreate} onCancel={() => setShowCreate(false)}
            saving={isCreating} error={formError} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal isOpen onClose={() => setEditTarget(null)} title="Edit Collection"
          subtitle={`Editing: ${editTarget.name}`}>
          <CollectionForm initial={editTarget} isEdit onSave={handleUpdate}
            onCancel={() => setEditTarget(null)} saving={isUpdating} error={formError} />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal isOpen onClose={() => setDeleteTarget(null)} title="Delete Collection"
          subtitle="This will remove the collection and all its book entries permanently."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" size="sm" isLoading={isDeleting} onClick={handleDelete}>Delete Permanently</Button>
            </div>
          }>
          <p className="text-sm text-[#2D253A] dark:text-[#F3EFFC]">
            Delete <strong>{deleteTarget.name}</strong>? This removes it from the sidebar and deletes {deleteTarget._count?.entries ?? 0} book entries.
          </p>
        </Modal>
      )}
    </div>
  );
};
