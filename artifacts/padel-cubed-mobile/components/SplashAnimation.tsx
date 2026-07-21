/**
 * SplashAnimation — vertical slot-machine reel, slow → fast → P³ spring land.
 *
 * Six real padel player silhouette PNGs cycle through the card window,
 * each transition faster than the last. The reel then springs to a stop
 * on the P³ mark. Tagline fades in, overlay fades out.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Asset map ────────────────────────────────────────────────────────────────
// These icons fill the rounded square edge-to-edge — no white border.

const PADEL_IMAGES = [
  require('../assets/splash/icon1.png'),
  require('../assets/splash/icon2.png'),
  require('../assets/splash/icon3.png'),
  require('../assets/splash/icon4.png'),
] as const;

// ─── Icon sequence ────────────────────────────────────────────────────────────
//   0-5 → padel player images
//   6   → P³ logo (final)

type ImageIcon = { kind: 'image'; src: (typeof PADEL_IMAGES)[number] };
type LogoIcon  = { kind: 'logo' };
type IconDef   = ImageIcon | LogoIcon;

const ICONS: IconDef[] = [
  ...PADEL_IMAGES.map((src) => ({ kind: 'image' as const, src })),
  { kind: 'logo' },
];

// ─── Acceleration curve ───────────────────────────────────────────────────────
//
// HOLD_MS[i]  — how long icon i is shown before sliding away
// SLIDE_MS[i] — duration of that slide (gets faster each step)
//
// 4 padel icons → P³ spring land

const HOLD_MS  = [900, 520, 260, 110];   // slow → fast across 4 icons
const SLIDE_MS = [280, 190, 120,  65];   // slide duration accelerates too

// After landing on P³:
const TAGLINE_DELAY_MS = 220;
const TAGLINE_MS       = 380;
const LINGER_MS        = 900;
const FADE_MS          = 460;

// ─── Card dimensions ──────────────────────────────────────────────────────────

const CARD_SIZE   = 140;
const CARD_RADIUS = Math.round(CARD_SIZE * 0.26);   // ~36 px

// ─── P³ logo ──────────────────────────────────────────────────────────────────

function PadLogo() {
  const pSize   = Math.round(CARD_SIZE * 0.60);
  const supSize = Math.round(pSize * 0.46);
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

// ─── Single reel slot ─────────────────────────────────────────────────────────

function ReelSlot({ icon }: { icon: IconDef }) {
  if (icon.kind === 'logo') {
    return (
      <View style={styles.reelSlot}>
        <PadLogo />
      </View>
    );
  }
  return (
    <View style={styles.reelSlot}>
      <Image
        source={icon.src}
        style={styles.slotImage}
        resizeMode="cover"
        fadeDuration={0}
      />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SplashAnimationProps {
  onComplete: () => void;
}

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const insets = useSafeAreaInsets();

  // Reel state: current = visible slot, next = slot entering from below
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx,    setNextIdx]    = useState(1);

  const slideY         = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  /**
   * Slide reel upward to bring toIndex into view.
   * Uses SLIDE_MS[fromIndex] for timing; final icon uses a spring.
   */
  const slideTo = useCallback(
    (fromIndex: number, toIndex: number): Promise<void> =>
      new Promise((resolve) => {
        setNextIdx(toIndex);
        requestAnimationFrame(() => {
          const isFinal = toIndex === ICONS.length - 1;

          if (isFinal) {
            // Spring stop — slight overshoot then settle
            Animated.spring(slideY, {
              toValue: -CARD_SIZE,
              tension: 70,
              friction: 8,
              useNativeDriver: true,
            }).start(() => {
              setCurrentIdx(toIndex);
              slideY.setValue(0);
              resolve();
            });
          } else {
            Animated.timing(slideY, {
              toValue: -CARD_SIZE,
              duration: SLIDE_MS[fromIndex] ?? 60,
              easing: Easing.out(Easing.quad),
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
      // Cycle through icons 1 → last (P³) with acceleration
      for (let i = 1; i < ICONS.length; i++) {
        if (cancelled) return;
        await delay(HOLD_MS[i - 1] ?? 65);        // hold on icon i-1
        if (cancelled) return;
        await slideTo(i - 1, i);                  // slide to icon i
      }

      // Landed on P³ — brief pause, then tagline
      if (cancelled) return;
      await delay(TAGLINE_DELAY_MS);

      await new Promise<void>((r) =>
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: TAGLINE_MS,
          useNativeDriver: true,
        }).start(() => r()),
      );

      await delay(LINGER_MS);
      if (cancelled) return;

      // Fade out overlay
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
      {/* ── Card ── */}
      <View style={styles.cardShadow}>
        <View style={styles.card}>
          {/* Window clips the reel to exactly one slot height */}
          <View style={styles.window}>
            <Animated.View
              style={[styles.reel, { transform: [{ translateY: slideY }] }]}
            >
              {/* Current slot (in view) */}
              <ReelSlot icon={ICONS[currentIdx]} />
              {/* Next slot (entering from below) */}
              <ReelSlot icon={ICONS[nextIdx]} />
            </Animated.View>
          </View>
        </View>
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

  // Shadow wrapper (shadow can't coexist with overflow:hidden)
  cardShadow: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 16,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',            // clips the reel
    backgroundColor: '#0b1825',   // matches image dark bg — no flash between frames
  },

  // Clipping window — exactly one slot tall
  window: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    overflow: 'hidden',
  },

  // Animated strip: two slots stacked (total = CARD_SIZE × 2)
  reel: {
    width: CARD_SIZE,
  },

  // One icon slot
  reelSlot: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // Icons fill the rounded square edge-to-edge — display 1:1, no cropping needed.
  slotImage: {
    width: CARD_SIZE,
    height: CARD_SIZE,
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
