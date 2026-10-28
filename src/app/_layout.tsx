import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';
import { useColorSchemeName } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { useProgressStore } from '@/progress/store';

export default function RootLayout() {
  const schemeName = useColorSchemeName();
  const colors = Colors[schemeName];
  const storageIssue = useProgressStore((state) => state.storageIssue);
  const baseTheme = schemeName === 'dark' ? DarkTheme : DefaultTheme;
  // Navigation headers use the same palette as the screens.
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="workout" options={{ title: 'Practice' }} />
        <Stack.Screen name="result" options={{ title: 'Results' }} />
        <Stack.Screen name="progress" options={{ title: 'Your Progress' }} />
        <Stack.Screen name="learn" options={{ title: 'Learn' }} />
        <Stack.Screen name="lesson/[id]" options={{ title: 'Opening Guide' }} />
      </Stack>
      {storageIssue && (
        <ThemedText type="small" style={{ padding: 12 }}>
          Saved progress could not be restored or updated. You can still practice.
        </ThemedText>
      )}
    </ThemeProvider>
  );
}
