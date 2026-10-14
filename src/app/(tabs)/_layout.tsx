import { Tabs } from 'expo-router';
import { PillTabBar } from '@/components/ui/pill-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <PillTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="activities" options={{ title: 'Activities' }} />
    </Tabs>
  );
}
