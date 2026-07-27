---
name: Mobile branding parity
description: Mobile app color/type tokens now match the web light theme; source of truth is web CSS variables.
---

## Rule
`constants/colors.ts` is the single source of truth for mobile design tokens. It must stay in sync with `:root` variables in `artifacts/padel-exchange/src/index.css`. Light-only; no dark mode planned.

## Token mapping (July 2026)
| Token | Value | Web variable |
|---|---|---|
| background | #FFFFFF | --background |
| foreground | #0F172A | --foreground |
| card | #F8FAFC | --card |
| primary | #178177 | --primary |
| primaryForeground | #FFFFFF | --primary-foreground |
| secondary / muted | #F1F5F9 | --secondary / --muted |
| mutedForeground | #64748B | --muted-foreground |
| border / input | #E2E8F0 | --border / --input |
| accent | #E6F6F4 | --accent |
| radius | 12 px | --radius (0.75 rem) |

## Typography scale
`constants/typography.ts` — 5 steps: label (11/SemiBold), caption (13/Regular), body (15/Regular), heading (17/Bold), title (22/Bold). Import as `import { type as T } from '@/constants/typography'`.

## Tab bar
`app/(tabs)/_layout.tsx` BlurView tint must be `"light"` (was `"dark"` before the parity fix).

**Why:** The old scaffold used a dark blue background; after switching to white the blur tint was wrong and produced a dark frosted overlay on iOS.
