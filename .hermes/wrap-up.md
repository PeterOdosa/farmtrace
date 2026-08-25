# FarmTrace Project — Wrap-Up

## 2026-08-04 — Fix 30 TypeScript Compilation Errors

### Done
- **syncQueue.ts** — Moved `useConnectionMonitor` import from bottom of file to top alongside other imports (eliminated duplicate import at EOF)
- **BoundaryMapScreen.tsx** (~10 errors) — Renamed route param `mode` → `boundaryMode` to avoid collision with local state; updated all stale `'pin'`/`'walk'` comparisons; fixed GPS subscription pattern (`watchIdRef` number → `watchSubscriptionRef` LocationSubscription); made `beginTracking` async/await; fixed `stopWalkTracking` to use `.remove()` instead of `Location.watchPositionAsync.cancel()`; removed unsupported `dashed` prop from `<Polyline>`; added `processQueue` to `useSyncQueue()` destructuring
- **FieldDetailScreen.tsx** (~5 errors) — Removed stale `queueAction` import (uses `useSyncQueue` hook now); replaced dynamic `import('expo-location')` with direct `Location` API calls; fixed live positioning subscription typing and cleanup; changed `MapView.Polyline` → imported `<Polyline>`
- **RoadTraceScreen.tsx** (~3 errors) — Added `Polygon` to react-native-maps import; fixed GPS subscription (`watchIdRef` number → `watchSubscriptionRef` LocationSubscription); fixed `beginTracking`/`stopWalk` to use async/await with `.remove()`; changed `MapView.Polygon` → imported `<Polygon>`
- **SignupScreen.tsx** (~2 errors) — Replaced dynamic `import('../services/api')` with direct `getCurrentUser` import; changed `View` → `TouchableOpacity` for role option selectors (they had `onPress`); wrapped footer "Sign in" text in `TouchableOpacity`

### Verification
- `tsc --noEmit` returns **0 errors, exit code 0** — clean build confirmed

### Pending / Next Steps
1. Install PostgreSQL + PostGIS locally to run the API server
2. Verify Expo mobile build with `npx expo start --clear`
3. Complete Polygon Import feature (GeoJSON/KML/KMZ/Shapefile support)

### Decisions
- Prioritized surgical TS cleanup (~20 mins) over PostgreSQL install — a clean mobile build is a hard prerequisite for offline mode verification and device testing
- GPS subscription pattern standardized: `await Location.watchPositionAsync(options, callback)` → `.remove()` for cleanup

## 2026-08-06 — Mapbox SDK Installation & Config

### Done
- **Web: installed Mapbox SDKs** — `mapbox-gl@3.28.0` + `react-map-gl@8.1.2` (via `/mapbox` subpath export)
- **Mobile: installed @rnmapbox/maps@10.3.5** — native Mapbox GL SDK for Expo
- **Web build passes** — clean Vite compilation, Mapbox GL JS chunked into separate asset (1.87 MB gzipped to 522 KB)
- **Created MapTest page** (`/maptest`) — satellite map with 3 sample markers, popup, nav controls, zoom/center footer
- **Centralized env config** — `web/src/config/env.ts` with `MAPBOX_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` with defaults
- **Updated Supabase client** (`web/src/lib/supabase.ts`) to import from centralized env config
- **Configured mobile Mapbox plugin** in `mobile/app.json` (placeholder token)
- **Added `.env.example`** for web project
- **Committed to main**: `feat: add Mapbox SDKs (web: react-map-gl/mapbox + mobile: @rnmapbox/maps)`

### Pending
- User needs to provide Mapbox token (pk.) and Supabase anon key to replace placeholders
- Push + deploy to Vercel once tokens are set
- Verify MapTest page loads correctly live
- **Next major step**: Supabase Edge Functions (`calculate-geometry`, `import-polygon`, `export-plan`)
- Then: wire mobile boundary mapping (walk/pin GPS tracking + polygon drawing)
- Then: mobile road tracing, live positioning, layer toggle
- Then: EAS mobile build config
- Then: web planning canvas (drag-and-drop toolbar)

### Decisions
- Mapbox free tier: 50K web loads/mo + 25K MAU mobile — sufficient for MVP stage
- Alternative noted: MapLibre (open-source, no billing) if cost becomes a concern later
- react-map-gl@8 requires `/mapbox` subpath import — not bare `react-map-gl`
