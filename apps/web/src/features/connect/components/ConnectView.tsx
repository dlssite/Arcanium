import { useQuery } from '@tanstack/react-query';
import { ExternalLink, MessageCircle, Heart, Users, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
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
  COMMUNITY: 'Community',
  SPONSOR: 'Sponsors',
  SOCIAL: 'Social',
  OTHER: 'More',
};

const FALLBACK_ICONS: Record<string, any> = {
  COMMUNITY: Users,
  SPONSOR: Heart,
  SOCIAL: MessageCircle,
  OTHER: Sparkles,
};

function getDynamicIcon(iconName: string | null, category: string) {
  if (!iconName) return FALLBACK_ICONS[category] || ExternalLink;
  
  // Try to get the icon from lucide-react
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent || FALLBACK_ICONS[category] || ExternalLink;
}

export default function ConnectView() {
  const { data, isLoading, isError } = useQuery<ConnectCard[]>({
    queryKey: ['connect-cards'],
    queryFn: async () => {
      const response = await connectApi.list();
      return response.data;
    },
  });

  const cards = data || [];

  // Group cards by category
  const cardsByCategory = cards.reduce((acc, card) => {
    if (!acc[card.category]) {
      acc[card.category] = [];
    }
    acc[card.category].push(card);
    return acc;
  }, {} as Record<string, ConnectCard[]>);

  const categories = Object.keys(cardsByCategory).sort();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#120E1C] via-[#1A1329] to-[#0E0A18] flex items-center justify-center">
        <div className="text-purple-300">Loading...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#120E1C] via-[#1A1329] to-[#0E0A18] flex items-center justify-center">
        <div className="text-red-400">Failed to load connect cards</div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#120E1C] via-[#1A1329] to-[#0E0A18] flex items-center justify-center">
        <div className="text-zinc-400">No connect cards available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#120E1C] via-[#1A1329] to-[#0E0A18] py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-white mb-3">
            Connect With Us
          </h1>
          <p className="text-lg text-purple-300/80">
            Join our community, support us, and stay connected
          </p>
        </div>

        {/* Cards by Category */}
        <div className="space-y-12">
          {categories.map((category) => (
            <section key={category}>
              <h2 className="text-2xl font-semibold text-purple-200 mb-6">
                {CATEGORY_LABELS[category] || category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cardsByCategory[category].map((card) => {
                  const Icon = getDynamicIcon(card.iconName, card.category);
                  
                  return (
                    <a
                      key={card.id}
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 hover:bg-white/10 hover:border-purple-400/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                    >
                      {/* Icon */}
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:bg-purple-500/30 group-hover:text-purple-200 transition-all">
                          <Icon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-lg font-semibold text-white group-hover:text-purple-200 transition-colors">
                              {card.title}
                            </h3>
                            <ExternalLink className="w-4 h-4 text-purple-400/60 group-hover:text-purple-300 shrink-0 mt-1" />
                          </div>
                          {card.description && (
                            <p className="text-sm text-purple-300/70 mt-2 leading-relaxed">
                              {card.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Hover Glow Effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/0 via-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:via-purple-500/10 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none" />
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
