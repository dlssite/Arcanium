# HomeView & Sidebar Fixes Summary

## Issues Fixed

### 1. ✅ Daily Goal Tracking
**Status:** Implemented  
**File:** `apps/web/src/features/reader/components/ReaderView.tsx`  
**How it works:** Tracks reading time every 2 minutes and on unmount, updates daily goal in real-time

### 2. ✅ Streak Calendar - Correct Day Highlighting
**Status:** Fixed  
**File:** `apps/web/src/components/layout/DesktopSidebar.jsx`  
**Fix:** Now uses `new Date().getDay()` to determine actual current day instead of hardcoding

### 3. ⚠️ Continue Reading Card - Shows "No book in progress"
**Status:** Backend fix implemented, requires restart  
**File:** `services/backend/src/services/library.service.ts`  
**What was changed:** Progress tracking now adds books to "Reading" shelf instead of "Plan to Read"

## Required Actions

### Step 1: Restart Backend (CRITICAL)
The backend code was updated but the server needs to restart for changes to take effect:

```powershell
# Stop the current backend process (Ctrl+C in the terminal)
# Then restart:
pnpm --filter @arcanium/backend dev
```

### Step 2: Clear Browser Cache
Since you reseeded the database, clear IndexedDB:

1. Open DevTools (F12)
2. Application tab → IndexedDB
3. Delete "arcanium-reader" database
4. Hard refresh: `Ctrl+Shift+R`

### Step 3: Test the Flow

1. **Test Continue Reading:**
   - Go to Explore → Click any book → "Begin Reading"
   - Read for 10+ seconds
   - Navigate back to Home
   - **Expected:** Book should appear in Continue Reading card

2. **Test Daily Goal:**
   - Keep reading for 2+ minutes
   - **Expected:** Today's Goal progress bar should update
   - Check: `dailyGoal.completedMinutes` should increase

3. **Test Streak Calendar:**
   - Check desktop sidebar (left side)
   - **Expected:** Current day of week should have orange ring
   - Previous days within streak should have purple checks

## How It Works Now

### Continue Reading Logic
```
User clicks "Begin Reading" 
  → Chapter loads
  → After 5 seconds, progress tracking fires
  → Backend auto-adds book to "Reading" shelf
  → HomeView's useLibrary() fetches updated library
  → toCurrentlyReading() finds first book in "Reading" shelf
  → Book appears in Continue Reading card
```

### Streak Calendar Logic
```javascript
const today = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
const dayIndex = idx === 6 ? 0 : idx + 1; // Convert M-S array to JS day numbering
const daysAgo = (today - dayIndex + 7) % 7;
const hasCheck = daysAgo < user.readingStreak;
const isToday = dayIndex === today;
```

**Visual indicators:**
- **Orange ring + scale:** Current day
- **Purple with check:** Previous days in streak
- **Gray with no check:** Days outside streak

## Troubleshooting

### Issue: Continue Reading still shows "No book in progress"

**Possible causes:**
1. Backend not restarted → restart backend server
2. Library cache not invalidated → wait 2 minutes or hard refresh
3. Book not in "Reading" shelf → check backend logs for `[Progress] Tracking progress for "..."` message

**Debug steps:**
```powershell
# Check backend logs
# Should see: [Progress] Tracking progress for "BookTitle" (cmXXX...)

# Check network tab
# Should see: PUT /api/v1/library/progress/... → 200 OK

# Check library API response
# GET /api/v1/library → should have "Reading" shelf with entries
```

### Issue: Streak calendar highlights wrong day

**Cause:** Browser timezone mismatch or caching  
**Fix:** Hard refresh (`Ctrl+Shift+R`)

**Verify:**
```javascript
// Open console and run:
new Date().getDay()
// Should return: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
```

### Issue: Daily goal not updating

**Cause:** Reading time < 2 minutes (debounce interval)  
**Fix:** Read for at least 2 minutes to see first update

**Verify:**
```javascript
// Open console while reading:
useUserStore.getState().dailyGoal.completedMinutes
// Should increase every 2 minutes
```

## Files Modified

1. ✅ `apps/web/src/features/reader/components/ReaderView.tsx` - Daily goal tracking
2. ✅ `services/backend/src/services/library.service.ts` - Auto-add to Reading shelf
3. ✅ `apps/web/src/components/layout/DesktopSidebar.jsx` - Streak calendar day logic
4. ✅ `apps/web/src/features/profile/components/ProfileView.tsx` - Added streak visualization

## Next Steps

After testing, if issues persist:
1. Check backend console for error messages
2. Check browser console for React errors
3. Verify database has "Reading" shelf: `SELECT * FROM Shelf WHERE name = 'Reading';`
4. Check if books were added to shelf: `SELECT * FROM ShelfEntry WHERE shelfId = '...';`
