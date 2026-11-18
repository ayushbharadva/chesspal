import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { type PieceType } from '@/chess';
import { MiniBoard } from '@/components/board/mini-board';
import { Piece } from '@/components/board/piece';
import { BrandMark, KNIGHT_BODY } from '@/components/brand-mark';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A white knight forking a black king and rook: the idea the app teaches, as a picture. */
const WELCOME_POSITION = '2r3k1/4N1pp/8/8/8/8/5PPP/6K1 b - - 0 1';

/** The welcome picture: a small board with the brass knight mark resting on its corner. */
export function WelcomeScene() {
  const theme = useTheme();
  return (
    <View
      style={styles.scene}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.halo, { backgroundColor: theme.accentSurface }]} />
      <View style={styles.sceneBoard}>
        <MiniBoard fen={WELCOME_POSITION} size={176} />
      </View>
      <View style={styles.sceneMark}>
        <BrandMark size={64} />
      </View>
    </View>
  );
}

/** The brass knight inside a dotted ring: the app's sign for "nothing here yet". */
function KnightMedallion({ size = 72 }: { size?: number }) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={46} fill={theme.accentSurface} />
      <Circle
        cx={50}
        cy={50}
        r={46}
        fill="none"
        stroke={theme.accentFill}
        strokeWidth={2}
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      <Path d={KNIGHT_BODY} fill={theme.accent} transform="translate(24 22) scale(0.07)" />
    </Svg>
  );
}

/** A friendly empty state: the knight medallion, one line saying what is missing and what to do. */
export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.empty}>
      <KnightMedallion />
      <View style={styles.emptyText}>
        <ThemedText type="subtitle" style={styles.centered}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          {detail}
        </ThemedText>
      </View>
    </View>
  );
}

/** A piece on a brass disc, marking a section of the Learn path. */
export function SectionMedallion({ piece }: { piece: PieceType }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.medallion,
        { backgroundColor: theme.accentSurface, borderColor: theme.accentFill },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Piece piece={{ color: 'w', type: piece }} />
    </View>
  );
}

/** A circular gauge for a share between 0 and 1, with its label read as text by tests and TalkBack. */
export function ProgressRing({ value, size = 96 }: { value: number; size?: number }) {
  const theme = useTheme();
  const share = Math.max(0, Math.min(1, value));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={radius} fill="none" stroke={theme.surfaceMuted} strokeWidth={10} />
      <Circle
        cx={50}
        cy={50}
        r={radius}
        fill="none"
        stroke={theme.accentFill}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${circumference * share} ${circumference}`}
        transform="rotate(-90 50 50)"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  scene: { height: 220, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
  sceneBoard: { transform: [{ rotate: '-4deg' }] },
  sceneMark: { position: 'absolute', right: '22%', bottom: 6 },
  empty: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  emptyText: { gap: Spacing.half, alignItems: 'center' },
  centered: { textAlign: 'center' },
  medallion: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
});
