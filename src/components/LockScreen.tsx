import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import * as LocalAuthentication from 'expo-local-authentication';
import { font, spacing, ThemeColors } from '../theme';
import { PrimaryButton, useThemedStyles } from './ui';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const styles = useThemedStyles(makeStyles);

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your budget',
      });
      if (result.success) onUnlock();
    } catch {
      // Stay locked; the user can retry with the button.
    }
  };

  // Prompt immediately when the lock screen appears
  useEffect(() => {
    authenticate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Locked</Text>
      <Text style={styles.subtitle}>Unlock to see your budget</Text>
      <PrimaryButton label="Unlock" onPress={authenticate} style={styles.button} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    icon: {
      fontSize: font.huge,
      marginBottom: spacing.m,
    },
    title: {
      fontSize: font.xlarge,
      fontWeight: '800',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: font.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    button: {
      alignSelf: 'stretch',
    },
  });
