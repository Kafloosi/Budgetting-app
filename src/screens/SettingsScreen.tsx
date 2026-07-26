import React from 'react';
import { ScrollView } from 'react-native';
import { screenChrome, ScreenTitle, useThemedStyles } from '../components/ui';
import { AboutSection } from './settings/AboutSection';
import { AccountsSection } from './settings/AccountsSection';
import { AppearanceSection } from './settings/AppearanceSection';
import { BudgetsSection } from './settings/BudgetsSection';
import { CategoriesSection } from './settings/CategoriesSection';
import { DataSection } from './settings/DataSection';
import { GoalsSection } from './settings/GoalsSection';
import { NotificationsSection } from './settings/NotificationsSection';
import { PeopleSection } from './settings/PeopleSection';
import { PrivacySection } from './settings/PrivacySection';
import { ProCard } from './settings/ProCard';
import { RecurringSection } from './settings/RecurringSection';
import { TemplatesSection } from './settings/TemplatesSection';

/**
 * Settings is a stack of independent sections, each owning its own state and
 * reading what it needs from the app context, so this screen only orders them.
 */
export default function SettingsScreen() {
  const styles = useThemedStyles(screenChrome);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenTitle title="Settings" subtitle="People, budgets, and app options" />
      <ProCard />
      <PeopleSection />
      <AccountsSection />
      <TemplatesSection />
      <RecurringSection />
      <BudgetsSection />
      <GoalsSection />
      <CategoriesSection />
      <AppearanceSection />
      <NotificationsSection />
      <PrivacySection />
      <DataSection />
      <AboutSection />
    </ScrollView>
  );
}
