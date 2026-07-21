/**
 * SplashAnimation — vertical slot-machine reel, slow → fast → P³ spring land.
 *
 * Four transparent padel silhouette PNGs cycle on the blue overlay, then the
 * official P³ logo image (card + tagline) springs in as the final frame.
 * No programmatic glyphs or separate tagline — spacing is baked into the asset.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Assets ───────────────────────────────────────────────────────────────────

const PADEL_IMAGES = [
  require('../assets/splash/icon1.png'),
  require('../assets/splash/icon2.png'),
  require('../assets/splash/icon3.png'),
  require('../assets/splash/icon4.png'),
] as const;

// Official P³ logo with "People · Padel · Places" tagline — transparent PNG
const LOGO_IMAGE = require('../assets/splash/logo_final.png');

// ─── Sequence builder ─────────────────────────────────────────────────────────

type AnyImage = (typeof PADEL_IMAGES)[number] | typeof LOGO_IMAGE;

/** Fisher-Yates shuffle — returns a new array */
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Shuffled padel icons → P³ logo last */
function buildSequence(): AnyImage[] {
  return [...shuffle(PADEL_IMAGES), LOGO_IMAGE];
}

// ─── Timing ───────────────────────────────────────────────────────────────────

const HOLD_MS  = [900, 520, 260, 110];  // per icon, slow → fast
const SLIDE_MS = [280, 190, 120,  65];  // per slide, accelerating

const LINGER_MS = 1100;   // how long the P³ logo holds before fade
const FADE_MS   =  460;   // overlay fade-out duration

// ─── Slot dimensions ──────────────────────────────────────────────────────────

const SLOT_SIZE = 200;

// The logo image (1736×1432) displayed with contain inside SLOT_SIZE fills
// ~200×165 — fully visible within the 200px clip window.
const LOGO_W = SLOT_SIZE;
const LOGO_H = Math.round(SLOT_SIZE * (1432 / 1736));  // ≈ 165

// ─── Reel slot ────────────────────────────────────────────────────────────────

function ReelSlot({ src, isLogo }: { src: AnyImage; isLogo: boolean }) {
  return (
    <View style={styles.reelSlot}>
      <Image
        source={src}
        style={isLogo ? styles.logoImage : styles.slotImage}
        resizeMode="contain"
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

  const sequence = useRef<AnyImage[]>(buildSequence()).current;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx,    setNextIdx]    = useState(1);

  const slideY         = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const slideTo = useCallback(
    (fromIndex: number, toIndex: number): Promise<void> =>
      new Promise((resolve) => {
        setNextIdx(toIndex);
        requestAnimationFrame(() => {
          const isFinal = toIndex === sequence.length - 1;
          if (isFinal) {
            Animated.spring(slideY, {
              toValue: -SLOT_SIZE,
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
              toValue: -SLOT_SIZE,
              duration: SLIDE_MS[fromIndex] ?? 65,
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
    [slideY, sequence.length],
  );

  useEffect(() => {
    if (Platform.OS === 'web') { onComplete(); return; }

    let cancelled = false;
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    async function run() {
      for (let i = 1; i < sequence.length; i++) {
        if (cancelled) return;
        await delay(HOLD_MS[i - 1] ?? 65);
        if (cancelled) return;
        await slideTo(i - 1, i);
      }

      // Logo has landed — linger then fade out
      await delay(LINGER_MS);
      if (cancelled) return;

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
  }, [slideTo, overlayOpacity, onComplete, sequence.length]);

  const finalIdx = sequence.length - 1;

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity, paddingBottom: insets.bottom }]}
      pointerEvents="none"
    >
      <View style={styles.window}>
        <Animated.View
          style={[styles.reel, { transform: [{ translateY: slideY }] }]}
        >
          <ReelSlot src={sequence[currentIdx]!} isLogo={currentIdx === finalIdx} />
          <ReelSlot src={sequence[nextIdx]!}    isLogo={nextIdx    === finalIdx} />
        </Animated.View>
      </View>
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
    zIndex: 999,
  },

  // Clip window — one slot tall
  window: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    overflow: 'hidden',
  },

  // Animated strip — two slots stacked vertically
  reel: {
    width: SLOT_SIZE,
  },

  reelSlot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Padel silhouettes — fill the slot
  slotImage: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },

  // P³ logo image — landscape asset, sized to show both card and tagline
  logoImage: {
    width: LOGO_W,
    height: LOGO_H,
  },
});
