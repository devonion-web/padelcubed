/**
 * SplashAnimation — vertical slot-machine reel.
 *
 * A static rounded-square card clips a reel of padel icons.
 * Each icon slides up from below, pauses, then the next slides in.
 * The reel finally lands on the P³ logo with a spring bounce.
 * After a short hold the tagline fades in, then the whole overlay fades out.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Icon sequence (padel-themed silhouettes → P³) ───────────────────────────

type VectorIcon = { kind: 'icon'; name: string };
type LogoIcon   = { kind: 'logo' };
type IconDef    = VectorIcon | LogoIcon;

const ICONS: IconDef[] = [
  { kind: 'icon', name: 'tennis'               },  // forehand drive
  { kind: 'icon', name: 'badminton'            },  // overhead smash
  { kind: 'icon', name: 'run'                  },  // sprinting player
  { kind: 'icon', name: 'tennis-ball'          },  // ball
  { kind: 'icon', name: 'human-handsup'        },  // winner arms-raised
  { kind: 'icon', name: 'trophy-outline'       },  // trophy
  { kind: 'logo'                                },  // P³ — final reveal
];

// ─── Timing ───────────────────────────────────────────────────────────────────

const HOLD_MS      = 480;   // pause on each icon
const SLIDE_MS     = 260;   // slide-in duration (non-final icons)
const SPRING_DELAY = 60;    // tiny delay before final spring so the reel "stops"
const TAGLINE_MS   = 380;
const LINGER_MS    = 800;
const FADE_MS      = 460;

// ─── Card dimensions ──────────────────────────────────────────────────────────

const CARD_SIZE   = 136;
const CARD_RADIUS = Math.round(CARD_SIZE * 0.28);  // ≈38 px — same rounding as HeaderLogo
const ICON_SIZE   = 68;

// ─── P³ logo (matches HeaderLogo layout) ─────────────────────────────────────

function PadLogo() {
  const pSize   = Math.round(CARD_SIZE * 0.60);   // ~82 px
  const supSize = Math.round(pSize * 0.46);        // ~38 px
  return (
    <View style={styles.glyphRow}>
      <Text style={[styles.glyphP, { fontSize: pSize, lineHeight: pSize * 1.05 }]} allowFontScaling={false}>
        P
      </Text>
      <Text style={[styles.glyphSup, { fontSize: supSize, lineHeight: supSize * 1.1 }]} allowFontScaling={false}>
        3
      </Text>
    </View>
  );
}

// ─── Single icon renderer ─────────────────────────────────────────────────────

function ReelIcon({ icon }: { icon: IconDef }) {
  if (icon.kind === 'logo') return <PadLogo />;
  return (
    <MaterialCommunityIcons
      name={icon.name as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
      size={ICON_SIZE}
      color="#F4F7FB"
    />
  );
}

// ─── Slot-machine reel ────────────────────────────────────────────────────────
//
// Two icon slots are stacked vertically inside a clipped container:
//   ┌─────────────┐  ← overflow: hidden, height = CARD_SIZE
//   │  CURRENT    │  ← y = 0          (visible)
//   │  NEXT       │  ← y = CARD_SIZE  (waiting below)
//   └─────────────┘
//
// Sliding translateY from 0 → -CARD_SIZE pushes current out the top
// and brings next into view — classic slot-machine reel trick.

interface ReelProps {
  /** index currently in view */
  current: number;
  /** index waiting below, about to slide in */
  next: number;
  /** animated translate (0 → -CARD_SIZE) */
  slideY: Animated.Value;
}

function Reel({ current, next, slideY }: ReelProps) {
  return (
    <Animated.View
      style={[
        styles.reel,
        { transform: [{ translateY: slideY }] },
      ]}
    >
      {/* Currently visible icon */}
      <View style={styles.reelSlot}>
        <ReelIcon icon={ICONS[current]} />
      </View>
      {/* Next icon, waiting one slot below */}
      <View style={styles.reelSlot}>
        <ReelIcon icon={ICONS[next]} />
      </View>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SplashAnimationProps {
  onComplete: () => void;
}

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const insets = useSafeAreaInsets();

  // Which icon is currently visible (top slot of the reel)
  const [currentIdx, setCurrentIdx] = useState(0);
  // Which icon is waiting in the bottom slot
  const [nextIdx,    setNextIdx]    = useState(1);

  // Reel position: 0 = current icon visible; -CARD_SIZE = next icon visible
  const slideY        = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  /**
   * Slide to a new icon.
   * - Sets the next slot to `toIndex`
   * - Animates the reel up
   * - When done: resets reel position and swaps current → toIndex
   */
  const slideTo = useCallback(
    (toIndex: number, isFinal: boolean): Promise<void> =>
      new Promise((resolve) => {
        // Put the target icon in the waiting slot
        setNextIdx(toIndex);
        // Small sync gap so React renders the next slot before we animate
        requestAnimationFrame(() => {
          if (isFinal) {
            // Spring settle for the landing on P³
            setTimeout(() => {
              Animated.spring(slideY, {
                toValue: -CARD_SIZE,
                tension: 80,
                friction: 9,
                useNativeDriver: true,
              }).start(() => {
                // Snap: promote next → current, reset reel position silently
                setCurrentIdx(toIndex);
                slideY.setValue(0);
                resolve();
              });
            }, SPRING_DELAY);
          } else {
            // Smooth ease-in-out slide for intermediate icons
            Animated.timing(slideY, {
              toValue: -CARD_SIZE,
              duration: SLIDE_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start(() => {
              setCurrentIdx(toIndex);
              slideY.setValue(0);
              resolve();
            });
          }
        });
      }),
    [slideY],
  );

  // Orchestrate the full sequence
  useEffect(() => {
    if (Platform.OS === 'web') { onComplete(); return; }

    let cancelled = false;
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    async function run() {
      for (let i = 1; i < ICONS.length; i++) {
        if (cancelled) return;
        await delay(HOLD_MS);
        if (cancelled) return;
        await slideTo(i, i === ICONS.length - 1);
      }

      // Hold on P³, then fade tagline in
      if (cancelled) return;
      await delay(HOLD_MS * 0.7);

      await new Promise<void>((r) =>
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: TAGLINE_MS,
          useNativeDriver: true,
        }).start(() => r()),
      );

      await delay(LINGER_MS);
      if (cancelled) return;

      // Fade out the entire overlay
      await new Promise<void>((r) =>
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start(() => r()),
      );

      if (!cancelled) onComplete();
    }

    run();
    return () => { cancelled = true; };
  }, [slideTo, taglineOpacity, overlayOpacity, onComplete]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity }]}
      pointerEvents="none"
    >
      {/* ── Static card with clipped reel ── */}
      <View style={styles.cardShadow}>
        <LinearGradient
          colors={['#1a3050', '#0b1825']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* overflow:hidden clips the reel to exactly one icon height */}
          <View style={styles.window}>
            <Reel current={currentIdx} next={nextIdx} slideY={slideY} />
          </View>
        </LinearGradient>
      </View>

      {/* ── Tagline ── */}
      <Animated.View style={[styles.taglineWrap, { opacity: taglineOpacity }]}>
        <Text style={styles.tagline}>
          <Text style={styles.taglineAccent}>People</Text>
          <Text style={styles.taglineDot}> · </Text>
          <Text style={styles.taglineAccent}>Padel</Text>
          <Text style={styles.taglineDot}> · </Text>
          <Text style={styles.taglineAccent}>Places</Text>
        </Text>
      </Animated.View>

      <View style={{ height: insets.bottom }} />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4169E1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    zIndex: 999,
  },

  // Outer wrapper carries the shadow (shadow can't sit on overflow:hidden views)
  cardShadow: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 14,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',      // ← clips the sliding reel
  },

  // Clipping window — exactly one slot tall, centred inside the card
  window: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  // The reel strip: two icon slots stacked, total height = CARD_SIZE × 2
  reel: {
    width: CARD_SIZE,
    alignItems: 'center',
  },
  reelSlot: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // P³ glyph — matches HeaderLogo
  glyphRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 4,
    paddingBottom: 4,
  },
  glyphP: {
    color: '#F4F7FB',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  glyphSup: {
    color: '#19C3B0',
    fontFamily: 'Inter_700Bold',
    alignSelf: 'flex-start',
    letterSpacing: 0,
    marginBottom: 2,
  },

  taglineWrap: { alignItems: 'center' },
  tagline: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  taglineAccent: { color: '#FFFFFF' },
  taglineDot:    { color: 'rgba(255,255,255,0.45)' },
});
