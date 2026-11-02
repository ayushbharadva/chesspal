import { createContext, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Lets the board stop the page from scrolling while a piece is being dragged. */
export const ScrollLockContext = createContext<(locked: boolean) => void>(() => undefined);

type ScreenProps = {
  children: ReactNode;
  /** Screens without a navigation header also need the top edge. */
  edges?: Edge[];
  /** Actions pinned below the scrolling content, so they stay within reach on small phones. */
  footer?: ReactNode;
};

export function Screen({ children, edges = ['bottom', 'left', 'right'], footer }: ScreenProps) {
  const theme = useTheme();
  const [scrollLocked, setScrollLocked] = useState(false);

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollLockContext.Provider value={setScrollLocked}>
        <ScrollView scrollEnabled={!scrollLocked} contentContainerStyle={styles.content}>
          {children}
        </ScrollView>
      </ScrollLockContext.Provider>
      {footer ? (
        <View style={[styles.footerBar, { borderTopColor: theme.border }]}>
          <View style={styles.footer}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    gap: Spacing.two,
  },
});
