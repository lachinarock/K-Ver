import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { BrandHeader } from '@/components/Logo';
import { theme } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: theme.line,
        },
        tabBarActiveTintColor: theme.gold,
        tabBarInactiveTintColor: theme.muted,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Para ver',
          header: () => <BrandHeader />,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'film', android: 'movie', web: 'movie' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vistas"
        options={{
          title: 'Vistas',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'star.fill', android: 'star', web: 'star' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
