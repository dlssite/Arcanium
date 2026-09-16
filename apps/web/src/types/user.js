/**
 * @fileoverview Domain type definitions for User-related entities.
 * Maps to the User, Shelf, and badge-related Prisma models.
 * When TypeScript is adopted, these become Zod schemas in packages/types/.
 */

/**
 * The authenticated user profile.
 * Maps to the User Prisma model.
 * @typedef {Object} User
 * @property {string} id
 * @property {string} googleId
 * @property {string} email
 * @property {string} displayName
 * @property {string|null} avatarUrl
 * @property {number} readingStreak      - Consecutive days read
 * @property {string} createdAt
 * @property {Object} xp                 - XP and rank info
 * @property {number} xp.total           - Total XP earned
 * @property {string} xp.rank            - Current rank title (e.g., "Wandering Scribe")
 * @property {string|null} xp.nextRank   - Next rank title or null if max rank
 */

/**
 * Daily reading goal state for a user.
 * @typedef {Object} DailyGoal
 * @property {number} targetMinutes   - Goal in minutes e.g. 20
 * @property {number} completedMinutes - Minutes read today
 * @property {number} progressPercent  - 0–100 derived value
 * @property {boolean} isCompleted
 */

/**
 * Aggregated reading statistics shown on the ProfileView.
 * @typedef {Object} ReadingStats
 * @property {number} manuscriptsRead    - Total books in library
 * @property {number} totalHoursLogged   - Lifetime reading hours
 * @property {string} archiveRank        - e.g. "Top 1%", computed server-side
 * @property {number} readingStreak      - Alias of User.readingStreak for convenience
 */

/**
 * An achievement badge unlocked (or in progress) by a user.
 * Phase 2: stored as JSON in User.metadata or a dedicated table.
 * Phase 1: seeded from MOCK_USER_BADGES in mockData.js.
 * @typedef {Object} UserBadge
 * @property {number|string} id
 * @property {string} title
 * @property {string} desc
 * @property {string} iconName    - lucide-react icon name as a string
 * @property {boolean} unlocked
 * @property {string} tier        - e.g. "Bronze Talisman", "Locked", "In Progress (72%)"
 * @property {string} colorClasses - Tailwind class string for badge styling
 */
