import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Sparkles,
  DollarSign,
  TrendingUp,
  Feather,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAdminStats } from '../hooks/useAdminStats';
import { useScrapers } from '../hooks/useScrapers';
import { useAdminStore } from '../stores/adminStore';
import { Card, CardHeader, Badge, Button } from '../components/ui';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { stats, activities, activityLoading } = useAdminStats();
  const { parsers, scrapersLoading } = useScrapers();
  const creators = useAdminStore((s) => s.creators);

  const [activityFilter, setActivityFilter] = useState<'ALL' | 'USER' | 'CREATOR' | 'FLAG' | 'CONTENT' | 'AI'>('ALL');

  const pendingCreators = creators.filter((c) => c.status === 'PENDING').length;
  const filteredActivities = activities.filter((a) =>
    activityFilter === 'ALL' ? true : a.type === activityFilter
  );

  // Null-safe: stats is null while the query is loading
  const totalUsers              = stats?.totalUsers              ?? 0;
  const totalUsersChange        = stats?.totalUsersChange        ?? 0;
  const dailyReadingHours       = stats?.dailyReadingHours       ?? 0;
  const dailyReadingHoursChange = stats?.dailyReadingHoursChange ?? 0;
  const activeLiberChats        = stats?.activeLiberChats        ?? 0;
  const activeLiberChatsChange  = stats?.activeLiberChatsChange  ?? 0;
  const monthlyTokenCost        = stats?.monthlyTokenCost        ?? 0;
  const monthlyTokenCostLimit   = stats?.monthlyTokenCostLimit   ?? 1000;
  const budgetPct = Math.round((monthlyTokenCost / monthlyTokenCostLimit) * 100);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide">
            Arcanium Control Plane
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Real-time telemetry, user management, and AI Liber orchestrator
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            icon={<Sliders className="w-3.5 h-3.5" />}
            onClick={() => navigate('/settings')}
          >
            Manage Flags
          </Button>
        </div>
      </div>

      {/* 4 High-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Users */}
        <Card className="hover:border-purple-500/40 transition-colors group cursor-pointer" onClick={() => navigate('/users')}>
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{totalUsersChange}%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#2D253A] dark:text-[#F3EFFC] font-mono">
              {totalUsers.toLocaleString()}
            </div>
            <div className="text-xs text-[#6D6282] dark:text-[#9E94B3] mt-1 flex items-center justify-between">
              <span>Total Active Readers</span>
              <span className="text-[11px] text-purple-600 dark:text-purple-300">View users &rarr;</span>
            </div>
          </div>
        </Card>

        {/* Metric 2: Daily Reading Hours */}
        <Card className="hover:border-amber-500/40 transition-colors group cursor-pointer" onClick={() => navigate('/content')}>
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{dailyReadingHoursChange}%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#2D253A] dark:text-[#F3EFFC] font-mono">
              {dailyReadingHours.toLocaleString()} hrs
            </div>
            <div className="text-xs text-[#6D6282] dark:text-[#9E94B3] mt-1 flex items-center justify-between">
              <span>Daily Reading Volume</span>
              <span className="text-[11px] text-amber-600 dark:text-amber-300">Catalog &rarr;</span>
            </div>
          </div>
        </Card>

        {/* Metric 3: Active Liber AI Chats */}
        <Card className="hover:border-purple-500/40 transition-colors group cursor-pointer" onClick={() => navigate('/ai-liber')}>
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{activeLiberChatsChange}%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#2D253A] dark:text-[#F3EFFC] font-mono">
              {activeLiberChats.toLocaleString()}
            </div>
            <div className="text-xs text-[#6D6282] dark:text-[#9E94B3] mt-1 flex items-center justify-between">
              <span>Active Liber Sessions</span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-300">Inference &rarr;</span>
            </div>
          </div>
        </Card>

        {/* Metric 4: Monthly Token Cost */}
        <Card className="hover:border-cyan-500/40 transition-colors group cursor-pointer" onClick={() => navigate('/ai-liber')}>
          <div className="flex items-start justify-between">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              {budgetPct}% of limit
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#2D253A] dark:text-[#F3EFFC] font-mono">
              ${monthlyTokenCost.toFixed(2)}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#E5DFD5] dark:bg-[#211A34] rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <div className="text-[11px] text-[#9E94AB] dark:text-[#6D6282] mt-1.5 font-mono">
              Limit: ${monthlyTokenCostLimit.toFixed(2)} / mo
            </div>
          </div>
        </Card>
      </div>

      {/* Grid: Activity Log (2/3) + Quick Ops & Status (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-[#2D253A] dark:text-[#F3EFFC]">
                  System Activity Stream
                </h2>
                <p className="text-xs text-[#6D6282] dark:text-[#9E94B3]">
                  Real-time operational events and audit actions
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#FAF7F2] dark:bg-[#120E1C] p-1 rounded-lg border border-[#E8E2D8] dark:border-[#2A223D] text-[11px] overflow-x-auto">
                {(['ALL', 'USER', 'CREATOR', 'CONTENT', 'FLAG'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActivityFilter(filter)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      activityFilter === filter
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-[#6D6282] dark:text-[#9E94B3] hover:text-[#2D253A] dark:hover:text-[#F3EFFC]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {activityLoading && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse p-3.5 rounded-lg bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-40 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" />
                    <div className="h-4 w-14 bg-[#E8E2D8] dark:bg-[#2A223D] rounded-full" />
                  </div>
                  <div className="h-2.5 w-64 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" />
                  <div className="h-2 w-32 bg-[#E8E2D8] dark:bg-[#2A223D] rounded" />
                </div>
              ))}
              {!activityLoading && filteredActivities.length === 0 && (
                <p className="text-xs text-[#9E94AB] dark:text-[#6D6282] py-4 text-center">
                  No activity events yet.
                </p>
              )}
              {!activityLoading && filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-lg bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] hover:border-purple-500/40 transition-colors flex items-start justify-between gap-4 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#2D253A] dark:text-[#F3EFFC]">{act.title}</span>
                      <Badge
                        variant={
                          act.severity === 'danger'
                            ? 'error'
                            : act.severity === 'warning'
                            ? 'warning'
                            : act.severity === 'success'
                            ? 'success'
                            : 'purple'
                        }
                        size="sm"
                      >
                        {act.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6D6282] dark:text-[#9E94B3] leading-relaxed">{act.description}</p>
                    <div className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] font-mono">
                      Actor: {act.actor}
                    </div>
                  </div>

                  <span className="text-[11px] text-[#9E94AB] dark:text-[#6D6282] shrink-0 whitespace-nowrap">
                    {act.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Control & Status Panes */}
        <div className="space-y-6">
          {/* Creator Queue Alert Card */}
          {pendingCreators > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/[0.06] dark:bg-amber-500/[0.04]">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/15 rounded-lg text-amber-600 dark:text-amber-300 shrink-0 mt-0.5">
                  <Feather className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                    {pendingCreators} Creator Applications Pending
                  </h3>
                  <p className="text-[11px] text-[#6D6282] dark:text-[#9E94B3]">
                    Authors are awaiting verification to self-publish serialized works.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                    onClick={() => navigate('/creators')}
                  >
                    Review Queue &rarr;
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Scrapers Status Card */}
          <Card>
            <CardHeader
              title="Scraper Ingestion Nodes"
              subtitle="External webnovel & comic sources"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-purple-600 dark:text-purple-300"
                  onClick={() => navigate('/content')}
                >
                  Manage
                </Button>
              }
            />
            <div className="space-y-2.5">
              {scrapersLoading && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse h-12 rounded-lg bg-[#FAF7F2] dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D]" />
              ))}
              {!scrapersLoading && parsers.length === 0 && (
                <p className="text-xs text-[#9E94AB] dark:text-[#6D6282] py-2">No parser configs found.</p>
              )}
              {!scrapersLoading && parsers.map((parser) => (
                <div
                  key={parser.id}
                  className="p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-medium text-[#2D253A] dark:text-[#F3EFFC] flex items-center gap-1.5">
                      {parser.name}
                    </div>
                    <div className="text-[10px] text-[#9E94AB] dark:text-[#6D6282] mt-0.5">
                      {parser.latencyMs}ms delay &bull; {parser.successRate}% success
                    </div>
                  </div>
                  <Badge
                    variant={parser.status === 'OPERATIONAL' ? 'success' : parser.status === 'DEGRADED' ? 'warning' : 'error'}
                    size="sm"
                    dot
                  >
                    {parser.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Moods Card */}
          <Card>
            <CardHeader
              title="Diagnosed Moods"
              subtitle="Top reader vibe queries this week"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-purple-600 dark:text-purple-300"
                  onClick={() => navigate('/ai-liber')}
                >
                  Deep Dive
                </Button>
              }
            />
            <div className="space-y-2.5">
              {/* Moods are loaded by the Liber Analytics page — show placeholder here */}
              <p className="text-xs text-[#9E94AB] dark:text-[#6D6282] py-2">
                Visit the AI Liber page for live mood analytics.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
