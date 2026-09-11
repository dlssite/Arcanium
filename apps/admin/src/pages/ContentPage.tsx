import React, { useState } from 'react';
import { Search, Plus, Trash2, RefreshCw, ExternalLink, Layers, Globe, CheckCircle2, XCircle, Loader2, ListOrdered, Pencil, Star, BookOpen, Sparkles } from 'lucide-react';
import { useContentCatalog } from '../hooks/useContentCatalog';
import { useIngestQueue } from '../hooks/useIngestQueue';
import { useFeaturedManagement } from '../hooks/useFeaturedManagement';
import type { ContentItem, ContentType } from '../types';
import { Card, CardHeader, Badge, Button, Input, Select, Modal } from '../components/ui';

const CONTENT_TYPE_OPTIONS = [
  { label: 'Web Novel',     value: 'WEB_NOVEL'   },
  { label: 'Light Novel',   value: 'LIGHT_NOVEL' },
  { label: 'Manga / Comic', value: 'MANGA'       },
  { label: 'E-Book',        value: 'EBOOK'       },
  { label: 'Webtoon',       value: 'WEBTOON'     },
];

type DraftRow = { id: string; url: string; type: ContentType };

export const ContentPage: React.FC = () => {
  const {
    contentList, totalContentCount, isLoading, isError,
    categories, parsers, scrapersLoading,
    searchQuery, setSearchQuery, typeFilter, setTypeFilter,
    categoryFilter, setCategoryFilter,
    addCategory, removeCategory, triggerScraperSync, deleteContent, updateContent,
  } = useContentCatalog();

  const { jobs, enqueue, clearDone, processing } = useIngestQueue();
  const { homeFeatured, exploreSpotlight, isLoading: featuredLoading, pin, unpin, toggle, reorder, isPinning, isUnpinning } = useFeaturedManagement();

  const [activeTab, setActiveTab]   = useState<'catalog' | 'featured'>('catalog');
  const [newCatInput, setNewCatInput] = useState('');
  const [syncingId,  setSyncingId]  = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<Record<string, string>>({});
  const [ingestOpen, setIngestOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[]>([
    { id: '1', url: '', type: 'WEB_NOVEL' },
  ]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // ── Featured pin state ────────────────────────────────────────────────────
  const [pinTarget,    setPinTarget]    = useState<ContentItem | null>(null);
  const [pinSection,   setPinSection]   = useState<'home_featured' | 'explore_spotlight'>('home_featured');
  const [pinLabel,     setPinLabel]     = useState('Featured Books');
  const [pinError,     setPinError]     = useState<string | null>(null);

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editTarget, setEditTarget]   = useState<ContentItem | null>(null);
  const [editType,   setEditType]     = useState<ContentType>('WEB_NOVEL');
  const [editGenres, setEditGenres]   = useState<string>('');   // comma-separated
  const [editTitle,  setEditTitle]    = useState<string>('');
  const [editAuthor, setEditAuthor]   = useState<string>('');
  const [editSaving, setEditSaving]   = useState(false);
  const [editError,  setEditError]    = useState<string | null>(null);

  const openEdit = (item: ContentItem) => {
    setEditTarget(item);
    setEditType(item.type);
    setEditGenres(item.categories.join(', '));
    setEditTitle(item.title);
    setEditAuthor(item.author ?? '');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editTarget || editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const genres = editGenres.split(',').map((g) => g.trim()).filter(Boolean);
      await updateContent(editTarget.id, {
        type:   editType,
        genres,
        title:  editTitle.trim() || undefined,
        author: editAuthor.trim() || undefined,
      });
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setEditSaving(false);
    }
  };

  const addDraft = () =>
    setDrafts((d) => [...d, { id: String(Date.now()), url: '', type: 'WEB_NOVEL' }]);
  const removeDraft = (id: string) =>
    setDrafts((d) => d.length > 1 ? d.filter((x) => x.id !== id) : d);
  const updateDraft = (id: string, patch: Partial<DraftRow>) =>
    setDrafts((d) => d.map((x) => x.id === id ? { ...x, ...patch } : x));

  const handleQueue = () => {
    const valid = drafts.filter((d) => d.url.trim() !== '');
    if (valid.length === 0) return;
    enqueue(valid.map((d) => ({ url: d.url.trim(), type: d.type })));
    setDrafts([{ id: '1', url: '', type: 'WEB_NOVEL' }]);
    setIngestOpen(false);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatInput.trim()) { addCategory(newCatInput.trim()); setNewCatInput(''); }
  };
  const handleSyncParser = async (id: string) => {
    setSyncingId(id);
    setSyncResult((r) => ({ ...r, [id]: '' }));
    try {
      const res = await triggerScraperSync(id);
      const data = res?.data;
      const msg = data
        ? `${data.contentScanned} books rescanned · ${data.chaptersQueued} chapters queued${data.errors > 0 ? ` · ${data.errors} errors` : ''}`
        : 'Sync complete';
      setSyncResult((r) => ({ ...r, [id]: msg }));
    } catch {
      setSyncResult((r) => ({ ...r, [id]: 'Sync failed' }));
    } finally {
      setSyncingId(null);
      setTimeout(() => setSyncResult((r) => { const n = { ...r }; delete n[id]; return n; }), 8000);
    }
  };
  const confirmDelete = () => {
    if (deleteTarget) { deleteContent(deleteTarget.id); setDeleteTarget(null); }
  };

  const activeJobs = jobs.filter((j) => j.status === 'queued' || j.status === 'running');
  const recentJobs = jobs.filter((j) => j.status === 'done' || j.status === 'error');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide">Content & Catalog Orchestrator</h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">External reading source linkages, category taxonomy, and ingestion pipeline status</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="purple" size="md">{isLoading ? 'Loading…' : `${totalContentCount} Catalog Items`}</Badge>
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIngestOpen(true)}>Add Content</Button>
        </div>
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-[#FAF7F2] dark:bg-[#120E1C] p-1 rounded-xl border border-[#E8E2D8] dark:border-[#2A223D] self-start w-fit">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-white dark:bg-[#1D1528] text-[#2D253A] dark:text-[#F3EFFC] shadow-xs'
              : 'text-[#6D6282] dark:text-[#9E94B3] hover:text-[#2D253A] dark:hover:text-[#F3EFFC]'
          }`}
        >
          Catalog
        </button>
        <button
          onClick={() => setActiveTab('featured')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'featured'
              ? 'bg-white dark:bg-[#1D1528] text-[#2D253A] dark:text-[#F3EFFC] shadow-xs'
              : 'text-[#6D6282] dark:text-[#9E94B3] hover:text-[#2D253A] dark:hover:text-[#F3EFFC]'
          }`}
        >
          <Star className="w-3 h-3" />
          Featured
          {(homeFeatured.length + exploreSpotlight.length) > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full">
              {homeFeatured.length + exploreSpotlight.length}
            </span>
          )}
        </button>
      </div>

      {/* ── CATALOG TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'catalog' && (<>

      {/* Live ingest queue panel — only rendered when jobs exist */}
      {jobs.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardHeader title="Ingest Queue" subtitle={processing ? `Processing ${activeJobs.length} job(s)…` : 'All jobs complete'} icon={<ListOrdered className="w-4 h-4" />} />
            {recentJobs.length > 0 && !processing && (
              <Button variant="ghost" size="sm" onClick={clearDone} className="text-xs shrink-0">Clear done</Button>
            )}
          </div>
          <div className="space-y-1.5">
            {jobs.map((job) => (
              <div key={job.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs border ${
                job.status === 'done'    ? 'bg-emerald-500/5 border-emerald-500/20' :
                job.status === 'error'  ? 'bg-rose-500/5 border-rose-500/20' :
                job.status === 'running'? 'bg-purple-500/5 border-purple-500/30' :
                                          'bg-[#FAF7F2] dark:bg-[#120E1C] border-[#E8E2D8] dark:border-[#2A223D]'
              }`}>
                <div className="shrink-0 w-4">
                  {job.status === 'running' && <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />}
                  {job.status === 'done'    && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {job.status === 'error'   && <XCircle className="w-4 h-4 text-rose-500" />}
                  {job.status === 'queued'  && <span className="w-4 h-4 block rounded-full border-2 border-[#9E94AB] dark:border-[#6D6282]" />}
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[#6D6282] dark:text-[#9E94B3] shrink-0">{job.type.replace('_', ' ')}</span>
                <span className="flex-1 truncate text-[#6D6282] dark:text-[#9E94B3]" title={job.url}>
                  {job.status === 'done'   ? <><strong className="text-emerald-700 dark:text-emerald-300">{job.title}</strong> — {job.chapters} chapters queued</> :
                   job.status === 'error'  ? <span className="text-rose-600 dark:text-rose-400">{job.error}</span> :
                   job.status === 'running'? <span className="text-purple-700 dark:text-purple-300">Fetching {job.url}</span> :
                   job.url}
                </span>
                {job.doneAt && (
                  <span className="shrink-0 text-[10px] text-[#9E94AB] dark:text-[#6D6282] font-mono">
                    {Math.round((job.doneAt - job.queuedAt) / 1000)}s
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Parser Cards */}
      <Card>
        <CardHeader title="Scraping Parsers & Ingestion Status" subtitle="Crawler metrics derived from real DB chapter/content counts" icon={<Globe className="w-4 h-4" />} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {scrapersLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl animate-pulse bg-[#FAF7F2] dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D]" />
          ))}
          {!scrapersLoading && parsers.length === 0 && (
            <p className="col-span-4 text-xs text-[#9E94AB] dark:text-[#6D6282] py-4">No scraper configs found. Run <code className="font-mono">node seed-scrapers.mjs</code>.</p>
          )}
          {!scrapersLoading && parsers.map((parser) => (
            <div key={parser.id} className="p-4 bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-xl flex flex-col justify-between space-y-3 hover:border-purple-500/40 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC]">{parser.name}</h4>
                  <a href={parser.targetDomain === '*' ? '#' : `https://${parser.targetDomain}`} target="_blank" rel="noreferrer"
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 mt-0.5">
                    {parser.targetDomain}<ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <Badge variant={parser.status === 'OPERATIONAL' ? 'success' : parser.status === 'DEGRADED' ? 'warning' : 'error'} size="sm" dot>{parser.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono py-1 border-y border-[#E8E2D8] dark:border-[#2A223D]/50">
                <div><span className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] block font-sans">Req Delay</span><span className="text-[#2D253A] dark:text-[#F3EFFC]">{parser.latencyMs}ms</span></div>
                <div><span className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] block font-sans">Success</span><span className={parser.successRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{parser.successRate}%</span></div>
                <div><span className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] block font-sans">Today</span><span className="text-purple-700 dark:text-purple-300">{parser.totalCrawledToday} ch</span></div>
                <div><span className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] block font-sans">Errors</span><span className={parser.errorCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#6D6282] dark:text-[#9E94B3]'}>{parser.errorCount}</span></div>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#9E94AB] dark:text-[#6D6282]">Last: {parser.lastRunAt}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={syncingId === parser.id}
                    icon={<RefreshCw className={`w-3 h-3 ${syncingId === parser.id ? 'animate-spin' : ''}`} />}
                    onClick={() => handleSyncParser(parser.id)}
                    className="text-xs py-1"
                    title="Re-fetch chapter list for all books from this domain. Discovers new chapters and updates metadata."
                  >
                    {syncingId === parser.id ? 'Syncing…' : 'Sync All'}
                  </Button>
                </div>
                {syncResult[parser.id] && (
                  <p className={`text-[10px] font-mono truncate ${
                    (syncResult[parser.id] ?? '').includes('error') || syncResult[parser.id] === 'Sync failed'
                      ? 'text-rose-500 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    ✓ {syncResult[parser.id]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader title="App Taxonomy & Categories" subtitle="Manage catalog classification categories" icon={<Layers className="w-4 h-4" />} />
        <div className="space-y-4">
          <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
            <Input placeholder="New category (e.g. Arcane Cartography)..." value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)} />
            <Button type="submit" variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>Add</Button>
          </form>
          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs font-medium text-[#2D253A] dark:text-[#F3EFFC]">
                <span>{cat}</span>
                <button onClick={() => removeCategory(cat)} className="text-[#9E94AB] hover:text-rose-500 dark:text-[#6D6282] dark:hover:text-rose-400 p-0.5 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Catalog Table */}
      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <Input placeholder="Search by title, author, source..." icon={<Search className="w-4 h-4" />} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'ALL' | ContentType)}
              options={[{ label: 'All Types', value: 'ALL' }, { label: 'Web Novels', value: 'WEB_NOVEL' }, { label: 'Light Novels', value: 'LIGHT_NOVEL' }, { label: 'Comics / Manga', value: 'MANGA' }, { label: 'E-Books', value: 'EBOOK' }]} />
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              options={[{ label: 'All Categories', value: 'ALL' }, ...categories.map((c) => ({ label: c, value: c }))]} />
          </div>
        </Card>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF7F2] dark:bg-[#120E1C] border-b border-[#E8E2D8] dark:border-[#2A223D] text-[11px] uppercase tracking-wider text-[#9E94AB] dark:text-[#6D6282] font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Title & Author</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Categories</th>
                  <th className="py-3.5 px-4">Chapters</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D8] dark:divide-[#2A223D] text-xs">
                {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-3 w-36 bg-[#E8E2D8] dark:bg-[#2A223D] rounded mb-1.5" /><div className="h-2.5 w-24 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-5 w-20 bg-[#E8E2D8] dark:bg-[#2A223D] rounded-full" /></td>
                    <td className="py-3.5 px-4"><div className="h-3 w-28 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-3 w-20 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-3 w-10 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" /></td>
                    <td className="py-3.5 px-4" />
                  </tr>
                )) : isError ? (
                  <tr><td colSpan={6} className="py-8 text-center text-rose-500 dark:text-rose-400 text-xs">Failed to load catalogue.</td></tr>
                ) : contentList.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-[#6D6282] dark:text-[#9E94B3]">No content matching the filters.</td></tr>
                ) : contentList.map((item) => (
                  <tr key={item.id} className="table-row-hover">
                    <td className="py-3.5 px-4"><div className="font-semibold text-[#2D253A] dark:text-[#F3EFFC]">{item.title}</div><div className="text-[11px] text-[#6D6282] dark:text-[#9E94B3]">By {item.author}</div></td>
                    <td className="py-3.5 px-4 whitespace-nowrap"><Badge variant="purple" size="sm">{item.type.replace('_', ' ')}</Badge></td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-[#2D253A] dark:text-[#F3EFFC] font-medium">{item.sourceSite}</div>
                      <div className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] flex items-center gap-1 mt-0.5">
                        <span>Synced {item.lastScrapedAt}</span>
                        <span className={`h-1.5 w-1.5 rounded-full ${item.parserStatus === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {item.categories.slice(0, 2).map((c) => (<span key={c} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded text-[10px]">{c}</span>))}
                        {item.tags.slice(0, 2).map((t) => (<span key={t} className="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 text-[#6D6282] dark:text-[#9E94B3] rounded text-[10px]">#{t}</span>))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[#2D253A] dark:text-[#F3EFFC]">{item.chapterCount} ch</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(item)}
                          className="inline-flex items-center gap-1 text-xs text-[#6D6282] dark:text-[#9E94B3] px-2 py-1 rounded bg-[#F2EEE8] dark:bg-[#1D1528] hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
                          title="Edit type and categories">
                          <Pencil className="w-3 h-3" />
                        </button>
                        {/* ★ Home Featured toggle */}
                        <button
                          onClick={async () => {
                            const existing = homeFeatured.find(p => p.content.id === item.id);
                            if (existing) { unpin(existing.id); }
                            else { try { await pin('home_featured', 'Featured Books', item.id, homeFeatured.length); } catch{} }
                          }}
                          className={`inline-flex items-center gap-0.5 text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
                            homeFeatured.some(p => p.content.id === item.id)
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-[#F2EEE8] dark:bg-[#1D1528] text-[#9E94AB] hover:bg-amber-500/10 hover:text-amber-600'
                          }`}
                          title={homeFeatured.some(p => p.content.id === item.id) ? 'Remove from Home Featured' : 'Add to Home Featured'}
                        >
                          <Star className="w-3 h-3" />
                          <span className="text-[9px] font-semibold">H</span>
                        </button>
                        {/* ◆ Explore Spotlight toggle */}
                        <button
                          onClick={async () => {
                            const existing = exploreSpotlight.find(p => p.content.id === item.id);
                            if (existing) { unpin(existing.id); }
                            else {
                              // Spotlight is single — unpin any current one first
                              for (const old of exploreSpotlight) { unpin(old.id); }
                              try { await pin('explore_spotlight', 'Archival Spotlight', item.id, 0); } catch{}
                            }
                          }}
                          className={`inline-flex items-center gap-0.5 text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
                            exploreSpotlight.some(p => p.content.id === item.id)
                              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                              : 'bg-[#F2EEE8] dark:bg-[#1D1528] text-[#9E94AB] hover:bg-purple-500/10 hover:text-purple-600'
                          }`}
                          title={exploreSpotlight.some(p => p.content.id === item.id) ? 'Remove from Explore Spotlight' : 'Set as Explore Spotlight'}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span className="text-[9px] font-semibold">E</span>
                        </button>
                        <a href={item.sourceUrl} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 transition-colors">
                          Source<ExternalLink className="w-3 h-3" />
                        </a>
                        <button onClick={() => setDeleteTarget({ id: item.id, title: item.title })}
                          className="inline-flex items-center text-xs text-rose-600 dark:text-rose-400 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add Content Modal — instant queue, no blocking */}
      {ingestOpen && (
        <Modal isOpen onClose={() => { setIngestOpen(false); setDrafts([{ id: '1', url: '', type: 'WEB_NOVEL' }]); }}
          title="Add Content to Ingest Queue"
          subtitle="Jobs run in the background — you can continue using the page once queued."
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => { setIngestOpen(false); setDrafts([{ id: '1', url: '', type: 'WEB_NOVEL' }]); }}>Cancel</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addDraft} icon={<Plus className="w-3.5 h-3.5" />}>Add Row</Button>
                <Button variant="primary" size="sm" onClick={handleQueue} disabled={drafts.every((d) => !d.url.trim())}>
                  Queue {drafts.filter((d) => d.url.trim() !== '').length} Title(s) →
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-2">
            {drafts.map((draft, idx) => (
              <div key={draft.id} className="flex items-center gap-2">
                <span className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] font-mono w-5 shrink-0 text-center">{idx + 1}</span>
                <input type="url" placeholder="https://royalroad.com/fiction/… or https://mangadex.org/title/…"
                  value={draft.url} onChange={(e) => updateDraft(draft.id, { url: e.target.value })}
                  className="flex-1 min-w-0 bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] placeholder-[#9E94AB] dark:placeholder-[#6D6282] px-3 py-2 focus:outline-none focus:border-purple-500" />
                <select value={draft.type} onChange={(e) => updateDraft(draft.id, { type: e.target.value as ContentType })}
                  className="shrink-0 bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] px-2 py-2 focus:outline-none focus:border-purple-500">
                  {CONTENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={() => removeDraft(draft.id)} disabled={drafts.length === 1}
                  className="text-[#9E94AB] hover:text-rose-500 dark:text-[#6D6282] dark:hover:text-rose-400 disabled:opacity-30 cursor-pointer shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      </>)} {/* end activeTab === 'catalog' */}

      {/* ── FEATURED TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'featured' && (
        <div className="space-y-6">
          {/* Explore Spotlight — single pinned book */}
          <Card>
            <CardHeader
              title="Explore Page — Archival Spotlight"
              subtitle="The banner at the top of the Explore page. Pin exactly one book."
              icon={<Star className="w-4 h-4 text-amber-500" />}
            />
            <div className="space-y-3 mt-2">
              {featuredLoading ? (
                <div className="animate-pulse h-16 rounded-xl bg-[#FAF7F2] dark:bg-[#1A1528]" />
              ) : exploreSpotlight.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-[#9E94AB] dark:text-[#6D6282]">
                    No spotlight set. Go to the Catalog tab and click the ★ on any book.
                  </p>
                </div>
              ) : (
                exploreSpotlight.map(pin => (
                  <div key={pin.id} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/30">
                    {pin.content.coverImageUrl && (
                      <img src={pin.content.coverImageUrl} alt={pin.content.title}
                        className="w-12 h-16 object-cover rounded-lg shrink-0 shadow-sm" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC] truncate">{pin.content.title}</p>
                      <p className="text-[10px] text-[#9E94AB] mt-0.5">{pin.content.type.replace('_',' ')} · {pin.content.chapterCount} ch</p>
                      <p className="text-[10px] text-[#9E94AB]">Label: <em>{pin.label}</em></p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggle(pin.id, !pin.enabled)}
                        className={`text-[10px] px-2 py-1 rounded-full border font-semibold cursor-pointer transition-colors ${
                          pin.enabled
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-stone-400/10 text-stone-500 border-stone-400/30'
                        }`}
                      >
                        {pin.enabled ? 'Live' : 'Hidden'}
                      </button>
                      <button onClick={() => unpin(pin.id)}
                        className="p-1.5 rounded-lg text-[#9E94AB] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Home Featured Row — multiple pinned books */}
          <Card>
            <CardHeader
              title="Home Page — Featured Books Section"
              subtitle="The dedicated Featured Books row above Recommended. Add up to 8 books."
              icon={<Star className="w-4 h-4 text-amber-500" />}
            />
            <div className="space-y-2 mt-2">
              {featuredLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-14 rounded-xl bg-[#FAF7F2] dark:bg-[#1A1528]" />
                ))
              ) : homeFeatured.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-[#9E94AB] dark:text-[#6D6282]">
                    No featured books yet. Go to the Catalog tab and click the ★ on any book.
                  </p>
                </div>
              ) : (
                homeFeatured.map((pin, idx) => (
                  <div key={pin.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] group">
                    <span className="text-[10px] font-mono text-[#9E94AB] w-5 shrink-0 text-center">{idx + 1}</span>
                    {pin.content.coverImageUrl && (
                      <img src={pin.content.coverImageUrl} alt={pin.content.title}
                        className="w-8 h-11 object-cover rounded-md shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#2D253A] dark:text-[#F3EFFC] truncate">{pin.content.title}</p>
                      <p className="text-[10px] text-[#9E94AB]">{pin.content.type.replace('_',' ')} · {pin.content.chapterCount} ch</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {idx > 0 && (
                        <button onClick={() => { const prev = homeFeatured[idx-1]; if(prev) { reorder(pin.id, idx-1); reorder(prev.id, idx); } }}
                          className="p-1 rounded text-[#9E94AB] hover:text-purple-600 hover:bg-purple-500/10 cursor-pointer text-[10px]" title="Move up">↑</button>
                      )}
                      {idx < homeFeatured.length - 1 && (
                        <button onClick={() => { const next = homeFeatured[idx+1]; if(next) { reorder(pin.id, idx+1); reorder(next.id, idx); } }}
                          className="p-1 rounded text-[#9E94AB] hover:text-purple-600 hover:bg-purple-500/10 cursor-pointer text-[10px]" title="Move down">↓</button>
                      )}
                      <button
                        onClick={() => toggle(pin.id, !pin.enabled)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold cursor-pointer ${
                          pin.enabled
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-stone-400/10 text-stone-500 border-stone-400/30'
                        }`}
                      >{pin.enabled ? 'Live' : 'Hidden'}</button>
                      <button onClick={() => unpin(pin.id)}
                        className="p-1.5 rounded-lg text-[#9E94AB] hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick-pin from catalog search */}
          <Card>
            <CardHeader
              title="Quick Pin from Catalog"
              subtitle="Search any book in the catalog and pin it to either section"
              icon={<Search className="w-4 h-4" />}
            />
            <div className="mt-3 space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E94AB]" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search books by title..."
                    className="w-full bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] pl-9 pr-3 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <select
                  value={pinSection}
                  onChange={e => setPinSection(e.target.value as 'home_featured' | 'explore_spotlight')}
                  className="bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-xs text-[#2D253A] dark:text-[#F3EFFC] px-3 py-2 focus:outline-none focus:border-purple-500"
                >
                  <option value="home_featured">Home — Featured Row</option>
                  <option value="explore_spotlight">Explore — Spotlight</option>
                </select>
              </div>
              {searchQuery.trim().length > 0 && (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse h-10 rounded-lg bg-[#FAF7F2] dark:bg-[#1A1528]" />
                    ))
                  ) : contentList.length === 0 ? (
                    <p className="text-xs text-[#9E94AB] py-2 text-center">No books found</p>
                  ) : (
                    contentList.map(item => {
                      const alreadyPinned = [...homeFeatured, ...exploreSpotlight].some(p => p.content.id === item.id);
                      return (
                        <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D]">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#2D253A] dark:text-[#F3EFFC] truncate">{item.title}</p>
                            <p className="text-[10px] text-[#9E94AB]">{item.type.replace('_',' ')} · by {item.author}</p>
                          </div>
                          {alreadyPinned ? (
                            <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full border border-amber-500/25 font-medium">Pinned</span>
                          ) : (
                            <Button variant="outline" size="sm" isLoading={isPinning}
                              onClick={async () => {
                                setPinError(null);
                                try {
                                  const label = pinSection === 'explore_spotlight' ? 'Archival Spotlight' : 'Featured Books';
                                  const nextOrder = pinSection === 'home_featured' ? homeFeatured.length : 0;
                                  await pin(pinSection, label, item.id, nextOrder);
                                } catch(e) { setPinError(e instanceof Error ? e.message : 'Failed'); }
                              }}>
                              Pin ★
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              {pinError && (
                <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{pinError}</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal isOpen onClose={() => setDeleteTarget(null)} title="Delete Content"
          subtitle="Cannot be undone. All chapters will be permanently removed."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={confirmDelete}>Delete Permanently</Button>
            </div>
          }
        >
          <p className="text-sm text-[#2D253A] dark:text-[#F3EFFC]">Delete <strong>{deleteTarget.title}</strong> and all its chapters?</p>
        </Modal>
      )}

      {/* Edit Book Modal */}
      {editTarget && (
        <Modal
          isOpen
          onClose={() => setEditTarget(null)}
          title={`Edit: ${editTarget.title}`}
          subtitle="Update the content type, genres, title, and author. Changes persist immediately."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button variant="primary" size="sm" isLoading={editSaving} onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1.5">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Book title" />
            </div>
            <div>
              <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1.5">Author</label>
              <Input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} placeholder="Author name" />
            </div>
            <div>
              <Select
                label="Content Type"
                value={editType}
                onChange={(e) => setEditType(e.target.value as ContentType)}
                options={CONTENT_TYPE_OPTIONS}
              />
            </div>
            <div>
              <label className="block font-medium text-[#2D253A] dark:text-[#F3EFFC] mb-1">
                Genres
              </label>
              <p className="text-[11px] text-[#9E94AB] dark:text-[#6D6282] mb-1.5">
                Comma-separated list — these are the values matched by the web app category filter.
              </p>
              <Input
                value={editGenres}
                onChange={(e) => setEditGenres(e.target.value)}
                placeholder="Fantasy, Action, Dark Fantasy"
              />
              {/* Show available DB categories as quick-add chips */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {categories.map((cat) => {
                    const active = editGenres.split(',').map(g => g.trim()).includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const current = editGenres.split(',').map(g => g.trim()).filter(Boolean);
                          if (active) {
                            setEditGenres(current.filter(g => g !== cat).join(', '));
                          } else {
                            setEditGenres([...current, cat].join(', '));
                          }
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors cursor-pointer ${
                          active
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-[#FAF7F2] dark:bg-[#120E1C] text-[#6D6282] dark:text-[#9E94B3] border-[#E8E2D8] dark:border-[#2A223D] hover:border-purple-400'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}{cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {editError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 dark:text-rose-300">
                {editError}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
