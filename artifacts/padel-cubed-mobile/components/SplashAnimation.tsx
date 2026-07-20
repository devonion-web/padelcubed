/**
 * SplashAnimation
 * ---------------
 * Full-screen branded loading sequence. A dark-navy card in the centre of the
 * screen flips through padel-themed icons, then fades to reveal the app.
 *
 * Sequence (each icon held for HOLD_MS, flipped in/out over FLIP_MS×2):
 *   tennis racket → padel ball → trophy → community → P³ mark (final hold)
 * After the last icon: the tagline fades in, then the whole overlay fades out.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Icon sequence ────────────────────────────────────────────────────────────

type VectorIcon = { kind: 'icon'; name: string };
type LogoIcon   = { kind: 'logo' };
type IconDef    = VectorIcon | LogoIcon;

const ICONS: IconDef[] = [
  { kind: 'icon', name: 'tennis'                 },  // racket
  { kind: 'icon', name: 'tennis-ball'            },  // ball
  { kind: 'icon', name: 'trophy-variant-outline' },  // trophy
  { kind: 'icon', name: 'account-group-outline'  },  // community
  { kind: 'logo'                                  },  // P³ — final reveal
];

// ─── Timing (ms) ──────────────────────────────────────────────────────────────

const HOLD_MS    = 560;   // How long each icon is shown
const FLIP_MS    = 150;   // Half-flip (squish out or squish in)
const TAGLINE_MS = 420;   // Tagline fade-in after final icon
const LINGER_MS  = 700;   // Hold after tagline appears
const FADE_MS    = 480;   // Fade-out of entire overlay

// ─── Sub-components ───────────────────────────────────────────────────────────

const CARD_SIZE   = 136;
const ICON_SIZE   = 70;
const CARD_RADIUS = 28;

function PadLogo() {
  // Inline P³ mark — matches HeaderLogo.tsx mark exactly
  const pSize  = 58;
  const supSize = Math.round(pSize * 0.44);
  return (
    <View style={styles.logoMark}>
      <Text style={[styles.logoP, { fontSize: pSize }]}>P</Text>
      <Text style={[styles.logoSup, { fontSize: supSize, top: 10, right: 8 }]}>3</Text>
    </View>
  );
}

function IconSlot({ icon }: { icon: IconDef }) {
  if (icon.kind === 'logo') return <PadLogo />;
  return (
    <MaterialCommunityIcons
      name={icon.name as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
      size={ICON_SIZE}
      color="#F4F7FB"
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SplashAnimationProps {
  onComplete: () => void;
}

export function SplashAnimation({ onComplete }: SplashAnimationProps) {
  const insets = useSafeAreaInsets();

  const [iconIndex, setIconIndex] = useState(0);

  // Animations
  const cardScaleX    = useRef(new Animated.Value(1)).current;
  const cardScale     = useRef(new Animated.Value(0.82)).current; // entrance pop
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // Entrance pop when component mounts (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Animated.spring(cardScale, {
      toValue: 1,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [cardScale]);

  // Flip to next icon
  const flipTo = useCallback(
    (nextIndex: number, afterFlip?: () => void) => {
      Animated.timing(cardScaleX, {
        toValue: 0,
        duration: FLIP_MS,
        useNativeDriver: true,
      }).start(() => {
        setIconIndex(nextIndex);
        Animated.timing(cardScaleX, {
          toValue: 1,
          duration: FLIP_MS,
          useNativeDriver: true,
        }).start(afterFlip);
      });
    },
    [cardScaleX],
  );

  // Orchestrate the full sequence
  useEffect(() => {
    // Skip animation on web (app is already rendered, no meaningful load wait)
    if (Platform.OS === 'web') {
      onComplete();
      return;
    }

    let cancelled = false;
    const delay = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    async function run() {
      // Flip through icons 1..N-1
      for (let i = 1; i < ICONS.length; i++) {
        if (cancelled) return;
        await delay(HOLD_MS);
        await new Promise<void>((resolve) => flipTo(i, resolve));
      }

      // Final icon shown — fade in tagline
      if (cancelled) return;
      await delay(HOLD_MS * 0.6);

      await new Promise<void>((resolve) =>
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: TAGLINE_MS,
          useNativeDriver: true,
        }).start(() => resolve()),
      );

      await delay(LINGER_MS);

      // Fade out the whole overlay
      if (cancelled) return;
      await new Promise<void>((resolve) =>
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start(() => resolve()),
      );

      if (!cancelled) onComplete();
    }

    run();
    return () => { cancelled = true; };
  }, [flipTo, taglineOpacity, overlayOpacity, onComplete]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity }]}
      pointerEvents="none"
    >
      {/* ── Card ── */}
      <Animated.View
        style={[
          styles.cardWrap,
          { transform: [{ scale: cardScale }, { scaleX: cardScaleX }] },
        ]}
      >
        <LinearGradient
          colors={['#1a3050', '#0b1825']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <IconSlot icon={ICONS[iconIndex]} />
        </LinearGradient>
      </Animated.View>

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

      {/* Bottom safe-area spacer so content feels centred */}
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

  cardWrap: {
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // P³ logo inside card
  logoMark: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoP: {
    position: 'absolute',
    color: '#F4F7FB',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -2,
    left: 28,
    bottom: 24,
  },
  logoSup: {
    position: 'absolute',
    color: '#19C3B0',
    fontFamily: 'Inter_700Bold',
  },

  taglineWrap: {
    alignItems: 'center',
  },
  tagline: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  taglineAccent: {
    color: '#FFFFFF',
  },
  taglineDot: {
    color: 'rgba(255,255,255,0.45)',
  },
});
