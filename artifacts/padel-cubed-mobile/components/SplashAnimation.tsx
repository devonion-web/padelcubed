/**
 * SplashAnimation — vertical slot-machine reel, slow → fast → P³ spring land.
 *
 * Four transparent padel silhouette PNGs cycle on the blue overlay, then the
 * P³ mark (white P + teal 3) springs in as the final frame, followed by a
 * "People · Padel · Places" tagline fade-in.
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Padel silhouette assets ──────────────────────────────────────────────────

const PADEL_IMAGES = [
  require('../assets/splash/icon1.png'),
  require('../assets/splash/icon2.png'),
  require('../assets/splash/icon3.png'),
  require('../assets/splash/icon4.png'),
] as const;

// ─── Icon sequence ────────────────────────────────────────────────────────────

type ImageIcon = { kind: 'image'; src: (typeof PADEL_IMAGES)[number] };
type LogoIcon  = { kind: 'logo' };
type IconDef   = ImageIcon | LogoIcon;

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function buildIconSequence(): IconDef[] {
  return [...shuffle(PADEL_IMAGES).map((src) => ({ kind: 'image' as const, src })), { kind: 'logo' }];
}

// ─── Timing ───────────────────────────────────────────────────────────────────

const HOLD_MS         = [900, 520, 260, 110];
const SLIDE_MS        = [280, 190, 120,  65];
const TAGLINE_DELAY   = 240;
const TAGLINE_MS      = 400;
const LINGER_MS       = 1000;
const FADE_MS         =  460;

// ─── Slot window size ─────────────────────────────────────────────────────────

const SLOT_SIZE = 200;

// ─── P³ logo (white P + teal 3, renders natively on the blue overlay) ─────────

function PadLogo() {
  const pSize   = Math.round(SLOT_SIZE * 0.68);
  const supSize = Math.round(pSize * 0.44);
  return (
    <View style={styles.glyphRow}>
      <Text
        style={[styles.glyphP, { fontSize: pSize, lineHeight: pSize * 1.05 }]}
        allowFontScaling={false}
      >
        P
      </Text>
      <Text
        style={[styles.glyphSup, { fontSize: supSize, lineHeight: supSize * 1.1 }]}
        allowFontScaling={false}
      >
        3
      </Text>
    </View>
  );
}

// ─── Single reel slot ─────────────────────────────────────────────────────────

function ReelSlot({ icon }: { icon: IconDef }) {
  return (
    <View style={[styles.reelSlot, icon.kind === 'logo' && styles.reelSlotLogo]}>
      {icon.kind === 'logo' ? (
        <PadLogo />
      ) : (
        <Image source={icon.src} style={styles.slotImage} resizeMode="contain" fadeDuration={0} />
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SplashAnimationProps {
  onComplete: () => void;
}

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const insets = useSafeAreaInsets();
  const icons  = useRef<IconDef[]>(buildIconSequence()).current;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx,    setNextIdx]    = useState(1);

  const slideY         = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  const slideTo = useCallback(
    (fromIndex: number, toIndex: number): Promise<void> =>
      new Promise((resolve) => {
        setNextIdx(toIndex);
        requestAnimationFrame(() => {
          const isFinal = toIndex === icons.length - 1;
          if (isFinal) {
            Animated.spring(slideY, {
              toValue: -SLOT_SIZE,
              tension: 70,
              friction: 8,
              useNativeDriver: true,
            }).start(() => { setCurrentIdx(toIndex); slideY.setValue(0); resolve(); });
          } else {
            Animated.timing(slideY, {
              toValue: -SLOT_SIZE,
              duration: SLIDE_MS[fromIndex] ?? 65,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(() => { setCurrentIdx(toIndex); slideY.setValue(0); resolve(); });
          }
        });
      }),
    [slideY, icons.length],
  );

  useEffect(() => {
    if (Platform.OS === 'web') { onComplete(); return; }

    let cancelled = false;
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    async function run() {
      for (let i = 1; i < icons.length; i++) {
        if (cancelled) return;
        await delay(HOLD_MS[i - 1] ?? 65);
        if (cancelled) return;
        await slideTo(i - 1, i);
      }

      // Logo has landed — fade in tagline
      if (cancelled) return;
      await delay(TAGLINE_DELAY);
      await new Promise<void>((r) =>
        Animated.timing(taglineOpacity, { toValue: 1, duration: TAGLINE_MS, useNativeDriver: true }).start(() => r()),
      );

      await delay(LINGER_MS);
      if (cancelled) return;

      await new Promise<void>((r) =>
        Animated.timing(overlayOpacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => r()),
      );

      if (!cancelled) onComplete();
    }

    run();
    return () => { cancelled = true; };
  }, [slideTo, taglineOpacity, overlayOpacity, onComplete]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity, paddingBottom: insets.bottom }]}
      pointerEvents="none"
    >
      <View style={styles.group}>
        {/* Slot window — one icon tall, clips the reel */}
        <View style={styles.window}>
          <Animated.View style={[styles.reel, { transform: [{ translateY: slideY }] }]}>
            <ReelSlot icon={icons[currentIdx]!} />
            <ReelSlot icon={icons[nextIdx]!} />
          </Animated.View>
        </View>

        {/* Tagline fades in after P³ springs into place */}
        <Animated.View style={[styles.taglineWrap, { opacity: taglineOpacity }]}>
          <Text style={styles.tagline}>
            <Text style={styles.taglineWord}>People</Text>
            <Text style={styles.taglineDot}> · </Text>
            <Text style={styles.taglineWord}>Padel</Text>
            <Text style={styles.taglineDot}> · </Text>
            <Text style={styles.taglineWord}>Places</Text>
          </Text>
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

  group: {
    alignItems: 'center',
    gap: 8,
  },

  window: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    overflow: 'hidden',
  },

  reel: { width: SLOT_SIZE },

  reelSlot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo frame sits at the bottom of the slot so the glyph sits tight above the tagline
  reelSlotLogo: {
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },

  slotImage: { width: SLOT_SIZE, height: SLOT_SIZE },

  // White P + teal 3 — directly on the royal-blue overlay
  glyphRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 4,
  },
  glyphP: {
    color: '#FFFFFF',
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
  tagline: { fontFamily: 'Inter_600SemiBold', fontSize: 16, letterSpacing: 0.5 },
  taglineWord: { color: '#FFFFFF' },
  taglineDot:  { color: 'rgba(255,255,255,0.5)' },
});
