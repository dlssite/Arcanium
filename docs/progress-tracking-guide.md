# Reading Progress Tracking System

## Overview
Arcanium automatically tracks reading progress as users navigate through chapters. Progress is calculated as a percentage based on how many chapters the user has completed.

## How It Works

### 1. **Automatic Tracking**
When a user reads a chapter, the system automatically:
- Saves scroll position to IndexedDB every 5 seconds (debounced)
- Updates `lastChapterRead` to the current chapter number
- Syncs progress to the backend API via `PUT /api/v1/library/progress/:contentId`
- **Auto-adds the book to "Plan to Read" shelf** if it's not already in the user's library
- Updates the progress bar in real-time (optimistically)

### 2. **Progress Calculation**
Progress percentage is calculated as:
```
progress = (lastChapterRead / totalChapters) × 100
```

For example:
- Reading chapter 5 of a 100-chapter book = 5% progress
- Reading chapter 50 of a 100-chapter book = 50% progress
- Completing all chapters = 100% progress

### 3. **Architecture**

#### Frontend (`apps/web/src/features/reader/useReader.ts`)
- **`useReader` hook** fetches chapter content and manages progress tracking
- Extracts `contentId` from the loaded chapter data
- Debounces progress saves (5 seconds) to avoid excessive API calls
- Stores scroll position in IndexedDB for offline access

#### Backend Progress API (`PUT /api/v1/library/progress/:contentId`)
- Accepts:
  ```typescript
  {
    status: 'READING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED' | 'PLAN_TO_READ',
    lastChapterRead?: number,
    scrollPosition?: number  // 0-1 decimal
  }
  ```
- **Auto-library addition:** If status is `READING` and the book isn't in the user's "Plan to Read" shelf, it's automatically added
- Updates the `ReadingProgress` record in the database
- Returns `{ message: 'Progress updated' }`

#### Library Query Transformation (`apps/web/src/features/library/useLibraryQuery.ts`)
- `deriveProgress()` function converts raw API data into 0-100 percentage:
  - If status is `COMPLETED`: return 100
  - If `lastChapterRead` exists: calculate `(lastChapterRead / chapterCount) × 100`
  - If only `scrollPosition` exists: calculate `scrollPosition × 100`
  - Otherwise: return 0

### 4. **User Flow**

1. **User opens a book to read**
   - Navigates to `/read/:slug/:chapter`
   - `ReaderView` component loads
   - `useReader` hook fetches chapter data

2. **Reading triggers tracking**
   - User scrolls through the chapter
   - `setScrollPosition()` is called (debounced 5s)
   - Progress mutation fires: `{ status: 'READING', lastChapterRead: N }`

3. **Chapter completion**
   - User reaches end of chapter or clicks "Next Chapter"
   - `markCompleted()` can be called (future enhancement)
   - Progress automatically updates when navigating to next chapter

4. **Library view updates**
   - TanStack Query invalidates library cache
   - Library cards re-fetch and show updated progress bars
   - "Currently Reading" badge appears if progress > 0 && < 100
   - "Completed" badge appears if progress === 100

### 5. **Offline Support**
- Scroll position saved to IndexedDB (`progress` store)
- Restored when reopening the same chapter
- API sync happens when online

### 6. **Visual Indicators**

#### Library Cards
```tsx
<div className="progress-bar">
  <div style={{ width: `${progress}%` }} />
</div>
<span>{progress}%</span>
```

#### Status Badges
- **Resume**: progress > 0 && progress < 100
- **Completed**: progress === 100
- **Queue**: progress === 0 (saved but not started)

## Testing

### Manual Test Flow
1. **Setup**: Run `node reseed.mjs` to populate test data
2. **Navigate**: Open Home → Click "Begin Reading" on any book
3. **Read**: Navigate through 2-3 chapters using "Next Chapter" button
4. **Verify**: 
   - Go back to Library view
   - Book card should show progress bar at ~2-3%
   - Badge should say "Resume"
5. **Complete**: Read all chapters (or manually set progress to 100 via API)
6. **Verify**: Badge changes to "Completed", progress bar is green and full

### API Test (via curl/Postman)
```bash
# Update progress to chapter 25 of 100
curl -X PUT http://localhost:3001/api/v1/library/progress/<contentId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "READING",
    "lastChapterRead": 25
  }'

# Mark as completed
curl -X PUT http://localhost:3001/api/v1/library/progress/<contentId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "lastChapterRead": 100
  }'
```

## Future Enhancements
- [ ] Auto-mark chapter as complete when user reaches bottom
- [ ] "Mark as Read" button in chapter navigation
- [ ] Bulk progress operations (e.g., "Mark first 10 chapters as read")
- [ ] Reading goals tracking (chapters per day/week)
- [ ] Reading history timeline
- [ ] Progress sync across devices (already supported via backend)

## Related Files
- `apps/web/src/features/reader/useReader.ts` — Progress tracking logic
- `apps/web/src/features/library/useLibraryQuery.ts` — Progress calculation
- `apps/web/src/features/library/useLibraryMutations.ts` — Progress mutation
- `packages/api-client/src/index.ts` — API client methods
- `packages/types/src/book.ts` — Type definitions
- `apps/backend/src/modules/library/routes/progressRouter.ts` — Backend API
