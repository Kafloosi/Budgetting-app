import React from 'react';
import { Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { ensureNotificationPermission } from '../../utils/notifications';
import { Card, Label } from '../../components/ui';
import { ToggleRow } from './common';

/** Budget alerts, the weekly digest, and the settle-up reminder. */
export function NotificationsSection() {
  const { state, setBudgetAlerts, setSettleReminder, setWeeklyDigest } = useApp();

  /** Switching a reminder on needs permission first; switching off never does. */
  const toggle = async (enabled: boolean, apply: (value: boolean) => void) => {
    if (!enabled) {
      apply(false);
      return;
    }
    if (await ensureNotificationPermission()) {
      apply(true);
    } else {
      Alert.alert(
        'Notifications blocked',
        'Allow notifications for this app in your phone settings to get reminders.',
      );
    }
  };

  return (
    <>
      <Label>Notifications</Label>
      <Card>
        <ToggleRow
          title="Budget alerts"
          description="Get notified when a category reaches 85% or goes over its monthly budget."
          value={state.settings.budgetAlerts}
          onValueChange={(v) => toggle(v, setBudgetAlerts)}
        />
        <ToggleRow
          divider
          title="Weekly digest"
          description="A Sunday evening summary of what you spent this week."
          value={state.settings.weeklyDigest}
          onValueChange={(v) => toggle(v, setWeeklyDigest)}
        />
        {state.people.length > 1 ? (
          <ToggleRow
            divider
            title="Settle-up reminder"
            description="A reminder on the 1st of each month to settle last month's shared expenses."
            value={state.settings.settleReminder}
            onValueChange={(v) => toggle(v, setSettleReminder)}
          />
        ) : null}
      </Card>
    </>
  );
}
