import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState as RNAppState, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './src/components/Text';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// Subpath imports, not the package root: the root index re-exports every
// weight and italic, and Metro follows all of them into the bundle — 22 files
// and 2.5 MB of typeface for the six faces this app actually sets.
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { CourierPrime_400Regular } from '@expo-google-fonts/courier-prime/400Regular';
import { CourierPrime_700Bold } from '@expo-google-fonts/courier-prime/700Bold';
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
import { useReducedMotion, useThemedStyles } from './src/components/ui';
import { notesSince } from './src/changelog';
import {
  font,
  indicium,
  lift,
  onColor,
  radius,
  scale,
  spacing,
  ThemeColors,
  type,
} from './src/theme';
import { APP_VERSION } from './src/version';

type Tab = 'home' | 'stats' | 'add' | 'split' | 'history' | 'settings';

/**
 * The sorting rack. Five slots with Home dead-centre — a standing product
 * commitment — and one franked marker that travels to whichever slot is
 * active rather than blinking on and off in place.
 */
function TabBar({
  tabs,
  activeTab,
  onSelect,
  bottomInset,
}: {
  tabs: { key: Tab; label: string }[];
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
  bottomInset: number;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduced = useReducedMotion();
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeTab));
  const driver = useRef(new Animated.Value(activeIndex)).current;
  const [slotWidth, setSlotWidth] = useState(0);

  useEffect(() => {
    if (reduced) {
      driver.setValue(activeIndex);
      return;
    }
    const run = Animated.timing(driver, {
      toValue: activeIndex,
      duration: 260,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [activeIndex, driver, reduced]);

  return (
    <View
      style={[styles.tabBar, lift(3, colors), { paddingBottom: Math.max(bottomInset, spacing.s) }]}
      onLayout={(e) => setSlotWidth(e.nativeEvent.layout.width / Math.max(1, tabs.length))}
    >
      {slotWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabMarker,
            {
              width: slotWidth,
              backgroundColor: colors.primary,
              transform: [
                {
                  translateX: driver.interpolate({
                    inputRange: tabs.map((_, i) => i),
                    outputRange: tabs.map((_, i) => i * slotWidth),
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
      {tabs.map((t) => {
        const active = activeTab === t.key;
        return (
          <Pressable
            key={t.key}
            style={styles.tabItem}
            onPress={() => onSelect(t.key)}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: active ? colors.text : colors.textSecondary },
                active ? styles.tabLabelActive : null,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Root() {
  const { state, loaded, markVersionSeen } = useApp();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<Tab>('home');
  const [unlocked, setUnlocked] = useState(false);
  // Bumped when an entry is committed, so Home can frank it on arrival. The
  // stamp lands where the letter is filed rather than on the form the user is
  // already leaving — and entry never waits on an animation to finish.
  const [franked, setFranked] = useState(0);
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
        {activeTab === 'home' && <HomeScreen franked={franked} />}
        {activeTab === 'stats' && <StatsScreen />}
        {activeTab === 'split' && showSplit && <SplitScreen />}
        {activeTab === 'add' && (
          <AddScreen
            onSaved={() => {
              setFranked((n) => n + 1);
              setTab('home');
            }}
          />
        )}
        {activeTab === 'history' && <HistoryScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </View>

      {activeTab === 'home' ? (
        <Pressable
          style={[
            styles.addButton,
            lift(3, colors),
            { bottom: Math.max(insets.bottom, spacing.s) + scale(72) },
          ]}
          onPress={() => setTab('add')}
          accessibilityRole="button"
          accessibilityLabel="Add an entry"
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      ) : null}

      <UndoSnackbar />

      {releaseNotes.length > 0 ? (
        <WhatsNew notes={releaseNotes} onDismiss={markVersionSeen} />
      ) : null}

      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onSelect={setTab}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

export default function App() {
  // The two bundled faces. They ship inside the APK — nothing is fetched, per
  // the product's standing no-network commitment — so this resolves on the
  // first frame in practice and only guards the very first launch.
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  if (!fontsLoaded) return null;

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
    // The rack the mail is sorted into: lifted off the ground like everything
    // else in this world, rather than ruled off from it.
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      paddingTop: spacing.s,
    },
    // One marker that travels to the active slot — the franking line struck
    // across the top of a sorted letter.
    tabMarker: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: scale(3),
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: scale(48),
      paddingTop: spacing.xs,
    },
    tabLabel: {
      ...indicium,
      fontSize: font.small,
      letterSpacing: font.small * 0.06,
    },
    // The face, not the weight: `indicium` already names a family, and a named
    // family is exactly the case where the Text wrapper stops resolving
    // fontWeight — so asking for 700 here would have done nothing at all.
    tabLabelActive: {
      fontFamily: type.registerBold,
    },
    // The add action is a stamp waiting to be pressed on.
    addButton: {
      position: 'absolute',
      right: spacing.l,
      width: scale(56),
      height: scale(56),
      borderRadius: radius.m,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      color: onColor(colors.primary),
      fontSize: font.xlarge,
      lineHeight: font.xlarge + scale(6),
      fontWeight: '600',
    },
  });
