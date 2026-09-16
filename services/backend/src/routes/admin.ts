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
  adminListDefaultAvatars, createDefaultAvatar, updateDefaultAvatar, deleteDefaultAvatar,
  adminListRanks, adminCreateRank, adminUpdateRank, adminDeleteRank, adminSeedRanks,
  getXpConfigAdmin, updateXpConfigAdmin, resetXpConfigAdmin,
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
import {
  adminListCircles,
  adminGetCircle,
  adminCreateCircle,
  adminUpdateCircle,
  adminDeleteCircle,
  adminFeatureCircle,
  adminListCircleMembers,
  adminRemoveCircleMember,
  adminListCirclePosts,
  adminRemoveCirclePost,
  adminListCircleReplies,
  adminRemoveCircleReply,
  adminListCircleRequests,
  adminApproveCircleRequest,
  adminRejectCircleRequest,
  getCircleConfig,
  updateCircleConfig,
  adminListConnectCards,
  adminCreateConnectCard,
  adminUpdateConnectCard,
  adminDeleteConnectCard,
  adminReorderConnectCards,
} from '../services/admin.service.js';

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

// ---------------------------------------------------------------------------
// Default Avatar Management
// ---------------------------------------------------------------------------

/** GET    /api/v1/admin/default-avatars          — all avatars (incl. disabled) */
adminRouter.get('/default-avatars', adminListDefaultAvatars);

/** POST   /api/v1/admin/default-avatars          — add a new default avatar */
adminRouter.post('/default-avatars', createDefaultAvatar);

/** PATCH  /api/v1/admin/default-avatars/:id      — update url / label / order / enabled */
adminRouter.patch('/default-avatars/:id', updateDefaultAvatar);

/** DELETE /api/v1/admin/default-avatars/:id      — remove a default avatar */
adminRouter.delete('/default-avatars/:id', deleteDefaultAvatar);

// ---------------------------------------------------------------------------
// Rank Definition Management
// ---------------------------------------------------------------------------

/** GET    /api/v1/admin/ranks           — list all ranks */
adminRouter.get('/ranks', adminListRanks);

/** POST   /api/v1/admin/ranks           — create a rank */
adminRouter.post('/ranks', adminCreateRank);

/** POST   /api/v1/admin/ranks/seed      — seed 10 defaults */
adminRouter.post('/ranks/seed', adminSeedRanks);

/** PATCH  /api/v1/admin/ranks/:id       — update a rank */
adminRouter.patch('/ranks/:id', adminUpdateRank);

/** DELETE /api/v1/admin/ranks/:id       — delete a rank */
adminRouter.delete('/ranks/:id', adminDeleteRank);

// ---------------------------------------------------------------------------
// XP Config
// ---------------------------------------------------------------------------

/** GET  /api/v1/admin/xp-config         — current XP source values */
adminRouter.get('/xp-config', getXpConfigAdmin);

/** PATCH /api/v1/admin/xp-config        — update one or more XP values */
adminRouter.patch('/xp-config', updateXpConfigAdmin);

/** POST /api/v1/admin/xp-config/reset   — restore defaults */
adminRouter.post('/xp-config/reset', resetXpConfigAdmin);

// ---------------------------------------------------------------------------
// Reading Circle Management
// ---------------------------------------------------------------------------

/** GET  /api/v1/admin/circles */
adminRouter.get('/circles',             adminListCircles);

/** POST /api/v1/admin/circles */
adminRouter.post('/circles',            adminCreateCircle);

/** GET  /api/v1/admin/circles/:id */
adminRouter.get('/circles/:id',         adminGetCircle);

/** PATCH /api/v1/admin/circles/:id */
adminRouter.patch('/circles/:id',       adminUpdateCircle);

/** DELETE /api/v1/admin/circles/:id */
adminRouter.delete('/circles/:id',      adminDeleteCircle);

/** PATCH /api/v1/admin/circles/:id/feature */
adminRouter.patch('/circles/:id/feature', adminFeatureCircle);

/** GET    /api/v1/admin/circles/:id/members */
adminRouter.get('/circles/:id/members',              adminListCircleMembers);

/** DELETE /api/v1/admin/circles/:id/members/:userId */
adminRouter.delete('/circles/:id/members/:userId',   adminRemoveCircleMember);

/** GET    /api/v1/admin/circles/:id/posts */
adminRouter.get('/circles/:id/posts',                adminListCirclePosts);

/** DELETE /api/v1/admin/circles/:id/posts/:postId */
adminRouter.delete('/circles/:id/posts/:postId',     adminRemoveCirclePost);

/** GET    /api/v1/admin/circles/:id/posts/:postId/replies */
adminRouter.get('/circles/:id/posts/:postId/replies',              adminListCircleReplies);

/** DELETE /api/v1/admin/circles/:id/posts/:postId/replies/:replyId */
adminRouter.delete('/circles/:id/posts/:postId/replies/:replyId',  adminRemoveCircleReply);

/** GET    /api/v1/admin/circles/:id/requests */
adminRouter.get('/circles/:id/requests',                           adminListCircleRequests);

/** PATCH  /api/v1/admin/circles/:id/requests/:requestId/approve */
adminRouter.patch('/circles/:id/requests/:requestId/approve',      adminApproveCircleRequest);

/** PATCH  /api/v1/admin/circles/:id/requests/:requestId/reject */
adminRouter.patch('/circles/:id/requests/:requestId/reject',       adminRejectCircleRequest);

// ---------------------------------------------------------------------------
// Circle Config
// ---------------------------------------------------------------------------

/** GET  /api/v1/admin/circle-config */
adminRouter.get('/circle-config',  getCircleConfig);

/** PATCH /api/v1/admin/circle-config */
adminRouter.patch('/circle-config', updateCircleConfig);

// ---------------------------------------------------------------------------
// Connect Cards — admin CRUD
// ---------------------------------------------------------------------------

/** GET    /api/v1/admin/connect-cards */
adminRouter.get('/connect-cards',           adminListConnectCards);

/** POST   /api/v1/admin/connect-cards */
adminRouter.post('/connect-cards',          adminCreateConnectCard);

/** PATCH  /api/v1/admin/connect-cards/:id */
adminRouter.patch('/connect-cards/:id',     adminUpdateConnectCard);

/** DELETE /api/v1/admin/connect-cards/:id */
adminRouter.delete('/connect-cards/:id',    adminDeleteConnectCard);

/** POST   /api/v1/admin/connect-cards/reorder */
adminRouter.post('/connect-cards/reorder',  adminReorderConnectCards);
