
/**
 * CreatorDashboard
 *
 * Landing page for users with VERIFIED_WRITER role.
 * Shown when navigating to /creator.
 *
 * Phase 1 — Functional scaffold with:
 *   - Welcome header with pen name / role badge
 *   - Quick-action cards (Create Story, My Works, Community)
 *   - "Coming soon" callouts for future creator tools
 *
 * Constitution refs:
 *   §4.2 Tailwind-only styling, lazy-loaded route chunk
 *   §P1  Mobile-first layout
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Feather, BookOpen, Plus, Users, BarChart2,
  ShieldCheck, Sparkles, ChevronRight, Clock,
} from 'lucide-react';
import { useUser } from '../../../hooks/useUser.js';
import { useCreatorWorks } from '../hooks/useCreatorWorks';
import CreateWorkModal from './CreateWorkModal';

// ---------------------------------------------------------------------------
// Quick-action card
// ---------------------------------------------------------------------------

interface ActionCardProps {
  icon:        React.ReactNode;
  title:       string;
  description: string;
  label:       string;
  onClick:     () => void;
  comingSoon?: boolean;
  accent?:     string; // tailwind bg class for the icon box
}

function ActionCard({ icon, title, description, label, onClick, comingSoon, accent = 'bg-[#F2EDFA] dark:bg-[#2C213B]' }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={comingSoon}
      className={`
        group w-full text-left bg-white dark:bg-[#1D1726] rounded-2xl p-5
        border border-[#EFEAE2] dark:border-[#352B44]
        shadow-xs hover:shadow-md hover:border-[#D4C8EA] dark:hover:border-[#4A3762]
        active:scale-[0.98] transition-all
        ${comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl ${accent} border border-[#E3D9F2] dark:border-[#43345A] flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-bold text-[#2D223B] dark:text-[#F1ECF7] group-hover:text-[#43335A] dark:group-hover:text-[#FFDE88] transition-colors">
              {title}
            </h3>
            {comingSoon && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#F2EDFA] dark:bg-[#2C213B] text-[#7A6B8A] dark:text-[#A899B8] border border-[#E3D9F2] dark:border-[#43345A]">
                <Clock className="w-2.5 h-2.5" /> Soon
              </span>
            )}
          </div>
          <p className="text-xs text-[#80778B] dark:text-[#9F94AC] leading-relaxed">
            {description}
          </p>
          {!comingSoon && (
            <span className="inline-flex items-center gap-1 mt-2.5 text-xs font-semibold text-[#43335A] dark:text-[#C5BACF] group-hover:gap-2 transition-all">
              {label} <ChevronRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Stat pill
// ---------------------------------------------------------------------------

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-3 bg-white dark:bg-[#1D1726] rounded-xl border border-[#EFEAE2] dark:border-[#352B44]">
      <span className="text-xl font-bold font-serif text-[#2D223B] dark:text-[#F1ECF7]">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#80778B] dark:text-[#9F94AC]">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreatorDashboard
// ---------------------------------------------------------------------------

export default function CreatorDashboard() {
  const navigate  = useNavigate();
  const { user }  = useUser();
  const { totalWorks, totalChapters, isLoading: worksLoading } = useCreatorWorks();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-2 px-5 sm:px-6 lg:px-0 text-[#2D223B] dark:text-[#F1ECF7] w-full">

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <section className="mb-7">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F2EDFA] dark:bg-[#2C213B] border border-[#E3D9F2] dark:border-[#43345A] flex items-center justify-center flex-shrink-0">
            <Feather className="w-5 h-5 text-[#43335A] dark:text-[#C5BACF]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2D223B] dark:text-[#F1ECF7] tracking-tight">
                Creator Studio
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <ShieldCheck className="w-3 h-3" /> Verified Writer
              </span>
            </div>
            <p className="text-sm text-[#7F768B] dark:text-[#A397B0]">
              Welcome back, <span className="font-semibold text-[#43335A] dark:text-[#C5BACF]">{user.displayName.split(' ')[0]}</span>. Your archive awaits.
            </p>
          </div>
        </div>

        {/* Live stat pills */}
        <div className="grid grid-cols-3 gap-3">
          <StatPill label="Works"    value={worksLoading ? '…' : totalWorks} />
          <StatPill label="Chapters" value={worksLoading ? '…' : totalChapters} />
          <StatPill label="Readers"  value={0} />
        </div>
      </section>

      {/* ── Action cards ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#80778B] dark:text-[#9F94AC] px-0.5 mb-2">
          What would you like to do?
        </h2>

        <ActionCard
          icon={<Plus className="w-5 h-5 text-[#43335A] dark:text-[#C5BACF]" />}
          title="Start a new work"
          description="Create a new web novel, light novel, comic, or ebook and begin serialising chapters."
          label="Create work"
          accent="bg-[#F2EDFA] dark:bg-[#2C213B]"
          onClick={() => setShowCreate(true)}
        />

        <ActionCard
          icon={<BookOpen className="w-5 h-5 text-[#DE9B35]" />}
          title="My works"
          description="Manage your published and draft works, edit chapters, and track reading progress."
          label="View works"
          accent="bg-[#FAF4E6] dark:bg-[#2B2111]"
          onClick={() => navigate('/creator/works')}
        />

        <ActionCard
          icon={<BarChart2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          title="Analytics"
          description="Track reads, chapter retention, and reader engagement across your catalogue."
          label="View analytics"
          accent="bg-emerald-50 dark:bg-emerald-950/40"
          onClick={() => {}}
          comingSoon
        />

        <ActionCard
          icon={<Users className="w-5 h-5 text-blue-500" />}
          title="Community"
          description="Connect with readers in Reading Circles and respond to Marginalia on your works."
          label="Open community"
          accent="bg-blue-50 dark:bg-blue-950/40"
          onClick={() => navigate('/community')}
        />

        <ActionCard
          icon={<Sparkles className="w-5 h-5 text-[#DE9B35]" />}
          title="Ask Liber"
          description="Use Liber AI to brainstorm ideas, improve prose, or get reader mood recommendations."
          label="Open Liber"
          accent="bg-[#FAF4E6] dark:bg-[#2B2111]"
          onClick={() => navigate('/liber')}
        />
      </section>

      {/* ── Guidelines callout ───────────────────────────────────────────── */}
      <section className="mt-8 p-4 rounded-2xl bg-[#F2EDFA] dark:bg-[#1D1726] border border-[#E3D9F2] dark:border-[#352B44]">
        <h3 className="text-xs font-bold text-[#43335A] dark:text-[#C5BACF] mb-1">
          Creator Guidelines
        </h3>
        <p className="text-xs text-[#80778B] dark:text-[#9F94AC] leading-relaxed">
          All uploaded works are subject to Arcanium's content policy and community standards.
          Stories that violate guidelines may be quarantined or removed. Serialise responsibly.
        </p>
      </section>

      <CreateWorkModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => navigate(`/creator/works/${id}/chapters`)}
      />
    </div>
  );
}
