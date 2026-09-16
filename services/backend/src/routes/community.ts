import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getCommunityOverview, echoPost as echoMarginaliaPost } from '../services/community.service.js';
import {
  requireCircleOwner,
  requireCircleMod,
  requireCircleMember,
  resolveCircleMembershipMiddleware,
} from '../middleware/requireCircleRole.js';
import {
  listCircles,
  getCircle,
  createCircle,
  updateCircle,
  deleteCircle,
  joinCircle,
  leaveCircle,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  listMembers,
  promoteMember,
  demoteMember,
  removeMember,
  listPosts,
  createPost,
  deletePost,
  echoPost,
  pinPost,
  listReplies,
  createReply,
  deleteReply,
  listSessions,
  startSession,
  endSession,
} from '../services/circles.service.js';

export const communityRouter: Router = Router();

// All community routes require authentication
communityRouter.use(authenticate);

// ---------------------------------------------------------------------------
// Global community overview
// ---------------------------------------------------------------------------

communityRouter.get('/overview', getCommunityOverview);
communityRouter.post('/echo/:postId', echoMarginaliaPost);

// ---------------------------------------------------------------------------
// Circles directory & CRUD
// ---------------------------------------------------------------------------

communityRouter.get('/circles',     listCircles);
communityRouter.post('/circles',    createCircle);
communityRouter.get('/circles/:circleId',    resolveCircleMembershipMiddleware, getCircle);
communityRouter.patch('/circles/:circleId',  requireCircleOwner,                updateCircle);
communityRouter.delete('/circles/:circleId', requireCircleOwner,                deleteCircle);

// ---------------------------------------------------------------------------
// Membership — join / leave
// ---------------------------------------------------------------------------

communityRouter.post('/circles/:circleId/join',   joinCircle);
communityRouter.delete('/circles/:circleId/leave', resolveCircleMembershipMiddleware, leaveCircle);

// ---------------------------------------------------------------------------
// Join requests (private circles)
// ---------------------------------------------------------------------------

communityRouter.get('/circles/:circleId/requests',
  requireCircleMod, listJoinRequests);

communityRouter.patch('/circles/:circleId/requests/:requestId/approve',
  requireCircleMod, approveJoinRequest);

communityRouter.patch('/circles/:circleId/requests/:requestId/reject',
  requireCircleMod, rejectJoinRequest);

// ---------------------------------------------------------------------------
// Member management
// ---------------------------------------------------------------------------

communityRouter.get('/circles/:circleId/members',
  resolveCircleMembershipMiddleware, listMembers);

communityRouter.patch('/circles/:circleId/members/:userId/promote',
  requireCircleOwner, promoteMember);

communityRouter.patch('/circles/:circleId/members/:userId/demote',
  requireCircleOwner, demoteMember);

communityRouter.delete('/circles/:circleId/members/:userId',
  requireCircleMod, removeMember);

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

communityRouter.get('/circles/:circleId/posts',
  resolveCircleMembershipMiddleware, listPosts);

communityRouter.post('/circles/:circleId/posts',
  requireCircleMember, createPost);

communityRouter.delete('/circles/:circleId/posts/:postId',
  resolveCircleMembershipMiddleware, deletePost);

communityRouter.post('/circles/:circleId/posts/:postId/echo',
  echoPost);

communityRouter.patch('/circles/:circleId/posts/:postId/pin',
  requireCircleMod, pinPost);

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

communityRouter.get('/circles/:circleId/posts/:postId/replies',
  resolveCircleMembershipMiddleware, listReplies);

communityRouter.post('/circles/:circleId/posts/:postId/replies',
  requireCircleMember, createReply);

communityRouter.delete('/circles/:circleId/posts/:postId/replies/:replyId',
  resolveCircleMembershipMiddleware, deleteReply);

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

communityRouter.get('/circles/:circleId/sessions',
  requireCircleMember, listSessions);

communityRouter.post('/circles/:circleId/sessions',
  requireCircleMod, startSession);

communityRouter.patch('/circles/:circleId/sessions/active/end',
  requireCircleMod, endSession);
