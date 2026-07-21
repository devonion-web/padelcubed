---
name: Admin easter egg navigation
description: How hidden admin access works and the routing pitfalls discovered
---

## Rule
Admin is accessed via 5 rapid taps on the P³ logo in the Events screen. This navigates to `/admin` (the stack route at `app/admin/index.tsx`), NOT `/(tabs)/admin-tab`.

**Why:** `/(tabs)/admin-tab` with `href: null` is completely unreachable via router — pushes silently fail. `tabBarButton: () => null` hides the button visually but still blocks reliable push navigation to tabs. The `/admin` stack route always works.

**How to apply:** Any future admin entry point should use `router.navigate('/admin')`. The `(tabs)/admin-tab` screen is kept for the tab bar shortcut once logged in, but is never the navigation target.

## Tab hiding pitfall
- `href: null` on a Tabs.Screen = tab hidden AND route unreachable via router.push/navigate
- `tabBarButton: () => null` = tab hidden visually but route still unreachable reliably on native
- Correct approach: keep admin as a separate stack route outside `(tabs)`

## Pressable vs TouchableOpacity
On Expo web, `TouchableOpacity` can fail silently when wrapping complex components in certain layouts. `Pressable` is more reliable for cross-platform click/press handling.

## Expo web console logs
`console.log` from the Expo web app iframe does NOT reach Replit's browser console capture. Native device logs DO appear in the Expo workflow logs. Use native logs for debugging cross-platform issues.

## admin/index.tsx
`app/admin/index.tsx` was historically the old single-password login (pre-JWT). It has been rewritten to use email+password JWT login matching `AdminContext.login(email, password)`. Always keep this in sync with the `admin-tab.tsx` login flow.
