import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { PopIn } from '@/components/motion';
import { useTheme } from '@/hooks/use-theme';

const RAYS = 8;

/** Short brass rays around the square of a solving move; it pops in once. */
export function SuccessBurst() {
  const theme = useTheme();
  return (
    <View pointerEvents="none" style={styles.cover}>
      <PopIn delay={80}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={40} stroke={theme.heroAccent} strokeWidth={4} fill="none" />
          {Array.from({ length: RAYS }, (_, index) => {
            const angle = (index / RAYS) * 2 * Math.PI;
            return (
              <Line
                key={index}
                x1={50 + Math.cos(angle) * 44}
                y1={50 + Math.sin(angle) * 44}
                x2={50 + Math.cos(angle) * 49}
                y2={50 + Math.sin(angle) * 49}
                stroke={theme.heroAccent}
                strokeWidth={5}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </PopIn>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
