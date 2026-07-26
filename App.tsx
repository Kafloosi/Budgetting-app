import React, { useEffect, useState } from 'react';
import { AppState as RNAppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  launchedFromAddEntry,
  onAddEntryQuickAction,
  registerQuickActions,
} from './src/utils/quickActions';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppProvider, useApp, useTheme } from './src/context/AppContext';
import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import AddScreen from './src/screens/AddScreen';
import SplitScreen from './src/screens/SplitScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { LockScreen } from './src/components/LockScreen';
import { useThemedStyles } from './src/components/ui';
import { font, scale, spacing, ThemeColors } from './src/theme';

type Tab = 'home' | 'stats' | 'add' | 'split' | 'history' | 'settings';

function Root() {
  const { state, loaded } = useApp();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<Tab>('home');
  const [unlocked, setUnlocked] = useState(false);
  const insets = useSafeAreaInsets();

  // Re-lock whenever the app goes to the background
  const appLock = state.settings.appLock;
  useEffect(() => {
    if (!appLock) return;
    const sub = RNAppState.addEventListener('change', (status) => {
      if (status === 'background') setUnlocked(false);
    });
    return () => sub.remove();
  }, [appLock]);

  // Home-screen quick action: long-press the app icon -> "Add entry"
  useEffect(() => {
    registerQuickActions();
    if (launchedFromAddEntry()) setTab('add');
    return onAddEntryQuickAction(() => setTab('add'));
  }, []);

  // The split feature only exists when there is more than one person
  const showSplit = state.people.length > 1;
  const activeTab = tab === 'split' && !showSplit ? 'home' : tab;

  if (!loaded) {
    return <View style={styles.app} />;
  }

  const statusBar = <StatusBar style={isDark ? 'light' : 'dark'} />;

  if (appLock && !unlocked) {
    return (
      <View style={[styles.app, { paddingTop: insets.top }]}>
        {statusBar}
        <LockScreen onUnlock={() => setUnlocked(true)} />
      </View>
    );
  }

  // First launch: set up people and their incomes before anything else
  if (!state.settings.onboarded) {
    return (
      <View style={[styles.app, { paddingTop: insets.top }]}>
        {statusBar}
        <OnboardingScreen />
      </View>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'home', label: 'Home', icon: '⌂' },
    { key: 'stats', label: 'Stats', icon: '📊' },
    { key: 'add', label: 'Add', icon: '+' },
    ...(showSplit ? [{ key: 'split' as Tab, label: 'Split', icon: '⇄' }] : []),
    { key: 'history', label: 'History', icon: '🕘' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <View style={styles.app}>
      {statusBar}
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'stats' && <StatsScreen />}
        {activeTab === 'split' && showSplit && <SplitScreen />}
        {activeTab === 'add' && <AddScreen onSaved={() => setTab('home')} />}
        {activeTab === 'history' && <HistoryScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </View>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.s) }]}>
        {tabs.map((t) => {
          const active = activeTab === t.key;
          if (t.key === 'add') {
            return (
              <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab('add')}>
                <View style={styles.addButton}>
                  <Text style={styles.addButtonText}>+</Text>
                </View>
              </Pressable>
            );
          }
          return (
            <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
              <Text
                style={[
                  styles.tabIcon,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {t.icon}
              </Text>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: active ? colors.primary : colors.textSecondary,
                    fontWeight: active ? '700' : '500',
                  },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    app: {
      flex: 1,
      backgroundColor: colors.background,
    },
    screen: {
      flex: 1,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.s,
      paddingHorizontal: spacing.s,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabIcon: {
      fontSize: font.large,
      lineHeight: font.large + scale(4),
    },
    tabLabel: {
      fontSize: font.small,
      marginTop: 1,
    },
    addButton: {
      width: scale(48),
      height: scale(48),
      borderRadius: scale(24),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -scale(18),
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    addButtonText: {
      color: colors.white,
      fontSize: font.xlarge,
      lineHeight: font.xlarge + scale(4),
      fontWeight: '600',
    },
  });
