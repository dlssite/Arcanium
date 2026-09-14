import { Router } from 'express';
import { authenticate }  from '../middleware/authenticate.js';
import { requireRole }   from '../middleware/requireRole.js';
import {
  getUsers, getUserById, updateUserStatus, updateUserRole,
  getFeatureFlags, updateFeatureFlag, createFeatureFlag,
  getCreatorApplications, approveCreatorApplication, rejectCreatorApplication,
  getModerationStories, updateModerationStoryStatus,
  getAdminStats, getAdminActivity, getAiAnalytics,
  getAiConfig, updateAiConfig,
  getScrapers, syncScraper,
  deleteContent, updateContentMeta,
  adminListCategories, createCategory, updateCategory, deleteCategory,
  listBadges, createBadge, updateBadge, deleteBadge,
  listBadgeAwards, listUserBadges, awardBadge, revokeBadge, seedDefaultBadges,
  adminListFeatured, pinContent, unpinContent, updateFeaturedPin,
} from '../services/admin.service.js';
import {
  adminListCollections, createCollection, updateCollection, deleteCollection,
  listCollectionEntries, addCollectionEntry, removeCollectionEntry, reorderCollectionEntry,
} from '../services/collections.service.js';
import {
  getReviewsAdmin,
  deleteReviewAdmin,
  getReviewAnalytics,
} from '../services/review.service.js';

export const adminRouter: Router = Router();

// All admin routes require a valid JWT and at minimum a MODERATOR role.
// Individual handlers enforce stricter checks where necessary
// (e.g. updateUserRole requires ADMIN, not just MODERATOR).
adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN', 'MODERATOR'));

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

/** GET /api/v1/admin/users?search=&role=&status=&page=&limit= */
adminRouter.get('/users', getUsers);

/** GET /api/v1/admin/users/:id */
adminRouter.get('/users/:id', getUserById);

/** PATCH /api/v1/admin/users/:id/status   body: { status } */
adminRouter.patch('/users/:id/status', updateUserStatus);

/** PATCH /api/v1/admin/users/:id/role     body: { role }   — ADMIN only */
adminRouter.patch('/users/:id/role', updateUserRole);

// ---------------------------------------------------------------------------
// Feature Flags
// ---------------------------------------------------------------------------

/** GET /api/v1/admin/feature-flags */
adminRouter.get('/feature-flags', getFeatureFlags);

/** PATCH /api/v1/admin/feature-flags/:key   body: { enabled?, rolloutPct?, name?, description? } */
adminRouter.patch('/feature-flags/:key', updateFeatureFlag);

/** POST /api/v1/admin/feature-flags   body: { key, name, description, category, enabled, rolloutPct } */
adminRouter.post('/feature-flags', createFeatureFlag);

// ---------------------------------------------------------------------------
// Creator Applications
// ---------------------------------------------------------------------------

/** GET /api/v1/admin/creators/applications?status=&page=&limit= */
adminRouter.get('/creators/applications', getCreatorApplications);

/** PATCH /api/v1/admin/creators/applications/:id/approve */
adminRouter.patch('/creators/applications/:id/approve', approveCreatorApplication);

/** PATCH /api/v1/admin/creators/applications/:id/reject */
adminRouter.patch('/creators/applications/:id/reject', rejectCreatorApplication);

// ---------------------------------------------------------------------------
// Story Moderation
// ---------------------------------------------------------------------------

/** GET /api/v1/admin/moderation/stories?status=&page=&limit= */
adminRouter.get('/moderation/stories', getModerationStories);

/** PATCH /api/v1/admin/moderation/stories/:id/status   body: { status } */
adminRouter.patch('/moderation/stories/:id/status', updateModerationStoryStatus);

// ---------------------------------------------------------------------------
// Dashboard Stats & Analytics
// ---------------------------------------------------------------------------

/** GET /api/v1/admin/stats — overview metric cards */
adminRouter.get('/stats', getAdminStats);

/** GET /api/v1/admin/activity — unified activity stream */
adminRouter.get('/activity', getAdminActivity);

/** GET /api/v1/admin/ai/analytics — Liber inference metrics + mood grouping */
adminRouter.get('/ai/analytics', getAiAnalytics);

/** GET  /api/v1/admin/ai/config — current active model + source (db|env) */
adminRouter.get('/ai/config', getAiConfig);

/** PUT  /api/v1/admin/ai/config — update the active model (stored in AppConfig) */
adminRouter.put('/ai/config', updateAiConfig);

// ---------------------------------------------------------------------------
// Scraper Management
// ---------------------------------------------------------------------------

/** GET /api/v1/admin/scrapers — all scraper configs with live stats */
adminRouter.get('/scrapers', getScrapers);

/** POST /api/v1/admin/scrapers/:id/sync — trigger re-crawl for domain */
adminRouter.post('/scrapers/:id/sync', syncScraper);

// ---------------------------------------------------------------------------
// Content management
// ---------------------------------------------------------------------------

/** DELETE /api/v1/admin/content/:id — remove content + cascade chapters */
adminRouter.delete('/content/:id', deleteContent);

/** PATCH /api/v1/admin/content/:id — update type, genres, title, author, status */
adminRouter.patch('/content/:id', updateContentMeta);

// ---------------------------------------------------------------------------
// Category Taxonomy
// ---------------------------------------------------------------------------

/** GET /api/v1/admin/categories — all categories including disabled */
adminRouter.get('/categories', adminListCategories);

/** POST /api/v1/admin/categories   body: { name, genre, sortOrder?, enabled? } */
adminRouter.post('/categories', createCategory);

/** PATCH /api/v1/admin/categories/:id   body: { name?, genre?, sortOrder?, enabled? } */
adminRouter.patch('/categories/:id', updateCategory);

/** DELETE /api/v1/admin/categories/:id */
adminRouter.delete('/categories/:id', deleteCategory);

// ---------------------------------------------------------------------------
// Badge / Honor Management
// ---------------------------------------------------------------------------

/** GET    /api/v1/admin/badges             — list all badge definitions */
adminRouter.get('/badges', listBadges);

/** POST   /api/v1/admin/badges             — create a badge definition */
adminRouter.post('/badges', createBadge);

/** PATCH  /api/v1/admin/badges/:id         — update a badge definition */
adminRouter.patch('/badges/:id', updateBadge);

/** DELETE /api/v1/admin/badges/:id         — delete a badge definition */
adminRouter.delete('/badges/:id', deleteBadge);

/** GET    /api/v1/admin/badges/:id/awards  — all users who have this badge */
adminRouter.get('/badges/:id/awards', listBadgeAwards);

/** POST   /api/v1/admin/badges/award       — award a badge to a user */
adminRouter.post('/badges/award', awardBadge);

/** DELETE /api/v1/admin/badges/award       — revoke a badge from a user */
adminRouter.delete('/badges/award', revokeBadge);

/** POST   /api/v1/admin/badges/revoke      — revoke a badge from a user (body: {userId, badgeId}) */
adminRouter.post('/badges/revoke', revokeBadge);

/** POST   /api/v1/admin/badges/seed        — seed the 8 built-in defaults */
adminRouter.post('/badges/seed', seedDefaultBadges);

/** GET    /api/v1/admin/users/:id/badges   — all awards for one user */
adminRouter.get('/users/:id/badges', listUserBadges);

// ---------------------------------------------------------------------------
// Featured Content Curation
// ---------------------------------------------------------------------------

/** GET    /api/v1/admin/featured         — all pinned items (incl. disabled) */
adminRouter.get('/featured', adminListFeatured);

/** POST   /api/v1/admin/featured         — pin a content item to a section */
adminRouter.post('/featured', pinContent);

/** PATCH  /api/v1/admin/featured/:id     — toggle enabled / update sortOrder */
adminRouter.patch('/featured/:id', updateFeaturedPin);

/** DELETE /api/v1/admin/featured/:id     — unpin a content item */
adminRouter.delete('/featured/:id', unpinContent);

// ---------------------------------------------------------------------------
// Special Collections
// ---------------------------------------------------------------------------

/** GET    /api/v1/admin/collections             — all collections (incl. disabled) */
adminRouter.get('/collections', adminListCollections);

/** POST   /api/v1/admin/collections             — create a collection */
adminRouter.post('/collections', createCollection);

/** PATCH  /api/v1/admin/collections/:id         — update name/slug/desc/color/enabled */
adminRouter.patch('/collections/:id', updateCollection);

/** DELETE /api/v1/admin/collections/:id         — delete a collection + all entries */
adminRouter.delete('/collections/:id', deleteCollection);

/** GET    /api/v1/admin/collections/:id/entries — list entries with content */
adminRouter.get('/collections/:id/entries', listCollectionEntries);

/** POST   /api/v1/admin/collections/:id/entries — add a book to a collection */
adminRouter.post('/collections/:id/entries', addCollectionEntry);

/** DELETE /api/v1/admin/collections/:id/entries/:entryId — remove a book */
adminRouter.delete('/collections/:id/entries/:entryId', removeCollectionEntry);

/** PATCH  /api/v1/admin/collections/entries/:entryId    — update sortOrder */
adminRouter.patch('/collections/entries/:entryId', reorderCollectionEntry);

// ---------------------------------------------------------------------------
// Book Reviews
// ---------------------------------------------------------------------------

/** GET    /api/v1/admin/reviews             — list all reviews with filters */
adminRouter.get('/reviews', getReviewsAdmin);

/** GET    /api/v1/admin/reviews/analytics   — platform-wide review stats */
adminRouter.get('/reviews/analytics', getReviewAnalytics);

/** DELETE /api/v1/admin/reviews/:reviewId   — remove a review */
adminRouter.delete('/reviews/:reviewId', deleteReviewAdmin);
