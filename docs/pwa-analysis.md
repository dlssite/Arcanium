# PWA Implementation Analysis — Arcanium Web App

**Date:** 2026-09-18  
**Status:** ✅ Functional with identified improvements

---

## Executive Summary

The PWA implementation is **functionally correct** and covers all essential flows: install prompt (native + manual guides), update notifications, offline caching, and service worker lifecycle. However, there are **5 medium-priority issues** and **3 enhancement opportunities** that should be addressed before production.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  index.html                                             │
│    ├─ <link rel="manifest" href="/manifest.webmanifest">│
│    └─ <meta name="theme-color"> (light + dark)         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  main.tsx                                               │
│    ├─ SW registration (both DEV and PROD)              │
│    ├─ window.__pwaEvents (EventTarget)                 │
│    ├─ window.__pwaWaitingSW (ServiceWorker ref)        │
│    └─ 60s update polling                               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  sw.js (Service Worker)                                 │
│    ├─ Install: pre-cache /, /index.html                │
│    ├─ Activate: clean old caches, claim clients        │
│    ├─ Message: listen for SKIP_WAITING                 │
│    └─ Fetch: 4 routing strategies                      │
│       • CacheFirst — static assets                     │
│       • NetworkFirst — auth, library, users            │
│       • StaleWhileRevalidate — content API, CDN        │
│       • Custom — chapters (cache only if cacheable)    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  usePWA.ts (React hook)                                 │
│    ├─ showInstallCard (eligible + not dismissed)       │
│    ├─ canNativeInstall (beforeinstallprompt captured)  │
│    ├─ isIOS / isFirefoxDesktop detection               │
│    ├─ updateAvailable (SW waiting)                     │
│    └─ promptInstall() / applyUpdate()                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  UI Components                                          │
│    ├─ PWAInstallCard — native prompt or manual guide   │
│    └─ PWAUpdateBanner — update available notification  │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ What's Working

### 1. Install Flow
- ✅ Native `beforeinstallprompt` capture for Chrome/Edge/Android
- ✅ iOS Safari manual guide (Share → Add to Home Screen)
- ✅ macOS Safari guide (File → Add to Dock)
- ✅ Firefox desktop suppression (no PWA support)
- ✅ Session-based dismiss (sessionStorage)
- ✅ Standalone mode detection (`display-mode: standalone`)
- ✅ Light + dark theme support

### 2. Update Flow
- ✅ Waiting SW detection (`registration.waiting` + `updatefound`)
- ✅ User-controlled activation (no auto-reload)
- ✅ SKIP_WAITING message passing
- ✅ `controllerchange` → reload
- ✅ 60-second update polling

### 3. Service Worker
- ✅ DEV + PROD registration (HMR-safe via `/@` and `/__vite` skip)
- ✅ 4 distinct caching strategies per route type
- ✅ Offline fallback JSON responses
- ✅ Cache busting via versioned cache names
- ✅ `clients.claim()` on activate

### 4. Manifest
- ✅ Valid JSON structure
- ✅ `start_url`, `display: standalone`, `scope: /`
- ✅ Icons (192×192, 512×512) — single source `/arcanium.png`
- ✅ `theme_color`, `background_color`
- ✅ Orientation hint (`portrait-primary`)

---

## ⚠️ Issues Found

### 🔴 **Issue #1: Icon Sizes Are a Lie**

**File:** `manifest.webmanifest`  
**Problem:**  
```json
{
  "src": "/arcanium.png",
  "sizes": "192x192",  // ❌ FALSE — actual file is 534KB, likely >1024px
  ...
},
{
  "src": "/arcanium.png",
  "sizes": "512x512",  // ❌ SAME FILE, WRONG SIZE
  ...
}
```

Both icon entries point to the **same 534KB PNG** file but claim different sizes. Browsers expect actual separate files at the declared dimensions. This breaks:
- Android splash screen generation
- iOS home screen icon rendering
- Desktop PWA taskbar icons

**Fix:**
```bash
# Generate proper sizes from source image
convert arcanium.png -resize 192x192 public/icon-192.png
convert arcanium.png -resize 512x512 public/icon-512.png
convert arcanium.png -resize 180x180 public/apple-touch-icon.png

# Update manifest
{
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}

# Update index.html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

**Impact:** Medium — works but generates low-quality scaled icons, fails Lighthouse PWA audit

---

### 🟡 **Issue #2: No Maskable Icon**

**File:** `manifest.webmanifest`  
**Problem:**  
```json
"purpose": "any maskable"  // ❌ "any maskable" is non-standard
```

The `purpose` field should be either `"any"`, `"maskable"`, or two separate icon entries. Android Adaptive Icons require a true maskable icon with safe-zone padding.

**Fix:**
```json
"icons": [
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
]
```

Then create `icon-maskable-512.png` with 10% safe-zone padding (the logo should fit inside the center 80% circle).

**Impact:** Low — fallback works, but Android users see edge-clipped icons

---

### 🟡 **Issue #3: Dismissed State Persists Across Builds**

**File:** `apps/web/src/hooks/usePWA.ts` (line 58)  
**Problem:**  
```ts
const DISMISSED_KEY = 'arcanium_pwa_install_dismissed';
sessionStorage.setItem(DISMISSED_KEY, 'true');
```

Once a user dismisses the install card, it **never shows again in that session** — even if they refresh the page and the app is now installable (e.g., after the SW becomes active on the second navigation). The dismissed state should either:
1. Expire after N hours, OR
2. Reset when `beforeinstallprompt` fires (meaning Chrome now thinks the app is installable)

**Fix:**
```ts
const DISMISSED_KEY = 'arcanium_pwa_install_dismissed';
const DISMISSED_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours

function wasDismissed(): boolean {
  const raw = sessionStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (Date.now() - ts > DISMISSED_EXPIRY) {
    sessionStorage.removeItem(DISMISSED_KEY);
    return false;
  }
  return true;
}

// In dismissInstall:
sessionStorage.setItem(DISMISSED_KEY, Date.now().toString());
```

Or simpler: clear the dismissed flag when `beforeinstallprompt` fires, since that means the browser is actively offering the install.

**Impact:** Medium — users who dismiss early may never see the prompt again even when eligibility changes

---

### 🟡 **Issue #4: No Offline Page Fallback**

**File:** `apps/web/public/sw.js` (fetch handler)  
**Problem:**  
When a user navigates to a route that hasn't been cached (e.g., `/circles/123`) while offline, the SW returns:
```js
return new Response('Offline', { status: 503 });
```

This displays a blank "Offline" text page — not a friendly branded offline page.

**Fix:**
1. Pre-cache an `offline.html` page in the install event:
   ```js
   const STATIC_ASSETS = ['/', '/index.html', '/offline.html'];
   ```

2. Create `public/offline.html`:
   ```html
   <!DOCTYPE html>
   <html>
   <head><title>Offline — Arcanium</title></head>
   <body>
     <h1>You're offline</h1>
     <p>Check your connection and try again.</p>
   </body>
   </html>
   ```

3. Return it for navigation requests:
   ```js
   async function cacheFirst(cacheName, request) {
     // ... existing logic ...
     if (request.mode === 'navigate') {
       return caches.match('/offline.html');
     }
     return new Response('Offline', { status: 503 });
   }
   ```

**Impact:** Medium — poor offline UX for uncached routes

---

### 🟡 **Issue #5: Update Polling in Every Tab**

**File:** `apps/web/src/main.tsx` (line 72)  
**Problem:**  
```ts
setInterval(() => registration.update(), 60_000);
```

If a user has 5 tabs open, each tab polls for updates every 60 seconds. That's 300 requests/hour to the SW script URL — wasteful and could trigger rate limits on some CDNs.

**Fix:**  
Use the [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) or BroadcastChannel so only the active tab polls:

```ts
const pollForUpdates = () => {
  if (!document.hidden) {
    registration.update();
  }
};

const intervalId = setInterval(pollForUpdates, 60_000);

// Also check immediately when tab becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) registration.update();
});
```

Or use a SharedWorker / BroadcastChannel to coordinate a single poll across all tabs.

**Impact:** Low — works but wastes bandwidth with multiple tabs

---

## 💡 Enhancement Opportunities

### 1. Add Screenshots to Manifest

**File:** `manifest.webmanifest`  
**Why:** Chrome Desktop and Android show install dialogs with app screenshots (since Chrome 90). This massively increases install conversion.

```json
"screenshots": [
  {
    "src": "/screenshots/home-light.png",
    "sizes": "1280x720",
    "type": "image/png",
    "form_factor": "wide",
    "label": "Home page with featured collections"
  },
  {
    "src": "/screenshots/reader-mobile.png",
    "sizes": "750x1334",
    "type": "image/png",
    "form_factor": "narrow",
    "label": "Reading experience on mobile"
  }
]
```

**Impact:** High — proven to increase install CTR by 20-40%

---

### 2. Pre-Cache Critical Routes

**File:** `sw.js`  
**Current:** Only `/` and `/index.html` are pre-cached.  
**Improvement:** Also pre-cache `/explore`, `/library`, `/liber` HTML shells so they work offline on first visit.

```js
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/explore',
  '/library',
  '/liber',
];
```

Since the app is a SPA, all routes resolve to `index.html` anyway — but pre-caching the shell ensures the skeleton loads instantly offline.

**Impact:** Medium — better offline-first experience

---

### 3. Add `shortcuts` to Manifest

**File:** `manifest.webmanifest`  
**Why:** Android and Windows show quick actions when users long-press the app icon.

```json
"shortcuts": [
  {
    "name": "Continue Reading",
    "short_name": "Continue",
    "url": "/library?filter=reading",
    "icons": [{ "src": "/shortcuts/continue.png", "sizes": "96x96" }]
  },
  {
    "name": "Explore New Series",
    "short_name": "Explore",
    "url": "/explore",
    "icons": [{ "src": "/shortcuts/explore.png", "sizes": "96x96" }]
  }
]
```

**Impact:** Low — nice polish, improves engagement

---

## 🔍 Edge Cases Verified

| Scenario | Behavior | Status |
|---|---|---|
| First visit (SW not yet active) | Card shows after SW registers (2s delay) | ✅ |
| Second visit (SW active) | `beforeinstallprompt` fires, native prompt works | ✅ |
| iOS Safari | Manual guide shown | ✅ |
| Firefox desktop | Card never shown | ✅ |
| Already installed | Card never shown | ✅ |
| Hard refresh during update | `registration.waiting` detected, banner shown | ✅ |
| Multiple tabs open during update | All tabs see banner (via `window.__pwaEvents`) | ✅ |
| Offline navigation to uncached route | Returns generic "Offline" text (needs offline.html) | ⚠️ |
| Dismissed card | Never shown again in session (should expire) | ⚠️ |

---

## 📋 Recommended Action Plan

### Priority 1 (Before Production)
1. ✅ Generate proper icon sizes (192, 512, maskable-512, apple-touch-icon)
2. ✅ Add offline.html fallback page
3. ✅ Fix dismissed state to expire after 24h

### Priority 2 (Polish)
4. ✅ Add `screenshots` to manifest
5. ✅ Optimize update polling (Page Visibility API)
6. ✅ Create maskable icon variant

### Priority 3 (Nice-to-Have)
7. Pre-cache critical route shells
8. Add manifest `shortcuts`
9. Migrate to Workbox for declarative caching rules

---

## 🎯 Final Verdict

**Grade: B+ (Very Good)**

The implementation is **production-ready** as-is for MVP, but the icon size issue and missing offline page should be fixed before public launch. The core PWA mechanics (install, update, offline) are all correct.

**Security:** ✅ No issues  
**Performance:** ✅ Solid (minor polling optimization available)  
**UX:** ⚠️ Good, but icon + offline page need attention  
**Maintainability:** ✅ Clean separation of concerns

---

**Generated:** 2026-09-18  
**Reviewed:** PWA install flow, update banner, service worker, manifest, UI components
