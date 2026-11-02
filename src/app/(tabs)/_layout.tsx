import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/progress/store';

const TABS: readonly { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'house' },
  { name: 'puzzles', title: 'Puzzles', icon: 'puzzle' },
  { name: 'learn', title: 'Openings', icon: 'book-open' },
  { name: 'progress', title: 'Progress', icon: 'chart' },
];
const TAB_BAR_HEIGHT = 60;

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // A player without a saved level has not been welcomed yet.
  const welcomed = useProgressStore((state) => !state.hydrated || state.level !== null);
  if (!welcomed) return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        // The default bar is too short for an icon over an Inter label.
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + insets.bottom,
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        tabBarItemStyle: { paddingTop: Spacing.one + Spacing.half },
        tabBarLabelStyle: { fontFamily: Fonts.semibold, fontSize: 11, lineHeight: 16 },
        sceneStyle: { backgroundColor: theme.background },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <Icon
                name={tab.icon}
                size={24}
                color={focused ? 'accent' : 'textSecondary'}
                strokeWidth={focused ? 2.4 : 2}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
