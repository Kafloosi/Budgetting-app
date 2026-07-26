import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import HomeScreen from './src/screens/HomeScreen';
import AddScreen from './src/screens/AddScreen';
import SplitScreen from './src/screens/SplitScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PeopleScreen from './src/screens/PeopleScreen';
import { colors, font, scale, spacing } from './src/theme';

type Tab = 'home' | 'split' | 'add' | 'history' | 'people';

function Root() {
  const { state, loaded } = useApp();
  const [tab, setTab] = useState<Tab>('home');
  const insets = useSafeAreaInsets();

  // The split feature only exists when there is more than one person
  const showSplit = state.people.length > 1;
  const activeTab = tab === 'split' && !showSplit ? 'home' : tab;

  if (!loaded) {
    return <View style={styles.app} />;
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'home', label: 'Home', icon: '⌂' },
    ...(showSplit ? [{ key: 'split' as Tab, label: 'Split', icon: '⇄' }] : []),
    { key: 'add', label: 'Add', icon: '+' },
    { key: 'history', label: 'History', icon: '🕘' },
    { key: 'people', label: 'People', icon: '👥' },
  ];

  return (
    <View style={styles.app}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'split' && showSplit && <SplitScreen />}
        {activeTab === 'add' && <AddScreen onSaved={() => setTab('home')} />}
        {activeTab === 'history' && <HistoryScreen />}
        {activeTab === 'people' && <PeopleScreen />}
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
        <StatusBar style="dark" />
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
