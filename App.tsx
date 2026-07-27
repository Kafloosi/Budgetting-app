import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { WhatsNew } from './src/components/WhatsNew';
import { useThemedStyles } from './src/components/ui';
import { notesSince } from './src/changelog';
import { font, onColor, radius, rules, scale, spacing, ThemeColors } from './src/theme';
import { APP_VERSION } from './src/version';

type Tab = 'home' | 'stats' | 'add' | 'split' | 'history' | 'settings';

function Root() {
  const { state, loaded, markVersionSeen } = useApp();
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

  // Turning the lock on from Settings must not lock the user out on the spot
  // — they just authenticated to enable it. A lock that was already on at
  // launch still locks, so the first run after load only records a baseline.
  const lockBaselineRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (lockBaselineRef.current === null) {
      lockBaselineRef.current = appLock;
      return;
    }
    if (appLock && !lockBaselineRef.current) setUnlocked(true);
    lockBaselineRef.current = appLock;
  }, [loaded, appLock]);

  // Home-screen quick action: long-press the app icon -> "Add entry"
  useEffect(() => {
    registerQuickActions();
    if (launchedFromAddEntry()) setTab('add');
    return onAddEntryQuickAction(() => setTab('add'));
  }, []);

  // The split feature only exists when there is more than one person
  const showSplit = state.people.length > 1;
  const activeTab = tab === 'split' && !showSplit ? 'home' : tab;

  // Release notes wait until the user is actually in the app — behind the
  // lock screen and past onboarding — so the first thing they see is never
  // a changelog for a version they have not used yet.
  const lastSeenVersion = state.settings.lastSeenVersion;
  const releaseNotes = useMemo(
    () => (lastSeenVersion === APP_VERSION ? [] : notesSince(lastSeenVersion)),
    [lastSeenVersion],
  );

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

      {releaseNotes.length > 0 ? (
        <WhatsNew notes={releaseNotes} onDismiss={markVersionSeen} />
      ) : null}

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
    // The tab bar is a plane, so a structural rule closes it — not a hairline.
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderTopWidth: rules.structure,
      borderTopColor: colors.rule,
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
      borderRadius: radius.s,
      marginBottom: scale(5),
    },
    tabLabel: {
      fontSize: font.small,
    },
    // A square ink plane butted against the screen edge. This world has no
    // depth, so the add action sits flush rather than floating on a shadow.
    addButton: {
      position: 'absolute',
      right: 0,
      width: scale(56),
      height: scale(56),
      borderRadius: radius.s,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: rules.structure,
      borderTopWidth: rules.structure,
      borderColor: colors.rule,
    },
    addButtonText: {
      color: onColor(colors.primary),
      fontSize: font.xlarge,
      lineHeight: font.xlarge + scale(4),
      fontWeight: '600',
    },
  });
