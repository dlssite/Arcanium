/**
 * @fileoverview Centralized mock data store — single source of truth for all hardcoded
 * data previously scattered across HomeView, LibraryView, ProfileView, ExploreView,
 * LiberView, LiberCompanionDock, and CommunityView.
 *
 * MIGRATION PATH (Phase 2):
 *   Every export here gets replaced by a TanStack Query call through @arcanium/api-client.
 *   The shape of each object intentionally mirrors the Prisma models in
 *   docs/architecture/database-schema.md so the swap is a drop-in.
 *
 * IMPORT PATTERN:
 *   import { MOCK_LIBRARY_BOOKS, MOCK_USER, MOCK_LIBER_MESSAGES } from '../mocks/mockData.js';
 */

// ---------------------------------------------------------------------------
// Asset imports — covers & avatars
// These are the only place in the codebase that imports these assets.
// Components receive cover URLs as data, never import assets themselves.
// ---------------------------------------------------------------------------
import coverArchive      from '../assets/cover_archive.png';
import coverGarden       from '../assets/cover_garden.png';
import coverWind         from '../assets/cover_wind.png';
import coverCharlotte    from '../assets/cover_charlotte.png';
import coverCartographer from '../assets/cover_cartographer.png';
import avatarImg         from '../assets/avatar.png';
import liberHeroImg      from '../assets/liber_hero.jpg';

// Re-export assets so components get them from here, not from direct imports
export { avatarImg, liberHeroImg };

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/** Liber companion version string. Single place to update. */
export const LIBER_VERSION = 'v2.4';

/** Filter tab labels shared by LibraryView and ProfileView. */
export const LIBRARY_FILTER_TABS = ['All', 'Reading', 'Completed', 'Saved'];

// ---------------------------------------------------------------------------
// HOME CATEGORIES
// Sourced from: HomeView.jsx `categories` array
// ---------------------------------------------------------------------------

/**
 * Category browse chips shown on HomeView's "Explore by Category" section.
 * The `icon` field is a lucide-react icon *name* string; components resolve
 * it to the actual component via a lookup map to keep this file framework-agnostic.
 * @type {Array<{id:string, label:string, iconName:string, bg:string, text:string, border:string}>}
 */
export const HOME_CATEGORIES = [
  {
    id: 'Learning',
    label: 'Learning',
    iconName: 'BookOpen',
    bg: 'bg-[#F2EDFA] dark:bg-[#2C213B]',
    text: 'text-[#5B457D] dark:text-[#D1BEE6]',
    border: 'border-[#E3D9F2] dark:border-[#43345A]',
  },
  {
    id: 'Fiction',
    label: 'Fiction',
    iconName: 'Feather',
    bg: 'bg-[#EDF5EE] dark:bg-[#192B1D]',
    text: 'text-[#416A46] dark:text-[#88C791]',
    border: 'border-[#D5E8D8] dark:border-[#27482D]',
  },
  {
    id: 'Classics',
    label: 'Classics',
    iconName: 'Compass',
    bg: 'bg-[#FAF4E6] dark:bg-[#2E2412]',
    text: 'text-[#8E6B23] dark:text-[#FFD27D]',
    border: 'border-[#F2E4C2] dark:border-[#4B391A]',
  },
  {
    id: 'Languages',
    label: 'Languages',
    iconName: 'Globe2',
    bg: 'bg-[#EBF3FA] dark:bg-[#162536]',
    text: 'text-[#396388] dark:text-[#88BBE6]',
    border: 'border-[#D1E4F4] dark:border-[#243F5C]',
  },
  {
    id: 'Poetry',
    label: 'Poetry',
    iconName: 'Sparkles',
    bg: 'bg-[#F9EDE8] dark:bg-[#301B17]',
    text: 'text-[#8C4F3E] dark:text-[#ECA593]',
    border: 'border-[#F0D5CB] dark:border-[#4C2821]',
  },
];

// ---------------------------------------------------------------------------
// EXPLORE GENRES
// Sourced from: ExploreView.jsx `genres` array
// ---------------------------------------------------------------------------

/**
 * Genre filter pills for ExploreView.
 * @type {string[]}
 */
export const EXPLORE_GENRES = [
  'All',
  'Grimoires',
  'Celestial Maps',
  'Pastoral Fables',
  'Philosophy',
  'Forgotten Lore',
];

// ---------------------------------------------------------------------------
// MOCK CATALOGUE — EXPLORE BOOKS
// Sourced from: ExploreView.jsx `exploreBooks` array
// Phase 2: replaced by GET /api/v1/content?genre=X via useExploreStore
// ---------------------------------------------------------------------------

/**
 * @type {import('../types/book.js').ExploreBook[]}
 */
export const MOCK_EXPLORE_BOOKS = [
  {
    id: 101,
    title: 'The Wind in the Willows',
    author: 'Kenneth Grahame',
    cover: coverWind,
    rating: '4.9',
    ratingCount: null,
    genre: 'Pastoral Fables',
    level: 'L4',
    badge: 'Classic',
    synopsis: 'A timeless fable along English riverbanks celebrating friendship, cozy hearths, and the pastoral wonders of nature.',
    chapterCount: 12,
    readTime: '3h 20m',
  },
  {
    id: 102,
    title: 'The Secret Garden',
    author: 'Frances Hodgson Burnett',
    cover: coverGarden,
    rating: '4.8',
    ratingCount: null,
    genre: 'Forgotten Lore',
    level: 'L3',
    badge: 'Archival',
    synopsis: 'A forgotten estate garden where mystery and healing intertwine under blooming rose arbors.',
    chapterCount: 27,
    readTime: '5h 10m',
  },
  {
    id: 103,
    title: "Charlotte's Web",
    author: 'E. B. White',
    cover: coverCharlotte,
    rating: '4.9',
    ratingCount: null,
    genre: 'Pastoral Fables',
    level: 'L2',
    badge: 'Beloved',
    synopsis: 'A profound tale of quiet devotion, miracles woven in cobwebs, and eternal friendship.',
    chapterCount: 22,
    readTime: '2h 45m',
  },
  {
    id: 104,
    title: 'Whispers of the Cartographer',
    author: 'Paulo Coelho',
    cover: coverCartographer,
    rating: '4.7',
    ratingCount: null,
    genre: 'Philosophy',
    level: 'L4',
    badge: 'Spotlight',
    synopsis: 'A seeker navigates uncharted deserts and astrological maps in search of life\'s sacred purpose.',
    chapterCount: 18,
    readTime: '4h 12m',
  },
  {
    id: 105,
    title: 'Grimoire of Night Stars',
    author: 'Antoine de Saint-Exupéry',
    cover: coverArchive,
    rating: '5.0',
    ratingCount: null,
    genre: 'Grimoires',
    level: 'L5',
    badge: 'Rare',
    synopsis: 'An illuminated manuscript of lost constellations and stellar navigational spells compiled by forgotten astronomers.',
    chapterCount: 9,
    readTime: '2h 30m',
  },
  {
    id: 106,
    title: 'The Celestial Atlas',
    author: 'Gerardus Mercator',
    cover: coverCartographer,
    rating: '4.9',
    ratingCount: null,
    genre: 'Celestial Maps',
    level: 'L4',
    badge: 'Historic',
    synopsis: 'Hand-tinted copperplate charts mapping the northern and southern planetary spheres from medieval observatories.',
    chapterCount: 14,
    readTime: '3h 50m',
  },
];

/**
 * The featured book shown in the ExploreView hero banner.
 * Phase 2: replaced by GET /api/v1/content/featured
 */
export const MOCK_FEATURED_BOOK = MOCK_EXPLORE_BOOKS[3]; // Whispers of the Cartographer

// ---------------------------------------------------------------------------
// MOCK LIBRARY BOOKS
// Sourced from: LibraryView.jsx `books` + ProfileView.jsx `libraryBooks`
// These were identical 5-book arrays defined separately in both components.
// Phase 2: replaced by GET /api/v1/library via useLibraryStore
// ---------------------------------------------------------------------------

/**
 * Single source of truth for the user's library.
 * Both LibraryView and ProfileView import from here.
 * @type {import('../types/book.js').LibraryBook[]}
 */
export const MOCK_LIBRARY_BOOKS = [
  {
    id: 1,
    title: 'The Archive Chronicles',
    author: 'Antoine de Saint-Exupéry',
    progress: 68,
    cover: coverArchive,
    readingStatus: 'READING',
    status: 'Currently Reading',
    time: '7 min left in chapter',
    level: 'L3',
    category: 'Reading',
    synopsis: 'A lyrical journey through celestial navigation, forgotten constellations, and the fragile nature of friendship across planetary expanses.',
    lastChapterRead: 8,
    lastReadAt: null,
  },
  {
    id: 2,
    title: 'The Secret Garden',
    author: 'Frances Hodgson Burnett',
    progress: 32,
    cover: coverGarden,
    readingStatus: 'READING',
    status: 'In Progress',
    time: '18 min left in chapter',
    level: 'L3',
    category: 'Reading',
    synopsis: 'A locked sanctuary discovered behind tangled ivy where quiet care revives forgotten botanical wonders and restores youthful vigor.',
    lastChapterRead: 9,
    lastReadAt: null,
  },
  {
    id: 3,
    title: 'The Wind in the Willows',
    author: 'Kenneth Grahame',
    progress: 100,
    cover: coverWind,
    readingStatus: 'COMPLETED',
    status: 'Completed',
    time: 'Finished yesterday',
    level: 'L4',
    category: 'Completed',
    synopsis: 'Gentle riverbank wanderings with Rat, Mole, and Toad celebrating the quiet virtues of friendship, hearth, and tea by the embers.',
    lastChapterRead: 12,
    lastReadAt: null,
  },
  {
    id: 4,
    title: "Charlotte's Web",
    author: 'E. B. White',
    progress: 15,
    cover: coverCharlotte,
    readingStatus: 'PLAN_TO_READ',
    status: 'Saved',
    time: 'Saved for weekend',
    level: 'L2',
    category: 'Saved',
    synopsis: 'An enduring testament to devotion written in silver strands beneath barn rafters where words of grace conquer mortality.',
    lastChapterRead: null,
    lastReadAt: null,
  },
  {
    id: 5,
    title: 'Whispers of the Cartographer',
    author: 'Paulo Coelho',
    progress: 45,
    cover: coverCartographer,
    readingStatus: 'READING',
    status: 'In Progress',
    time: '24 min left in chapter',
    level: 'L4',
    category: 'Reading',
    synopsis: 'An archivist traces an undocumented trade route across whispering sands guided solely by constellations and prophetic codices.',
    lastChapterRead: 8,
    lastReadAt: null,
  },
];

// ---------------------------------------------------------------------------
// CURRENTLY READING — derived from library
// Sourced from: HomeView.jsx "Continue Reading" card (hardcoded to "The Little Prince")
// NOTE: The HomeView used a *different* book (The Little Prince, not in the library array).
// We align it with the first READING-status book so the data is consistent.
// ---------------------------------------------------------------------------

/**
 * The book shown in the HomeView "Continue Reading" hero card.
 * In Phase 2 this is the most recently read book from ReadingProgress.
 * @type {import('../types/book.js').LibraryBook}
 */
export const MOCK_CURRENTLY_READING = MOCK_LIBRARY_BOOKS[0]; // The Archive Chronicles

// ---------------------------------------------------------------------------
// RECOMMENDED BOOKS
// Sourced from: HomeView.jsx `recommendedBooks` array (4 books)
// These partially overlap with MOCK_EXPLORE_BOOKS — that's intentional:
// recommendations are a curated subset of the catalogue.
// Phase 2: GET /api/v1/content?personalized=true
// ---------------------------------------------------------------------------

/**
 * @type {import('../types/book.js').ExploreBook[]}
 */
export const MOCK_RECOMMENDED_BOOKS = [
  {
    id: 101,
    title: 'The Wind in the Willows',
    author: 'Kenneth Grahame',
    level: 'L4',
    badge: 'New',
    cover: coverWind,
    synopsis: 'A timeless pastoral tale of friendship, riverbanks, and wanderlust following Mole, Ratty, Badger, and the irrepressible Mr. Toad.',
    chapterCount: 12,
    readTime: '3h 20m',
    rating: '4.9',
    ratingCount: null,
    genre: 'Pastoral Fables',
  },
  {
    id: 102,
    title: 'The Secret Garden',
    author: 'Frances Hodgson Burnett',
    level: 'L3',
    badge: null,
    cover: coverGarden,
    synopsis: 'An orphaned young girl discovers a locked, overgrown walled garden and learns that love, care, and friendship can bring the dormant earth back to life.',
    chapterCount: 27,
    readTime: '5h 10m',
    rating: '4.8',
    ratingCount: null,
    genre: 'Forgotten Lore',
  },
  {
    id: 103,
    title: "Charlotte's Web",
    author: 'E. B. White',
    level: 'L2',
    badge: null,
    cover: coverCharlotte,
    synopsis: 'A profound story of devotion between a pig named Wilbur and a clever spider named Charlotte who writes miracles in her web.',
    chapterCount: 22,
    readTime: '2h 45m',
    rating: '4.9',
    ratingCount: null,
    genre: 'Pastoral Fables',
  },
  {
    id: 104,
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    level: 'L4',
    badge: null,
    cover: coverCartographer,
    synopsis: 'An Andalusian shepherd boy travels to Egypt in search of treasure, discovering along the dunes that the universe conspires to help us achieve our destiny.',
    chapterCount: 18,
    readTime: '4h 12m',
    rating: '4.7',
    ratingCount: null,
    genre: 'Philosophy',
  },
];

// ---------------------------------------------------------------------------
// MOCK USER
// Sourced from: HomeView.jsx (name, streak), ProfileView.jsx (all stats + badges)
// Phase 2: replaced by GET /api/v1/user/me
// ---------------------------------------------------------------------------

/**
 * @type {import('../types/user.js').User}
 */
export const MOCK_USER = {
  id: 'mock-user-erin',
  googleId: 'mock-google-id',
  email: 'erin.vance@arcanium.app',
  displayName: 'Erin Vance',
  avatarUrl: avatarImg,
  archiveLevel: 4,
  archiveLevelTitle: 'Level 4 Scholar Archivist',
  readingStreak: 28,
  createdAt: '2026-01-01T00:00:00.000Z',
};

/**
 * @type {import('../types/user.js').DailyGoal}
 */
export const MOCK_DAILY_GOAL = {
  targetMinutes: 20,
  completedMinutes: 14,
  progressPercent: 70,
  isCompleted: false,
};

/**
 * @type {import('../types/user.js').ReadingStats}
 */
export const MOCK_READING_STATS = {
  manuscriptsRead: 42,
  totalHoursLogged: 142,
  archiveRank: 'Top 1%',
  readingStreak: 28,
};

// ---------------------------------------------------------------------------
// MOCK USER BADGES
// Sourced from: ProfileView.jsx `badgeIcons` array
// The `iconName` string maps to a lucide-react component in ProfileView's lookup.
// Phase 2: replaced by GET /api/v1/user/me/badges
// ---------------------------------------------------------------------------

/**
 * @type {import('../types/user.js').UserBadge[]}
 */
export const MOCK_USER_BADGES = [
  {
    id: 1,
    title: 'Night Owl Archivist',
    desc: 'Read after midnight for 7 consecutive days',
    iconName: 'Moon',
    unlocked: true,
    tier: 'Bronze Talisman',
    colorClasses: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
  },
  {
    id: 2,
    title: 'Keeper of Constellations',
    desc: 'Finished 5 cosmological tomes and astronomical logs',
    iconName: 'Sparkles',
    unlocked: true,
    tier: 'Silver Talisman',
    colorClasses: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60',
  },
  {
    id: 3,
    title: 'Companion of Liber',
    desc: 'Conversed with Liber 25 times regarding archive manuscripts',
    iconName: 'BookOpen',
    unlocked: true,
    tier: 'Gold Talisman',
    colorClasses: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
  },
  {
    id: 4,
    title: 'Master Cartographer',
    desc: 'Charted 10 ancient scrolls in the Great Cartography',
    iconName: 'Compass',
    unlocked: true,
    tier: 'Bronze Talisman',
    colorClasses: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
  },
  {
    id: 5,
    title: 'Scribe of Tomes',
    desc: 'Shared 20 marginalia reflections across community circles',
    iconName: 'Scroll',
    unlocked: true,
    tier: 'Silver Talisman',
    colorClasses: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60',
  },
  {
    id: 6,
    title: 'Century Reader',
    desc: 'Read 100 hours in the archive (Progress: 72/100h)',
    iconName: 'Clock',
    unlocked: false,
    tier: 'In Progress (72%)',
    colorClasses: 'text-stone-400 bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60',
  },
  {
    id: 7,
    title: 'Archival Warden',
    desc: 'Verified 50 community citations and references (Progress: 18/50)',
    iconName: 'Shield',
    unlocked: false,
    tier: 'Locked',
    colorClasses: 'text-stone-400 bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60',
  },
  {
    id: 8,
    title: 'Legendary Scholar',
    desc: 'Attain rank 5 master archivist credentials in Arcanium',
    iconName: 'Award',
    unlocked: false,
    tier: 'Locked',
    colorClasses: 'text-stone-400 bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/60',
  },
];

// ---------------------------------------------------------------------------
// MOCK LIBER CHAT — initial conversation seed
// Sourced from: LiberView.jsx `messages` + LiberCompanionDock.jsx `messages`
// These were identical in both files — now there is one definition.
// Phase 2: replaced by persisted session from GET /api/v1/companion/session
// ---------------------------------------------------------------------------

/**
 * @type {import('../types/companion.js').ChatMessage[]}
 */
export const MOCK_LIBER_INITIAL_MESSAGES = [
  {
    id: 1,
    sender: 'user',
    text: "Liber, I'm feeling thoughtful. Recommend a deep story about memory and space.",
  },
  {
    id: 2,
    sender: 'liber',
    text: "Ah, a deep thought. Based on that mood, I recommend \u2018The Memory Stars\u2019. Shall I read you a passage or add it to your library?",
    actions: ['Tell me more', 'Add to Library', 'Read passage'],
  },
];

// ---------------------------------------------------------------------------
// MOCK SUGGESTED PROMPTS
// Sourced from: LiberView.jsx `suggestedPrompts` array
// Phase 2: optionally refreshed from GET /api/v1/companion/suggested-prompts
// ---------------------------------------------------------------------------

/**
 * @type {import('../types/companion.js').SuggestedPrompt[]}
 */
export const MOCK_SUGGESTED_PROMPTS = [
  {
    title: 'Memory & Space',
    prompt: "Liber, I'm feeling thoughtful. Recommend a deep story about memory and space.",
  },
  {
    title: 'Philosophical Lore',
    prompt: 'Which grimoire explores the nature of time and quiet evenings?',
  },
  {
    title: 'Chapter Excerpt',
    prompt: 'Read me an excerpt from The Archive Chronicles.',
  },
  {
    title: 'Archive Cartography',
    prompt: 'What are the rarest celestial navigation charts in Arcanium?',
  },
];

// ---------------------------------------------------------------------------
// MOCK ACTION RESPONSES
// Sourced from: LiberView.jsx + LiberCompanionDock.jsx handleActionClick/handleAction
// These are the simulated AI replies for each quick-action button.
// Phase 3: replaced by real LLM tool-call responses from POST /api/v1/companion/chat
// ---------------------------------------------------------------------------

/**
 * Simulated Liber reply map for known quick-action labels.
 * useLiberChat hook uses this to produce mock responses in Phase 1.
 * @type {Record<string, { text: string, actions: string[]|null }>}
 */
export const MOCK_ACTION_REPLIES = {
  'Tell me more': {
    text: "\u2018The Memory Stars\u2019 chronicles an astronomer who discovers that dying constellations don\u2019t fade into nothingness\u2014they imprint the collective memories of civilizations upon cosmic dust. It pairs beautifully with quiet evenings.",
    actions: ['Read passage', 'Add to Library'],
  },
  'Add to Library': {
    text: "\u2728 \u2018The Memory Stars\u2019 has been placed on your prime reading shelf in the Great Archive. You can begin Chapter I anytime from your Library tab.",
    actions: null,
  },
  'Read passage': {
    text: "\u201cWe believed the sky was silent, until we learned to listen to the light. Every beam of starlight traveling across the void carries the laughter of children who lived ten thousand seasons ago.\u201d",
    actions: ['Add to Library', 'Another recommendation'],
  },
  'Recommend a story': {
    text: "Given your recent journeys through celestial archives, I recommend \u2018The Memory Stars\u2019 \u2014 a tale of an astronomer who discovers constellations carry the memories of lost civilizations.",
    actions: ['Tell me more', 'Add to Library', 'Read passage'],
  },
  'Continue reading queue': {
    text: "You are currently 68% through \u2018The Archive Chronicles\u2019. You have approximately 7 minutes remaining in Chapter VIII: The Cartographer\u2019s Last Map. Shall I prepare the passage?",
    actions: ['Read passage', 'Tell me more'],
  },
  'Surprise me': {
    text: "Very well, scholar. Tonight\u2019s constellation aligns with \u2018Grimoire of Night Stars\u2019 \u2014 an illuminated manuscript of lost stellar navigation spells. A rare text, Level 5, not for the faint of heart.",
    actions: ['Tell me more', 'Add to Library'],
  },
  'Search similar titles': {
    text: "I have consulted the celestial catalogue. Related titles include \u2018The Cartographer\u2019s Dream\u2019, \u2018Stellar Marginalia\u2019, and \u2018Echoes of the Void\u2019. Shall I add any to your shelf?",
    actions: ['Add to Library', 'Tell me more'],
  },
  'Another recommendation': {
    text: "For your next journey, I suggest \u2018Whispers of the Cartographer\u2019 \u2014 an archivist traces an undocumented trade route across whispering sands guided solely by constellations and prophetic codices.",
    actions: ['Tell me more', 'Add to Library'],
  },
  'Ask another query': {
    text: "The archive is open. What knowledge do you seek, scholar?",
    actions: null,
  },
  'Search similar manuscripts': {
    text: "I have found several manuscripts that echo your inquiry. Shall I compile them into a curated reading list on your shelf?",
    actions: ['Add to Library', 'Tell me more'],
  },
  'Ask another question': {
    text: "Ask freely. The Living Archive holds answers to queries not yet formed.",
    actions: null,
  },
};

/**
 * Fallback reply for any action label not found in MOCK_ACTION_REPLIES.
 * @param {string} action
 * @returns {{ text: string, actions: string[]|null }}
 */
export function getMockActionReply(action) {
  return (
    MOCK_ACTION_REPLIES[action] ?? {
      text: `I have noted that for your archival journey. Would you like to explore deeper manuscripts or return to your reading queue?`,
      actions: ['Search similar titles', 'Continue reading queue'],
    }
  );
}

/**
 * Generates a mock Liber reply for a free-text user message.
 * Phase 3: replaced by POST /api/v1/companion/chat.
 * @param {string} userText
 * @returns {{ text: string, actions: string[] }}
 */
export function getMockFreeTextReply(userText) {
  return {
    text: `A thoughtful inquiry! Within the vaults of Arcanium, every inquiry unlocks a quiet corridor of knowledge. Let me consult the celestial codex regarding \u2018${userText}\u2019.`,
    actions: ['Search similar titles', 'Read key excerpt', 'Add to Library'],
  };
}

// ---------------------------------------------------------------------------
// MOCK COMMUNITY DATA
// Sourced from: CommunityView.jsx `readingCircles` + `marginaliaPosts`
// Phase 2: replaced by GET /api/v1/community/circles + /api/v1/community/marginalia
// ---------------------------------------------------------------------------

/**
 * @type {Array<{id:number, name:string, focus:string, members:number, activeNow:number, tag:string, cover:string}>}
 */
export const MOCK_READING_CIRCLES = [
  {
    id: 1,
    name: 'The Constellation Society',
    focus: 'Reading: The Memory Stars',
    members: 342,
    activeNow: 28,
    tag: 'Cosmology',
    cover: coverArchive,
  },
  {
    id: 2,
    name: 'Midnight Philosophers',
    focus: 'Reading: The Archive Chronicles',
    members: 819,
    activeNow: 45,
    tag: 'Philosophy',
    cover: coverCartographer,
  },
  {
    id: 3,
    name: 'Pastoral Lore Guild',
    focus: 'Reading: The Wind in the Willows',
    members: 215,
    activeNow: 12,
    tag: 'Fables',
    cover: coverArchive,
  },
];

/**
 * @type {Array<{id:number, author:string, role:string, avatar:string, time:string, book:string, chapter:string, quote:string, reflection:string, replies:number}>}
 */
export const MOCK_MARGINALIA_POSTS = [
  {
    id: 1,
    author: 'Aurelia Scribe',
    role: 'Level 5 Archivist',
    avatar: avatarImg,
    time: '25m ago',
    book: 'The Memory Stars',
    chapter: 'Chapter IV: The Light of Ancients',
    quote: '\u201cWe believed the sky was silent, until we learned to listen to the light. Every beam of starlight traveling across the void carries the laughter of children who lived ten thousand seasons ago.\u201d',
    reflection: 'This passage paired with midnight chamomile tea gave me goosebumps. Liber recommended this book perfectly for quiet contemplating.',
    replies: 14,
    echoCount: 48,
  },
  {
    id: 2,
    author: 'Julian Thorne',
    role: 'Master Cartographer',
    avatar: avatarImg,
    time: '1h ago',
    book: 'Whispers of the Cartographer',
    chapter: 'Manuscript Codex VII',
    quote: '\u201cThe navigator who trusts only visible shores will never discover the oceans of memory that flow between celestial spheres.\u201d',
    reflection: 'Notice how the silver ink on this page mirrors the stellar coordinates we found in the opening chapter? Truly breathtaking archival craft.',
    replies: 9,
    echoCount: 32,
  },
];

/**
 * Weekly community challenge state.
 * Phase 2: replaced by GET /api/v1/community/challenge/current
 */
export const MOCK_COMMUNITY_CHALLENGE = {
  title: '100,000 Celestial Pages Together',
  description: 'Scholars have read 7,420 pages this week. Join in to unlock the "Living Stacks" collective badge!',
  targetPages: 10000,
  completedPages: 7420,
  progressPercent: 74,
  badgeReward: 'Living Stacks',
  totalScholars: 2840,
};
