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
import { UndoSnackbar } from './src/components/UndoSnackbar';
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

  // Home always sits dead center; the slot beside it is Split when there is
  // someone to split with, and the Add shortcut otherwise.
  const tabs: { key: Tab; label: string }[] = [
    { key: 'stats', label: 'Stats' },
    { key: 'history', label: 'History' },
    { key: 'home', label: 'Home' },
    showSplit ? { key: 'split', label: 'Split' } : { key: 'add', label: 'Add' },
    { key: 'settings', label: 'Settings' },
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

      {activeTab === 'home' ? (
        <Pressable
          style={[styles.addButton, { bottom: Math.max(insets.bottom, spacing.s) + scale(56) }]}
          onPress={() => setTab('add')}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      ) : null}

      <UndoSnackbar />

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.s) }]}>
        {tabs.map((t) => {
          const active = activeTab === t.key;
          return (
            <Pressable key={t.key} style={styles.tabItem} onPress={() => setTab(t.key)}>
              <View
                style={[
                  styles.tabMarker,
                  { backgroundColor: active ? colors.primary : 'transparent' },
                ]}
              />
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
    tabMarker: {
      width: scale(16),
      height: scale(3),
      borderRadius: scale(2),
      marginBottom: scale(5),
    },
    tabLabel: {
      fontSize: font.small,
    },
    addButton: {
      position: 'absolute',
      right: spacing.l,
      width: scale(52),
      height: scale(52),
      borderRadius: scale(26),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.25,
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
