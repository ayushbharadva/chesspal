import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

import { useMotionEnabled } from '@/hooks/use-motion';

/** Web has no native animation driver. */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** Fades its content in with a short rise, such as a new lesson step or a feedback note. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const motion = useMotionEnabled();
  const [progress] = useState(() => new Animated.Value(motion ? 0 : 1));
  useEffect(() => {
    if (!motion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [motion, progress, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/** Grows its content from small to full size with a light overshoot, such as an earned star. */
export function PopIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const motion = useMotionEnabled();
  const [scale] = useState(() => new Animated.Value(motion ? 0 : 1));
  useEffect(() => {
    if (!motion) {
      scale.setValue(1);
      return;
    }
    const animation = Animated.spring(scale, {
      toValue: 1,
      delay,
      friction: 5,
      tension: 140,
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [motion, scale, delay]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

/** A sideways nudge each time `shakeKey` rises, like the board after a wrong move. */
export function Shake({
  children,
  shakeKey,
  style,
}: {
  children: ReactNode;
  shakeKey: number;
  style?: StyleProp<ViewStyle>;
}) {
  const motion = useMotionEnabled();
  const [offset] = useState(() => new Animated.Value(0));
  const previous = useRef(shakeKey);
  useEffect(() => {
    const rose = shakeKey > previous.current;
    previous.current = shakeKey;
    if (!rose || !motion) return;
    const nudge = (toValue: number) =>
      Animated.timing(offset, { toValue, duration: 50, useNativeDriver: USE_NATIVE_DRIVER });
    Animated.sequence([nudge(-6), nudge(6), nudge(-3), nudge(3), nudge(0)]).start();
  }, [shakeKey, offset, motion]);
  return (
    <Animated.View style={[style, { transform: [{ translateX: offset }] }]}>
      {children}
    </Animated.View>
  );
}
