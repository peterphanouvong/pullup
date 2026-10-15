import { NativeTabs } from 'expo-router/unstable-native-tabs';

/** Two tabs: the programme you're running, and everything about you.
 * Plan and Activity live under Profile rather than competing with the
 * week for permanent bar space — they're places you visit, not places you
 * work. */
export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(programme)">
        <NativeTabs.Trigger.Label>Programme</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
