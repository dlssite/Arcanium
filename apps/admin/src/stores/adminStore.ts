import { create } from 'zustand';
import {
  AdminUser,
  ContentItem,
  ScraperParser,
  CreatorApplication,
  ModeratedStory,
  LiberAnalytics,
  FeatureFlag,
  AdminActivityItem,
  AdminOverviewStats,
  UserRole,
  UserStatus
} from '../types';
import {
  initialStats,
  initialUsers,
  initialContent,
  initialParsers,
  initialCreators,
  initialModeration,
  initialLiberAnalytics,
  initialFeatureFlags,
  initialActivity
} from '../mocks/mockData';

export interface PlaygroundToolCall {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface PlaygroundHistoryItem {
  id: string;
  prompt: string;
  response: string;
  toolCall?: PlaygroundToolCall | undefined;
  latencyMs: number;
  tokensUsed: number;
  timestamp: string;
}

interface AdminStoreState {
  // Stats & Activity
  stats: AdminOverviewStats;
  activities: AdminActivityItem[];
  addActivity: (activity: Omit<AdminActivityItem, 'id' | 'timestamp'>) => void;

  // Users
  users: AdminUser[];
  toggleUserBan: (userId: string) => void;
  toggleUserSuspend: (userId: string) => void;
  grantVerifiedWriter: (userId: string) => void;
  setUserRole: (userId: string, role: UserRole) => void;

  // Content & Parsers
  contentList: ContentItem[];
  categories: string[];
  parsers: ScraperParser[];
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
  triggerScraperSync: (parserId: string) => void;

  // Creators & Moderation
  creators: CreatorApplication[];
  moderatedStories: ModeratedStory[];
  approveCreator: (appId: string) => void;
  rejectCreator: (appId: string) => void;
  setStoryStatus: (storyId: string, status: 'APPROVED' | 'QUARANTINED' | 'FLAGGED') => void;

  // AI Liber Analytics & Playground
  liberAnalytics: LiberAnalytics;
  playgroundHistory: PlaygroundHistoryItem[];
  executeLiberPromptTest: (prompt: string, selectedTool?: string) => Promise<void>;

  // Feature Flags
  featureFlags: FeatureFlag[];
  toggleFeatureFlag: (key: string) => void;
  updateRollout: (key: string, pct: number) => void;
  addFeatureFlag: (flag: Omit<FeatureFlag, 'updatedAt' | 'updatedBy'>) => void;

  // Theme & Layout
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('arcanium_admin_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  }
  return 'dark';
};

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  stats: initialStats,
  activities: initialActivity,
  users: initialUsers,
  contentList: initialContent,
  categories: ['Grimoires', 'Lore', 'Cartography', 'Esoteric Arts', 'Spellcraft', 'Constellations', 'Dark Fantasy'],
  parsers: initialParsers,
  creators: initialCreators,
  moderatedStories: initialModeration,
  liberAnalytics: initialLiberAnalytics,
  featureFlags: initialFeatureFlags,
  theme: getInitialTheme(),
  sidebarCollapsed: false,

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('arcanium_admin_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
    set({ theme: next });
  },

  playgroundHistory: [
    {
      id: 'test_01',
      prompt: 'I feel a profound cosmic loneliness today. Suggest a web novel that mirrors this.',
      response: 'Ah, seeker of the deep stillness. When the stars feel too far and the silence too heavy, few tomes resonate as deeply as *Shadow Slave* or *Lord of the Mysteries*. I have retrieved its chapter index for your quiet contemplation.',
      toolCall: {
        name: 'search_content',
        args: { mood: 'Eldritch Melancholy', genre: 'Dark Fantasy', limit: 2 },
        result: { matched: ['Shadow Slave', 'Lord of the Mysteries'], relevanceScore: 0.98 }
      },
      latencyMs: 380,
      tokensUsed: 245,
      timestamp: '10m ago'
    }
  ],

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  addActivity: (item) => {
    const newActivity: AdminActivityItem = {
      ...item,
      id: `act_${Date.now()}`,
      timestamp: 'Just now',
    };
    set((state) => ({
      activities: [newActivity, ...state.activities.slice(0, 24)]
    }));
  },

  toggleUserBan: (userId: string) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return;
    const nextStatus: UserStatus = user.status === 'BANNED' ? 'ACTIVE' : 'BANNED';

    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    }));

    get().addActivity({
      title: nextStatus === 'BANNED' ? 'User Banned' : 'User Unbanned',
      description: `${user.displayName} (@${user.username}) was ${nextStatus.toLowerCase()} by Admin`,
      actor: 'Admin Console',
      type: 'USER',
      severity: nextStatus === 'BANNED' ? 'danger' : 'success',
    });
  },

  toggleUserSuspend: (userId: string) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return;
    const nextStatus: UserStatus = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    }));

    get().addActivity({
      title: nextStatus === 'SUSPENDED' ? 'User Suspended' : 'Suspension Lifted',
      description: `${user.displayName} account suspension status changed to ${nextStatus}`,
      actor: 'Admin Console',
      type: 'USER',
      severity: nextStatus === 'SUSPENDED' ? 'warning' : 'info',
    });
  },

  grantVerifiedWriter: (userId: string) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return;

    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, role: 'VERIFIED_WRITER' } : u))
    }));

    get().addActivity({
      title: 'Verified Writer Granted',
      description: `Promoted ${user.displayName} to official Verified Writer`,
      actor: 'Admin Console',
      type: 'CREATOR',
      severity: 'success',
    });
  },

  setUserRole: (userId: string, role: UserRole) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) return;

    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, role } : u))
    }));

    get().addActivity({
      title: 'User Role Updated',
      description: `Changed role of ${user.displayName} to ${role}`,
      actor: 'Admin Console',
      type: 'USER',
      severity: 'info',
    });
  },

  addCategory: (name: string) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    if (get().categories.includes(trimmed)) return;

    set((state) => ({
      categories: [...state.categories, trimmed]
    }));

    get().addActivity({
      title: 'Category Added',
      description: `Added "${trimmed}" to canonical catalog categories`,
      actor: 'Catalog Manager',
      type: 'CONTENT',
      severity: 'info',
    });
  },

  removeCategory: (name: string) => {
    set((state) => ({
      categories: state.categories.filter((c) => c !== name)
    }));
    get().addActivity({
      title: 'Category Removed',
      description: `Removed "${name}" from catalog categories`,
      actor: 'Catalog Manager',
      type: 'CONTENT',
      severity: 'warning',
    });
  },

  triggerScraperSync: (parserId: string) => {
    const parser = get().parsers.find((p) => p.id === parserId);
    if (!parser) return;

    // Simulate crawler run
    set((state) => ({
      parsers: state.parsers.map((p) =>
        p.id === parserId
          ? {
              ...p,
              status: 'OPERATIONAL',
              lastRunAt: 'Just now',
              totalCrawledToday: p.totalCrawledToday + 12,
              latencyMs: Math.max(120, Math.floor(p.latencyMs * 0.95)),
            }
          : p
      )
    }));

    get().addActivity({
      title: 'Manual Parser Re-crawl',
      description: `Triggered manual sync for ${parser.name} (${parser.targetDomain})`,
      actor: 'Content Ops',
      type: 'CONTENT',
      severity: 'success',
    });
  },

  approveCreator: (appId: string) => {
    const app = get().creators.find((c) => c.id === appId);
    if (!app) return;

    set((state) => ({
      creators: state.creators.map((c) =>
        c.id === appId
          ? { ...c, status: 'APPROVED', reviewedAt: new Date().toISOString(), reviewedBy: 'Current Admin' }
          : c
      ),
      // Also promote user if in users list
      users: state.users.map((u) => (u.id === app.userId ? { ...u, role: 'VERIFIED_WRITER' } : u))
    }));

    get().addActivity({
      title: 'Creator Application Approved',
      description: `Approved pen name "${app.penName}" (${app.applicantName}) for publishing rights`,
      actor: 'Admin Console',
      type: 'CREATOR',
      severity: 'success',
    });
  },

  rejectCreator: (appId: string) => {
    const app = get().creators.find((c) => c.id === appId);
    if (!app) return;

    set((state) => ({
      creators: state.creators.map((c) =>
        c.id === appId
          ? { ...c, status: 'REJECTED', reviewedAt: new Date().toISOString(), reviewedBy: 'Current Admin' }
          : c
      )
    }));

    get().addActivity({
      title: 'Creator Application Rejected',
      description: `Application for "${app.penName}" was rejected`,
      actor: 'Admin Console',
      type: 'CREATOR',
      severity: 'warning',
    });
  },

  setStoryStatus: (storyId: string, status: 'APPROVED' | 'QUARANTINED' | 'FLAGGED') => {
    const story = get().moderatedStories.find((s) => s.id === storyId);
    if (!story) return;

    set((state) => ({
      moderatedStories: state.moderatedStories.map((s) =>
        s.id === storyId ? { ...s, status } : s
      )
    }));

    get().addActivity({
      title: `Story Moderation: ${status}`,
      description: `Updated status of "${story.title}" to ${status}`,
      actor: 'Moderator',
      type: 'CONTENT',
      severity: status === 'APPROVED' ? 'success' : status === 'QUARANTINED' ? 'danger' : 'warning',
    });
  },

  executeLiberPromptTest: async (prompt: string, selectedTool?: string) => {
    // Simulate real AI response with simulated function calling
    const latency = Math.floor(Math.random() * 200) + 280;
    const tokens = Math.floor(Math.random() * 150) + 120;

    let responseText = `Liber here, companion of the Arcanum. In response to "${prompt}", I have referenced our canonical archives and woven an attuned reply.`;
    let simulatedToolCall: { name: string; args: Record<string, unknown>; result: Record<string, unknown> } | undefined;

    if (selectedTool === 'search_content' || prompt.toLowerCase().includes('recommend') || prompt.toLowerCase().includes('read')) {
      simulatedToolCall = {
        name: 'search_content',
        args: {
          query: prompt.slice(0, 30),
          mood: 'Arcane Reverie',
          filterType: 'WEB_NOVEL',
        },
        result: {
          hits: [
            { id: 'cnt_01', title: 'Shadow Slave', matchScore: 0.96 },
            { id: 'cnt_02', title: 'Lord of the Mysteries', matchScore: 0.94 },
          ],
          totalFound: 2
        }
      };
      responseText = `I have consulted the astral shelves for: "${prompt}". Two tomes pulse in harmony with your query: *Shadow Slave* and *Lord of the Mysteries*.`;
    } else if (selectedTool === 'add_to_shelf' || prompt.toLowerCase().includes('shelf') || prompt.toLowerCase().includes('save')) {
      simulatedToolCall = {
        name: 'add_to_shelf',
        args: {
          shelfName: 'Nightly Meditations',
          contentId: 'cnt_01',
          autoSyncOffline: true,
        },
        result: {
          success: true,
          shelfId: 'shlf_arcane_99',
          message: 'Item bound to shelf with ritual seal'
        }
      };
      responseText = `The grimoire has been inscribed into your "Nightly Meditations" shelf. It shall await your next reading vigil.`;
    }

    const testItem = {
      id: `test_${Date.now()}`,
      prompt,
      response: responseText,
      toolCall: simulatedToolCall,
      latencyMs: latency,
      tokensUsed: tokens,
      timestamp: 'Just now'
    };

    set((state) => ({
      playgroundHistory: [testItem, ...state.playgroundHistory],
      liberAnalytics: {
        ...state.liberAnalytics,
        totalTokensToday: state.liberAnalytics.totalTokensToday + tokens,
      }
    }));
  },

  toggleFeatureFlag: (key: string) => {
    const flag = get().featureFlags.find((f) => f.key === key);
    if (!flag) return;
    const nextState = !flag.enabled;

    set((state) => ({
      featureFlags: state.featureFlags.map((f) =>
        f.key === key
          ? {
              ...f,
              enabled: nextState,
              updatedAt: new Date().toISOString(),
              updatedBy: 'Admin Console'
            }
          : f
      )
    }));

    get().addActivity({
      title: nextState ? 'Feature Flag Enabled' : 'Feature Flag Disabled',
      description: `Flag "${flag.name}" (${flag.key}) set to ${nextState ? 'ACTIVE' : 'INACTIVE'}`,
      actor: 'Admin Console',
      type: 'FLAG',
      severity: nextState ? 'success' : 'warning',
    });
  },

  updateRollout: (key: string, pct: number) => {
    const flag = get().featureFlags.find((f) => f.key === key);
    if (!flag) return;

    set((state) => ({
      featureFlags: state.featureFlags.map((f) =>
        f.key === key
          ? {
              ...f,
              rolloutPct: pct,
              updatedAt: new Date().toISOString(),
              updatedBy: 'Admin Console'
            }
          : f
      )
    }));

    get().addActivity({
      title: 'Rollout Percentage Updated',
      description: `Flag "${flag.name}" rollout adjusted to ${pct}%`,
      actor: 'Admin Console',
      type: 'FLAG',
      severity: 'info',
    });
  },

  addFeatureFlag: (flag) => {
    const newFlag: FeatureFlag = {
      ...flag,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin Console',
    };

    set((state) => ({
      featureFlags: [...state.featureFlags, newFlag]
    }));

    get().addActivity({
      title: 'New Feature Flag Created',
      description: `Created flag "${newFlag.name}" [${newFlag.key}]`,
      actor: 'Admin Console',
      type: 'FLAG',
      severity: 'success',
    });
  },
}));
