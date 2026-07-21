import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="event-form/[id]" />
      <Stack.Screen name="scan/[id]" />
      <Stack.Screen name="walkin/[id]" />
      <Stack.Screen name="americano/[id]" />
      <Stack.Screen name="leaderboard/[id]" />
      <Stack.Screen name="format-setup/[id]" />
    </Stack>
  );
}
