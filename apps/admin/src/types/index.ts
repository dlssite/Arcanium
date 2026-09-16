export type UserRole = 'USER' | 'VERIFIED_WRITER' | 'MODERATOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  totalXp?: number; // Added for XP-based rank system
  streakDays: number;
  totalReadingHours: number;
  shelfCount: number;
  booksRead: number;
  joinedAt: string;
  lastActiveAt: string;
  emailVerified: boolean;
  notes?: string;
}

export type ContentType = 'WEB_NOVEL' | 'LIGHT_NOVEL' | 'COMIC' | 'MANGA' | 'EBOOK';
export type ContentStatus = 'ONGOING' | 'COMPLETED' | 'HIATUS';

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  status: ContentStatus;
  author: string;
  sourceSite: string;
  sourceUrl: string;
  chapterCount: number;
  categories: string[];
  tags: string[];
  lastScrapedAt: string;
  parserStatus: 'HEALTHY' | 'WARNING' | 'ERROR';
  rating: number;
  coverUrl?: string;
}

export interface ScraperParser {
  id: string;
  name: string;
  targetDomain: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED';
  latencyMs: number;
  successRate: number;
  totalCrawledToday: number;
  errorCount: number;
  lastRunAt: string;
  selectorType: 'Cheerio' | 'Puppeteer' | 'GraphQL' | 'REST' | 'CHEERIO' | 'READABILITY';
}

export interface CreatorApplication {
  id: string;
  userId: string;
  applicantName: string;
  penName: string;
  email: string;
  portfolioUrl: string;
  sampleTitle: string;
  sampleSynopsis: string;
  pitch: string;
  primaryGenre: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ModeratedStory {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  flagReason: string;
  riskScore: number;
  wordCount: number;
  chapters: number;
  status: 'FLAGGED' | 'APPROVED' | 'QUARANTINED';
  reportedAt: string;
  excerptSnippet: string;
}

export interface MoodStat {
  id: string;
  mood: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  auraDescription: string;
}

export interface TokenUsagePoint {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface LiberAnalytics {
  totalTokensToday: number;
  monthlyCostUsd: number;
  costLimitUsd: number;
  avgLatencyMs: number;
  satisfactionRate: number;
  activeChatsCount: number;
  topMoods: MoodStat[];
  tokenHistory: TokenUsagePoint[];
}

export type FeatureFlagCategory = 'AI_LIBER' | 'CREATOR_ECONOMY' | 'CORE_READER' | 'SYSTEM';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: FeatureFlagCategory;
  enabled: boolean;
  rolloutPct: number;
  updatedBy: string;
  updatedAt: string;
}

export interface AdminActivityItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  actor: string;
  type: 'USER' | 'CREATOR' | 'SYSTEM' | 'FLAG' | 'CONTENT' | 'AI';
  severity: 'info' | 'success' | 'warning' | 'danger';
}

export interface AdminOverviewStats {
  totalUsers: number;
  totalUsersChange: number;
  dailyReadingHours: number;
  dailyReadingHoursChange: number;
  activeLiberChats: number;
  activeLiberChatsChange: number;
  monthlyTokenCost: number;
  monthlyTokenCostLimit: number;
}
