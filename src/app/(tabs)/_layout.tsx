import { NativeTabs } from 'expo-router/unstable-native-tabs';

/** Three tabs: the programme you're running, your crew, and everything
 * about you.
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
      <NativeTabs.Trigger name="crew">
        <NativeTabs.Trigger.Label>Crew</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.3" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
