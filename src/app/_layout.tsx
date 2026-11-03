import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useColorSchemeName } from '@/hooks/use-theme';
import { useProgressStore } from '@/progress/store';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const schemeName = useColorSchemeName();
  const colors = Colors[schemeName];
  const storageIssue = useProgressStore((state) => state.storageIssue);
  // If fonts fail to load, the app still renders with system fonts.
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const ready = fontsLoaded || Boolean(fontError);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  const baseTheme = schemeName === 'dark' ? DarkTheme : DefaultTheme;
  // Navigation headers use the same palette as the screens.
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.text,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={schemeName === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: Fonts.semibold, fontSize: 17 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="workout" options={{ title: 'Puzzles' }} />
        <Stack.Screen name="result" options={{ title: 'Results' }} />
        <Stack.Screen name="lesson/[id]" options={{ title: '' }} />
        <Stack.Screen name="course/[id]" options={{ title: '' }} />
        <Stack.Screen name="level" options={{ title: 'Level' }} />
        <Stack.Screen name="skill/[id]" options={{ title: '' }} />
        <Stack.Screen name="vision" options={{ title: 'Square trainer' }} />
        <Stack.Screen name="daily-route" options={{ title: 'Daily challenge' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
      {storageIssue && (
        <View style={[styles.banner, { backgroundColor: colors.dangerSurface }]}>
          <Icon name="alert" size={18} color="danger" />
          <ThemedText type="small" themeColor="danger" style={styles.bannerText}>
            Your progress couldn&apos;t be loaded or saved. You can keep playing.
          </ThemedText>
        </View>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  bannerText: { flex: 1 },
});
