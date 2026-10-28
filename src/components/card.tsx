import { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

export function Card({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <ThemedView type={accent ? 'accentSurface' : 'surface'} style={styles.card}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Radius.large, gap: Spacing.three },
});
