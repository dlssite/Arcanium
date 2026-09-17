import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ExternalLink,
  MessageCircle,
  Heart,
  Users,
  Sparkles,
  Globe,
  Send,
  Coffee,
  BookOpen,
  Shield,
  Crown,
  Compass,
  Mail,
  Share2,
  Check,
  Flame,
  ArrowRight,
  Radio,
  Tv,
} from 'lucide-react';
import { connectApi } from '@arcanium/api-client';

interface ConnectCard {
  id: string;
  title: string;
  description: string | null;
  url: string;
  iconName: string | null;
  category: 'COMMUNITY' | 'SPONSOR' | 'SOCIAL' | 'OTHER';
  displayOrder: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  COMMUNITY: 'Guild Communities',
  SPONSOR: 'Patrons & Sponsors',
  SOCIAL: 'Social Conduits',
  OTHER: 'Sanctum Portals',
};

const CATEGORY_ICONS: Record<string, any> = {
  COMMUNITY: Users,
  SPONSOR: Heart,
  SOCIAL: MessageCircle,
  OTHER: Compass,
};

const ICON_MAP: Record<string, any> = {
  discord: MessageCircle,
  community: Users,
  telegram: Send,
  patreon: Heart,
  kofi: Coffee,
  coffee: Coffee,
  buy_me_a_coffee: Coffee,
  website: Globe,
  web: Globe,
  mail: Mail,
  email: Mail,
  book: BookOpen,
  shield: Shield,
  crown: Crown,
  sparkles: Sparkles,
  flame: Flame,
  radio: Radio,
  stream: Tv,
  media: Tv,
};

function getDynamicIcon(iconName: string | null, category: string) {
  if (iconName) {
    const key = iconName.toLowerCase().replace(/[-_]/g, '');
    for (const [mapKey, Icon] of Object.entries(ICON_MAP)) {
      if (key.includes(mapKey.replace(/[-_]/g, ''))) return Icon;
    }
  }
  return CATEGORY_ICONS[category] || Globe;
}

// Category theme color definitions
const CATEGORY_THEMES: Record<string, { badge: string; iconBg: string; borderGlow: string }> = {
  COMMUNITY: {
    badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    iconBg: 'from-purple-600 to-indigo-600 text-white',
    borderGlow: 'hover:border-purple-400/60 dark:hover:border-purple-400/50',
  },
  SPONSOR: {
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    iconBg: 'from-rose-500 to-amber-500 text-white',
    borderGlow: 'hover:border-rose-400/60 dark:hover:border-rose-400/50',
  },
  SOCIAL: {
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    iconBg: 'from-blue-600 to-cyan-500 text-white',
    borderGlow: 'hover:border-blue-400/60 dark:hover:border-blue-400/50',
  },
  OTHER: {
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    iconBg: 'from-amber-600 to-orange-500 text-white',
    borderGlow: 'hover:border-amber-400/60 dark:hover:border-amber-400/50',
  },
};

export default function ConnectView() {
  const { data, isLoading, isError } = useQuery<ConnectCard[]>({
    queryKey: ['connect-cards'],
    queryFn: async () => {
      const response = await connectApi.list();
      if (response.error) throw new Error(response.error.message);
      return response.data ?? [];
    },
  });

  const cards: ConnectCard[] = data ?? [];
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Group cards by category
  const cardsByCategory: Record<string, ConnectCard[]> = {};
  for (const card of cards) {
    const list = cardsByCategory[card.category] ?? [];
    list.push(card);
    cardsByCategory[card.category] = list;
  }

  const rawCategories = Object.keys(cardsByCategory).sort();

  const filteredCards = useMemo(() => {
    if (selectedCategory === 'ALL') return cards;
    return cards.filter(c => c.category === selectedCategory);
  }, [cards, selectedCategory]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-4 text-[#2D253A] dark:text-[#F1ECF7] animate-pulse space-y-6">
        <div className="h-44 w-full bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-stone-200/70 dark:bg-[#1E1729] rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
          <Globe className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-[#2D253A] dark:text-[#F1ECF7]">
          Failed to Connect to Realm Portals
        </h2>
        <p className="text-xs text-[#80778B] dark:text-[#9E94AB] max-w-sm">
          Please check your connection and refresh the archival conduits.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#120E18] pb-28 lg:pb-12 pt-3 sm:pt-4 px-4 sm:px-6 lg:px-0 text-[#2D253A] dark:text-[#F1ECF7] select-none w-full transition-colors duration-200">
      
      {/* Hero Header Section */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#39264D] via-[#4D356A] to-[#684C8B] p-5 sm:p-8 text-white shadow-xl overflow-hidden mb-6 sm:mb-8 border border-[#523A73]">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-purple-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/15 text-[#FFDE88] mb-2">
              <Compass className="w-3.5 h-3.5 text-[#FFDE88]" />
              <span>Sanctum Conduits & External Portals</span>
            </div>
            <h1 className="font-serif font-bold text-2xl sm:text-4xl lg:text-5xl leading-tight">
              Connect With Arcanium
            </h1>
            <p className="text-xs sm:text-sm text-stone-200/90 mt-1.5 sm:mt-2 leading-relaxed">
              Join our vibrant scholarly communities, support continuous archival translation, and discover channels for discussions, releases, and creator collaborations.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-black/30 backdrop-blur-md px-4 py-2.5 sm:py-3 rounded-2xl border border-white/10 text-center">
              <span className="block font-serif font-bold text-base sm:text-lg text-[#FFDE88]">{cards.length}</span>
              <span className="text-[9.5px] sm:text-[10px] text-stone-300 font-semibold uppercase tracking-wider">Active Conduits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all border ${
            selectedCategory === 'ALL'
              ? 'bg-[#523F71] text-white border-[#523F71] dark:bg-[#FFDE88] dark:text-[#2D223B] dark:border-[#FFDE88] shadow-xs'
              : 'bg-white dark:bg-[#1A1423] border-[#ECE7DF] dark:border-[#312740] text-[#6D6282] dark:text-[#9E94AB] hover:border-purple-300'
          }`}
        >
          ✨ All Portals ({cards.length})
        </button>

        {rawCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all border ${
              selectedCategory === cat
                ? 'bg-[#523F71] text-white border-[#523F71] dark:bg-[#FFDE88] dark:text-[#2D223B] dark:border-[#FFDE88] shadow-xs'
                : 'bg-white dark:bg-[#1A1423] border-[#ECE7DF] dark:border-[#312740] text-[#6D6282] dark:text-[#9E94AB] hover:border-purple-300'
            }`}
          >
            {CATEGORY_LABELS[cat] || cat} ({(cardsByCategory[cat] ?? []).length})
          </button>
        ))}
      </div>

      {/* Connect Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#1A1423] border border-[#ECE7DF] dark:border-[#312740] p-12 text-center space-y-3">
          <Compass className="w-10 h-10 text-[#80778B] mx-auto" />
          <h3 className="font-serif font-bold text-base text-[#2D253A] dark:text-[#F1ECF7]">
            No portals currently available in this category
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCards.map((card) => {
            const Icon = getDynamicIcon(card.iconName, card.category);
            const theme = CATEGORY_THEMES[card.category] || CATEGORY_THEMES['OTHER']!;

            return (
              <a
                key={card.id}
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative rounded-3xl bg-white/95 dark:bg-[#1A1423]/95 backdrop-blur-md border border-[#ECE7DF] dark:border-[#312740] p-5 sm:p-6 shadow-soft-card dark:shadow-dark-card ${theme.borderGlow} hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col justify-between`}
                style={{
                  boxShadow: '0 4px 20px -2px rgba(67, 50, 88, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
                }}
              >
                {/* Ambient Radial Hover Glow */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

                <div>
                  {/* Top Row: Category Tag + External Link Arrow */}
                  <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border shadow-2xs ${theme.badge}`}>
                      {CATEGORY_LABELS[card.category] || card.category}
                    </span>

                    <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-[#251D30] text-[#80778B] dark:text-[#9E94AB] group-hover:text-[#523F71] dark:group-hover:text-[#FFDE88] group-hover:bg-purple-500/10 flex items-center justify-center transition-all">
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>

                  {/* Main Info: Icon + Title & Description */}
                  <div className="flex items-start gap-4 relative z-10">
                    {/* Glowing Icon Container */}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${theme.iconBg} flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif font-bold text-lg sm:text-xl text-[#2D253A] dark:text-[#F1ECF7] group-hover:text-[#523F71] dark:group-hover:text-[#FFDE88] transition-colors leading-snug">
                        {card.title}
                      </h3>
                      {card.description && (
                        <p className="text-xs sm:text-[13px] text-[#80778B] dark:text-[#9E94AB] mt-1.5 leading-relaxed line-clamp-2">
                          {card.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Portal Link Bar */}
                <div className="mt-5 pt-3.5 border-t border-[#ECE7DF]/80 dark:border-[#312740] flex items-center justify-between text-xs font-bold text-[#523F71] dark:text-[#FFDE88] relative z-10">
                  <span className="text-[11px] text-[#80778B] dark:text-[#9E94AB] font-normal truncate max-w-[200px] sm:max-w-xs">
                    {card.url.replace(/^https?:\/\//, '')}
                  </span>
                  <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Enter Portal <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
