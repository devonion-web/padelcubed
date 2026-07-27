/**
 * P³ type scale — five named steps, all Inter, synced with the web app.
 *
 * Usage:
 *   import { type as T } from '@/constants/typography';
 *   style={[T.body, { color: colors.foreground }]}
 *
 * Steps mirror the web's Tailwind scale at the sizes that read well on mobile:
 *   label   →  text-xs  (11 px, SemiBold)   — badges, chips, event-format tags
 *   caption →  text-sm  (13 px, Regular)    — metadata, secondary text, hints
 *   body    →  text-sm+ (15 px, Regular)    — body copy, form labels, list subtitles
 *   heading →  text-base+(17 px, Bold)      — card titles, section headings
 *   title   →  text-xl  (22 px, Bold)       — screen/page titles
 */
export const type = {
  label: {
    fontFamily: 'Inter_600SemiBold' as const,
    fontSize: 11,
    lineHeight: 15,
  },
  caption: {
    fontFamily: 'Inter_400Regular' as const,
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    fontFamily: 'Inter_400Regular' as const,
    fontSize: 15,
    lineHeight: 22,
  },
  heading: {
    fontFamily: 'Inter_700Bold' as const,
    fontSize: 17,
    lineHeight: 22,
  },
  title: {
    fontFamily: 'Inter_700Bold' as const,
    fontSize: 22,
    lineHeight: 28,
  },
} as const;
