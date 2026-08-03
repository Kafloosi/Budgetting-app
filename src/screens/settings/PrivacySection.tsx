import React from 'react';
import { Alert } from 'react-native';
import { Text } from '../../components/Text';
import * as LocalAuthentication from 'expo-local-authentication';
import { useApp, useTheme } from '../../context/AppContext';
import { spacing } from '../../theme';
import { Card, Label, PrimaryButton } from '../../components/ui';
import { ToggleRow, useSettingsStyles } from './common';

/** What leaves the phone (nothing), erasing everything, and the app lock. */
export function PrivacySection() {
  const { state, setAppLock, eraseAllData } = useApp();
  const { colors } = useTheme();
  const styles = useSettingsStyles();

  const confirmErase = () => {
    Alert.alert(
      'Delete all data',
      'This permanently erases every person, entry, receipt photo, budget, goal and setting on this phone. It cannot be undone — export a backup first if you want to keep anything.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: () => eraseAllData() },
      ],
    );
  };

  const toggleAppLock = async (enabled: boolean) => {
    if (!enabled) {
      setAppLock(false);
      return;
    }
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hasHardware || !enrolled) {
      Alert.alert(
        'Not available',
        'Set up a fingerprint, face unlock, or screen lock on your phone first.',
      );
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm to enable app lock',
    });
    if (result.success) setAppLock(true);
  };

  return (
    <>
      <Label>Privacy</Label>
      <Card>
        <Text style={styles.mutedBody}>
          Everything stays on this phone. The app has no account, sends nothing
          to a server, and contains no analytics or tracking — so there is no
          copy of your data anywhere to leak, and nothing that identifies you.
        </Text>
        <Text style={[styles.mutedSmall, { marginTop: spacing.m }]}>
          Anything you export leaves the app readable unless you set a backup
          password under Data below.
        </Text>
        <PrimaryButton
          label="Delete all data"
          onPress={confirmErase}
          color={colors.expense}
          style={{ marginTop: spacing.m }}
        />
      </Card>

      <Label>Security</Label>
      <Card>
        <ToggleRow
          title="App lock"
          description="Require fingerprint / face unlock when opening the app."
          value={state.settings.appLock}
          onValueChange={toggleAppLock}
        />
      </Card>
    </>
  );
}
