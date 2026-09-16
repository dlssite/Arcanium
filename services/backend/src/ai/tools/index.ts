/**
 * Exports all tool definitions as an array (passed to the AI provider)
 * and all executor functions + Zod schemas (called by executor.ts).
 *
 * To add a new tool:
 *   1. Create its file in this directory
 *   2. Export definition + argsSchema + executor function from it
 *   3. Add the exports below
 *   4. Add the definition to ALL_TOOL_DEFINITIONS
 *   5. Add a case to executor.ts
 */

export { searchContentDefinition, searchContentArgsSchema, executeSearchContent } from './search-content.tool.js';
export { addToShelfDefinition, addToShelfArgsSchema, executeAddToShelf } from './add-to-shelf.tool.js';
export { updateReadingMoodDefinition, updateReadingMoodArgsSchema, executeUpdateReadingMood } from './update-reading-mood.tool.js';
export { getReadingProgressDefinition, getReadingProgressArgsSchema, executeGetReadingProgress } from './get-reading-progress.tool.js';
export { updateReadingProgressDefinition, updateReadingProgressArgsSchema, executeUpdateReadingProgress } from './update-reading-progress.tool.js';
export { getRecommendationsDefinition, getRecommendationsArgsSchema, executeGetRecommendations } from './get-recommendations.tool.js';
export { fetchBookDetailsDefinition, fetchBookDetailsArgsSchema, executeFetchBookDetails } from './fetch-book-details.tool.js';
export { getChapterPassageDefinition, getChapterPassageArgsSchema, executeGetChapterPassage } from './get-chapter-passage.tool.js';
export { setReadingGoalDefinition, setReadingGoalArgsSchema, executeSetReadingGoal } from './set-reading-goal.tool.js';
export { recommendCirclesDefinition, recommendCirclesArgsSchema, executeRecommendCircles } from './recommend-circles.tool.js';
export { getCollectionBooksDefinition, getCollectionBooksArgsSchema, executeGetCollectionBooks } from './get-collection-books.tool.js';

import { searchContentDefinition } from './search-content.tool.js';
import { addToShelfDefinition } from './add-to-shelf.tool.js';
import { updateReadingMoodDefinition } from './update-reading-mood.tool.js';
import { getReadingProgressDefinition } from './get-reading-progress.tool.js';
import { updateReadingProgressDefinition } from './update-reading-progress.tool.js';
import { getRecommendationsDefinition } from './get-recommendations.tool.js';
import { fetchBookDetailsDefinition } from './fetch-book-details.tool.js';
import { getChapterPassageDefinition } from './get-chapter-passage.tool.js';
import { setReadingGoalDefinition } from './set-reading-goal.tool.js';
import { recommendCirclesDefinition } from './recommend-circles.tool.js';
import { getCollectionBooksDefinition } from './get-collection-books.tool.js';
import type { ToolDefinition } from '../providers/index.js';

/** All tool definitions — passed as the `tools` array to the AI provider. */
export const ALL_TOOL_DEFINITIONS: ToolDefinition[] = [
  searchContentDefinition,
  addToShelfDefinition,
  updateReadingMoodDefinition,
  getReadingProgressDefinition,
  updateReadingProgressDefinition,
  getRecommendationsDefinition,
  fetchBookDetailsDefinition,
  getChapterPassageDefinition,
  setReadingGoalDefinition,
  recommendCirclesDefinition,
  getCollectionBooksDefinition,
];
