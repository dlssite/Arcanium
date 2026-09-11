/**
 * @fileoverview Domain type definitions for Book-related entities.
 * These JSDoc shapes mirror the Prisma schema in docs/architecture/database-schema.md.
 * When TypeScript is adopted (Constitution §10.1), these become Zod schemas in packages/types/.
 */

/**
 * @typedef {'WEB_NOVEL'|'LIGHT_NOVEL'|'COMIC'|'MANGA'|'EBOOK'|'WEBTOON'} ContentType
 */

/**
 * @typedef {'ONGOING'|'COMPLETED'|'HIATUS'|'CANCELLED'|'UNKNOWN'} ContentStatus
 */

/**
 * @typedef {'READING'|'COMPLETED'|'ON_HOLD'|'DROPPED'|'PLAN_TO_READ'} ReadingStatus
 */

/**
 * A single readable unit (chapter, episode, issue).
 * Maps to the Chapter Prisma model.
 * @typedef {Object} Chapter
 * @property {string} id
 * @property {string} contentId
 * @property {number} number    - Float to support 12.5 / side-story chapters
 * @property {string|null} title
 * @property {string} sourceUrl
 * @property {string|null} publishedAt
 */

/**
 * A shared catalogue entry representing one readable title.
 * Maps to the Content Prisma model. Not user-owned.
 * @typedef {Object} Book
 * @property {string}  id
 * @property {ContentType} type
 * @property {ContentStatus} status
 * @property {string}  title
 * @property {string}  slug             - URL-safe identifier, e.g. "solo-leveling"
 * @property {string|null} author
 * @property {string|null} artist
 * @property {string|null} synopsis
 * @property {string|null} coverImageUrl  - Remote URL. Local asset path used in mock data.
 * @property {string}  language
 * @property {string|null} sourceUrl
 * @property {string|null} sourceSite
 * @property {Object}  metadata          - Format-specific JSON (genres, tags, etc.)
 * @property {number}  chapterCount
 * @property {number|null} rating
 */

/**
 * A catalogue book enriched with UI-only display fields used
 * before the full backend is available. Extends Book.
 * @typedef {Object} ExploreBook
 * @property {string}  id
 * @property {string}  title
 * @property {string}  author
 * @property {string}  cover       - Local asset import (mock) or coverImageUrl (API)
 * @property {string}  rating      - Display string e.g. "4.9"
 * @property {number|null} ratingCount
 * @property {string}  genre       - Primary genre label
 * @property {string}  level       - Archival level label e.g. "L4"
 * @property {string|null} badge   - Highlight label e.g. "Spotlight", "Rare"
 * @property {string|null} synopsis
 * @property {number}  chapterCount
 * @property {string}  readTime    - Human-readable e.g. "4h 12m"
 */

/**
 * A book as it appears in the user's personal library.
 * Combines Book fields with per-user ReadingProgress state.
 * Maps to Content + ReadingProgress joined in the API response.
 * @typedef {Object} LibraryBook
 * @property {string}  id
 * @property {string}  title
 * @property {string}  author
 * @property {string}  cover
 * @property {number}  progress    - 0–100 percentage for display
 * @property {ReadingStatus} readingStatus
 * @property {string}  status      - Human-readable label e.g. "Currently Reading"
 * @property {string}  time        - Human-readable time hint e.g. "7 min left in chapter"
 * @property {string}  level       - Archival level label
 * @property {string}  category    - Filter category: 'Reading'|'Completed'|'Saved'
 * @property {string|null} synopsis
 * @property {number|null} lastChapterRead
 * @property {string|null} lastReadAt
 */

/**
 * Reading progress for one (user, content) pair.
 * Maps to the ReadingProgress Prisma model.
 * @typedef {Object} ReadingProgress
 * @property {string}  id
 * @property {string}  userId
 * @property {string}  contentId
 * @property {ReadingStatus} status
 * @property {number|null} lastChapterRead
 * @property {number|null} scrollPosition  - 0.0–1.0 for ebooks
 * @property {string|null} lastReadAt
 * @property {string|null} startedAt
 * @property {string|null} completedAt
 */
