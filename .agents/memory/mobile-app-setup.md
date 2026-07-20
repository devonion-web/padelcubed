---
name: Mobile app setup
description: Key decisions and structure for the P³ Expo mobile app (artifacts/padel-cubed-mobile).
---

## Artifact
- Slug: `padel-cubed-mobile`, previewPath: `/padel-cubed-mobile/`
- Stack: Expo SDK 54, expo-router, React Query, AsyncStorage

## Brand tokens (synced from web app index.css)
- background: `#4169E1` (Royal Blue hsl 225 73% 57%)
- primary: `#19C3B0` (Electric Turquoise — taken from `.pc-mark` CSS rule, not the raw hsl calc)
- card: `#3557C8`, border/secondary: `#3A52A6`
- navy (logo bg): `#0E1B2C`
- radius: 12px

**Why:** The web app's `--primary` HSL value calculates to ~#13ECEC but the designer explicitly uses `#19C3B0` in the `.pc-mark` CSS. Mobile uses the designer's explicit value.

## Phase 1 screens
- `(tabs)/index.tsx` — Events list (local data in `constants/events.ts`)
- `(tabs)/register.tsx` — Registration form → `useSubmitRegistration` from `@workspace/api-client-react` + saves profile to AsyncStorage via ProfileContext
- `(tabs)/profile.tsx` — Member profile from AsyncStorage
- `event/[id].tsx` — Event detail with LinearGradient hero header

## Key setup
- `setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`)` called at module level in `app/_layout.tsx`
- ProfileProvider wraps the app in `_layout.tsx`
- Tab bar uses NativeTabs (iOS 26+ liquid glass) or ClassicTabs fallback with BlurView

## Phase 2 (not yet built)
Push notifications, leaderboard & results.

## Phase 3 (not yet built)
Event check-in / QR code, admin tools.
