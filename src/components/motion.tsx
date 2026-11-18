import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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

/** Counts a number up from zero, such as a round's score on Results. */
export function CountUp({
  value,
  children,
}: {
  value: number;
  children: (shown: number) => ReactNode;
}) {
  const motion = useMotionEnabled();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!motion) return;
    const progress = new Animated.Value(0);
    const listener = progress.addListener(({ value: share }) =>
      setShown(Math.round(share * value)),
    );
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      progress.removeListener(listener);
    };
  }, [motion, value]);
  return children(motion ? shown : value);
}

/** Grows briefly whenever `value` rises after the first render, such as the streak flame. */
export function BumpOnRise({ value, children }: { value: number; children: ReactNode }) {
  const motion = useMotionEnabled();
  const [scale] = useState(() => new Animated.Value(1));
  const previous = useRef(value);
  useEffect(() => {
    const rose = value > previous.current;
    previous.current = value;
    if (!rose || !motion) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.25, duration: 160, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  }, [value, scale, motion]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

/** A slow, gentle breathing ring around its content, for the one thing to tap next. */
export function Pulse({ children, color }: { children: ReactNode; color: string }) {
  const motion = useMotionEnabled();
  const [ring] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!motion) return;
    const loop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [motion, ring]);
  return (
    <Animated.View>
      {motion && (
        <Animated.View
          pointerEvents="none"
          style={[
            pulseStyles.ring,
            {
              borderColor: color,
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
              transform: [
                { scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) },
              ],
            },
          ]}
        />
      )}
      {children}
    </Animated.View>
  );
}

const pulseStyles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    borderWidth: 2,
  },
});
