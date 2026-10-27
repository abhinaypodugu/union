import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { useReducedMotion } from '../lib/useReducedMotion';
import { colors, palette, radius } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

// ── Full-screen branded loader (warm start / authReady wait — keeps org-setup flash away)
export function LoadingState({
  title = 'BPEF',
  subtitle = 'Checking your membership…',
}: { title?: string; subtitle?: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0);
      shimmer.setValue(0);
      return;
    }
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const shimmerAnim = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })
    );
    pulseAnim.start();
    shimmerAnim.start();
    return () => { pulseAnim.stop(); shimmerAnim.stop(); };
  }, [pulse, shimmer, reduceMotion]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18, backgroundColor: colors.bgApp }}
    >
      <Animated.View
        style={{
          width: 72, height: 72, borderRadius: 18,
          backgroundColor: palette.paper100,
          borderWidth: 1, borderColor: palette.paper300,
          alignItems: 'center', justifyContent: 'center',
          transform: [{ scale }], opacity,
        }}
      >
        <Image source={require('../../assets/bpef-logo.png')} style={{ width: 48, height: 48 }} resizeMode="contain" />
      </Animated.View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Txt variant="titleM">{title}</Txt>
        <Txt variant="bodyS" color={colors.textSecondary} align="center">{subtitle}</Txt>
      </View>
      <View style={{ width: 88, height: 3, borderRadius: 999, backgroundColor: palette.paper300, overflow: 'hidden' }}>
        <Animated.View
          style={{
            height: '100%', width: '42%', backgroundColor: colors.accent, borderRadius: 999,
            transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-40, 88] }) }],
          }}
        />
      </View>
    </View>
  );
}

// ── Lightweight skeleton shimmer: animated block used inside page skeletons & cards
function SkeletonBlock({ width, height, radius: r, style }: { width?: number | string; height: number; radius?: number; style?: object }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return;
    const a = Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    a.start(); return () => a.stop();
  }, [shimmer, reduceMotion]);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: width as any, height, borderRadius: r ?? 8, backgroundColor: palette.paper100, overflow: 'hidden' }, style]}>
      <Animated.View style={{ width: '44%', height: '100%', backgroundColor: palette.paper200, transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-80, 260] }) }] }} />
    </View>
  );
}

export function PostCardSkeleton() {
  return (
    <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.l, borderWidth: 1, borderColor: colors.borderSubtle, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SkeletonBlock width={36} height={36} radius={18} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBlock width="46%" height={11} radius={6} />
          <SkeletonBlock width="28%" height={9} radius={6} />
        </View>
        <SkeletonBlock width={48} height={22} radius={999} />
      </View>
      <SkeletonBlock width="78%" height={14} radius={6} />
      <SkeletonBlock width="94%" height={12} radius={6} />
      <SkeletonBlock width="68%" height={10} radius={6} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
        <SkeletonBlock width={64} height={26} radius={999} />
        <SkeletonBlock width={64} height={26} radius={999} />
      </View>
    </View>
  );
}

export function FeedSkeleton() {
  return (
    <View style={{ gap: 12, paddingHorizontal: 12 }}>
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </View>
  );
}
