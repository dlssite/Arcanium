import { prisma } from '../lib/prisma.js';
import type { ToolCall } from './providers/index.js';
import {
  searchContentArgsSchema,
  executeSearchContent,
  addToShelfArgsSchema,
  executeAddToShelf,
  updateReadingMoodArgsSchema,
  executeUpdateReadingMood,
  getReadingProgressArgsSchema,
  executeGetReadingProgress,
  updateReadingProgressArgsSchema,
  executeUpdateReadingProgress,
  getRecommendationsArgsSchema,
  executeGetRecommendations,
  fetchBookDetailsArgsSchema,
  executeFetchBookDetails,
  getChapterPassageArgsSchema,
  executeGetChapterPassage,
  setReadingGoalArgsSchema,
  executeSetReadingGoal,
  recommendCirclesArgsSchema,
  executeRecommendCircles,
  getCollectionBooksArgsSchema,
  executeGetCollectionBooks,
} from './tools/index.js';

export interface ExecutedAction {
  tool: string;
  args: Record<string, unknown>;
  outcome: string;
}

/**
 * Execute a single tool call. Validates args with Zod, runs the service-layer
 * function, writes an AiActionLog row, and returns a structured result.
 *
 * Returns { result, updatedEntities, action } where:
 *   result           — the raw output fed back to the AI
 *   updatedEntities  — TanStack Query cache keys to invalidate on the frontend
 *   action           — summary for the response envelope
 */
export async function executeTool(
  userId: string,
  call: ToolCall,
): Promise<{
  result: unknown;
  updatedEntities: string[];
  action: ExecutedAction;
}> {
  const start = Date.now();
  let result: unknown;
  let updatedEntities: string[] = [];

  switch (call.name) {
    case 'search_content': {
      const args = searchContentArgsSchema.parse(call.arguments);
      result = await executeSearchContent(args);
      break;
    }
    case 'add_to_shelf': {
      const args = addToShelfArgsSchema.parse(call.arguments);
      result = await executeAddToShelf(userId, args);
      updatedEntities = ['library'];
      break;
    }
    case 'update_reading_mood': {
      const args = updateReadingMoodArgsSchema.parse(call.arguments);
      result = await executeUpdateReadingMood(userId, args);
      break;
    }
    case 'get_reading_progress': {
      const args = getReadingProgressArgsSchema.parse(call.arguments);
      result = await executeGetReadingProgress(userId, args);
      break;
    }
    case 'update_reading_progress': {
      const args = updateReadingProgressArgsSchema.parse(call.arguments);
      const r = await executeUpdateReadingProgress(userId, args);
      result = r;
      updatedEntities = Array.isArray(r.updatedEntities) ? r.updatedEntities : ['library'];
      break;
    }
    case 'get_recommendations': {
      const args = getRecommendationsArgsSchema.parse(call.arguments);
      result = await executeGetRecommendations(userId, args);
      break;
    }
    case 'fetch_book_details': {
      const args = fetchBookDetailsArgsSchema.parse(call.arguments);
      result = await executeFetchBookDetails(args);
      break;
    }
    case 'get_chapter_passage': {
      const args = getChapterPassageArgsSchema.parse(call.arguments);
      result = await executeGetChapterPassage(args);
      break;
    }
    case 'set_reading_goal': {
      const args = setReadingGoalArgsSchema.parse(call.arguments);
      const r = await executeSetReadingGoal(userId, args);
      result = r;
      // Signal frontend to refresh user daily goal state
      if (Array.isArray((r as { updatedEntities?: string[] }).updatedEntities)) {
        updatedEntities = (r as { updatedEntities: string[] }).updatedEntities;
      }
      break;
    }
    case 'recommend_circles': {
      const args = recommendCirclesArgsSchema.parse(call.arguments);
      result = await executeRecommendCircles(args, userId);
      break;
    }
    case 'get_collection_books': {
      const args = getCollectionBooksArgsSchema.parse(call.arguments);
      result = await executeGetCollectionBooks(args);
      break;
    }
    default:
      result = { error: `Unknown tool: ${call.name}` };
  }

  const durationMs = Date.now() - start;

  // Write audit log — every tool call is recorded (Constitution §7.4)
  await prisma.aiActionLog.create({
    data: {
      userId,
      toolName: call.name,
      inputArgs: call.arguments as object,
      result: result as object,
      durationMs,
    },
  });

  const action: ExecutedAction = {
    tool: call.name,
    args: call.arguments,
    outcome: (result as { error?: string })?.error
      ? `Error: ${(result as { error: string }).error}`
      : 'Success',
  };

  return { result, updatedEntities, action };
}
