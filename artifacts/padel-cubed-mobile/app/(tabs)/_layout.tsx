import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAdmin } from '@/context/AdminContext';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function NativeTabLayout() {
  // NativeTabs doesn't support conditional children — admin-tab always present;
  // the screen itself shows a login form if the session has lapsed.
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'calendar', selected: 'calendar.fill' }} />
        <Label>Events</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="register">
        <Icon sf={{ default: 'person.badge.plus', selected: 'person.badge.plus.fill' }} />
        <Label>Join</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
      {/* Admin tab intentionally omitted — accessed via long-press on logo */}
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { isAdmin } = useAdmin();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={24} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="register"
        options={{
          title: 'Join',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.badge.plus" tintColor={color} size={24} />
            ) : (
              <Feather name="user-plus" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.crop.circle" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="admin-tab"
        options={{
          title: 'Admin',
          // tabBarButton:null hides from bar but keeps route navigable (href:null blocks navigation)
          tabBarButton: isAdmin ? undefined : () => null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shield" tintColor={color} size={24} />
            ) : (
              <Feather name="shield" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
