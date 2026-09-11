# Clear Browser Cache Guide

## When to Clear Cache

Clear your browser cache when you see these errors:
- **404 errors on progress tracking** (content ID not found)
- **Stale chapter data** after running `reseed.mjs`
- **Old content IDs** in network requests
- **Chapter images not loading** (expired CDN URLs)

## Quick Fix: Clear IndexedDB

### Method 1: Browser DevTools (Recommended)

1. **Open DevTools**: Press `F12` or `Ctrl+Shift+I`
2. **Go to Application tab** (Chrome/Edge) or **Storage tab** (Firefox)
3. **Find IndexedDB** in left sidebar
4. **Expand "arcanium-reader"**
5. **Right-click → Delete database**
6. **Hard refresh the page**: `Ctrl+Shift+R`

### Method 2: Console Command

1. **Open DevTools Console**: Press `F12` → Console tab
2. **Paste this command**:
   ```javascript
   indexedDB.deleteDatabase('arcanium-reader');
   console.log('✅ IndexedDB cleared! Refresh the page.');
   ```
3. **Refresh the page**: `F5` or `Ctrl+R`

### Method 3: Full Cache Clear

**Chrome/Edge:**
1. Press `Ctrl+Shift+Delete`
2. Select "Cached images and files" + "Cookies and other site data"
3. Time range: "All time"
4. Click "Clear data"

**Firefox:**
1. Press `Ctrl+Shift+Delete`
2. Select "Cache" + "Cookies" + "Offline website data"
3. Time range: "Everything"
4. Click "Clear Now"

## After Reseeding Database

If you run `node reseed.mjs`, **always clear IndexedDB cache** because:
- Content IDs change (new CUIDs generated)
- Chapter data from old content becomes stale
- Progress tracking will fail with 404 errors

**Quick workflow:**
```bash
# 1. Reseed database
node reseed.mjs

# 2. Clear browser cache (DevTools → Application → IndexedDB → Delete)

# 3. Hard refresh browser
# Ctrl+Shift+R

# 4. Test flow works now
```

## Verify Cache is Cleared

1. Open DevTools → Application → IndexedDB
2. Should see no "arcanium-reader" database (or it's empty)
3. Navigate to a book and start reading
4. IndexedDB should repopulate with fresh data

## Debugging Progress Tracking

If progress still fails after clearing cache:

1. **Check backend logs**:
   ```powershell
   # Should see console logs like:
   # [Progress] Tracking progress for "Mother of Learning" (cm...)
   ```

2. **Check Network tab**:
   - Filter by `/progress/`
   - Click failed request
   - Check Response tab for error message

3. **Verify content exists**:
   - Note the contentId from the failed request
   - Check if that content exists in Explore/Home pages
   - If not, run `node reseed.mjs` again

## Common Issues

### Issue: "Content not found" after reseed
**Cause:** Old content IDs cached in IndexedDB  
**Fix:** Clear IndexedDB (Method 1 or 2 above)

### Issue: Chapter images not loading
**Cause:** MangaDex CDN URLs expired (~15 min lifetime)  
**Fix:** Refresh the page (URLs re-fetched on each request)

### Issue: Progress not updating in Library view
**Cause:** TanStack Query cache not invalidating  
**Fix:** Hard refresh (`Ctrl+Shift+R`) or wait 2 minutes (staleTime)

## Automatic Cache Handling (Future)

Future enhancements to prevent this issue:
- [ ] Version-based cache invalidation (detect DB schema changes)
- [ ] Content ID validation before caching
- [ ] Graceful fallback when cached content doesn't exist
- [ ] Auto-refresh on 404 errors
