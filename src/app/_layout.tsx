import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';
import { useColorSchemeName } from '@/hooks/use-theme';

export default function RootLayout() {
  const schemeName = useColorSchemeName();
  const colors = Colors[schemeName];
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
        <Stack.Screen name="workout" options={{ title: 'Today’s Workout' }} />
        <Stack.Screen name="result" options={{ title: 'Results' }} />
        <Stack.Screen name="progress" options={{ title: 'Your Progress' }} />
      </Stack>
    </ThemeProvider>
  );
}
