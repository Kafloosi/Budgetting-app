import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useApp, usePremium } from '../../context/AppContext';
import { font, scale, spacing, ThemeColors } from '../../theme';
import {
  PREMIUM_PRICE_LABEL,
  PREMIUM_SELLING_POINTS,
  restorePremium,
  validateUnlockCode,
} from '../../utils/premium';
import { Card, Input, PrimaryButton, Row, useThemedStyles } from '../../components/ui';
import { useSettingsStyles } from './common';

/** Budget Pro upsell, unlock-code redemption, and purchase restore. */
export function ProCard() {
  const { setPremium } = useApp();
  const premium = usePremium('goalAutos');
  const shared = useSettingsStyles();
  const styles = useThemedStyles(makeStyles);

  const [unlockCode, setUnlockCode] = useState('');
  const [restoring, setRestoring] = useState(false);

  const redeemCode = () => {
    if (validateUnlockCode(unlockCode)) {
      setPremium(true);
      setUnlockCode('');
      Alert.alert('Budget Pro unlocked', 'All premium features are now available.');
    } else {
      Alert.alert('Invalid code', 'That unlock code is not valid.');
    }
  };

  const buyPremium = () => {
    Alert.alert(
      `Budget Pro — ${PREMIUM_PRICE_LABEL} one-time`,
      'In-app purchases become available once the app is published in the Play Store / App Store. Until then, Budget Pro can be unlocked with a code.',
    );
  };

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    const outcome = await restorePremium();
    setRestoring(false);
    switch (outcome) {
      case 'restored':
        setPremium(true);
        Alert.alert('Purchase restored', 'Budget Pro is active again.');
        break;
      case 'nothing-found':
        Alert.alert('Nothing to restore', 'No previous Budget Pro purchase was found.');
        break;
      case 'error':
        Alert.alert('Could not reach the store', 'Check your connection and try again.');
        break;
      default:
        Alert.alert(
          'Not available yet',
          'Purchases restore automatically once the app is installed from the Play Store / App Store. On this build, re-enter your unlock code.',
        );
    }
  };

  return (
    <Card style={premium ? styles.proCardActive : styles.proCard}>
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.s }}>
        <Text style={styles.proTitle}>{premium ? 'Budget Pro · active' : 'Budget Pro'}</Text>
        {premium ? (
          <Text style={styles.proActive}>Unlocked</Text>
        ) : (
          <Text style={styles.proPrice}>{PREMIUM_PRICE_LABEL} once</Text>
        )}
      </Row>
      {premium ? (
        <Text style={shared.mutedSmall}>
          Thanks for supporting the app — all premium features are active.
        </Text>
      ) : (
        <>
          {PREMIUM_SELLING_POINTS.map((point) => (
            <Text key={point} style={styles.proFeature}>
              {point}
            </Text>
          ))}
          <PrimaryButton
            label={`Unlock for ${PREMIUM_PRICE_LABEL}`}
            onPress={buyPremium}
            style={{ marginTop: spacing.m }}
          />
          <Row style={{ marginTop: spacing.m }}>
            <Input
              style={{ flex: 1, marginRight: spacing.s }}
              value={unlockCode}
              onChangeText={setUnlockCode}
              placeholder="Have an unlock code?"
              autoCapitalize="characters"
              onSubmitEditing={redeemCode}
              returnKeyType="done"
            />
            <PrimaryButton
              label="Redeem"
              onPress={redeemCode}
              style={{ paddingHorizontal: spacing.l, paddingVertical: scale(11) }}
            />
          </Row>
          <Pressable
            onPress={restore}
            disabled={restoring}
            hitSlop={8}
            style={{ marginTop: spacing.m }}
          >
            <Text style={[shared.link, { textAlign: 'center' }]}>
              {restoring ? 'Checking…' : 'Already bought it? Restore purchase'}
            </Text>
          </Pressable>
        </>
      )}
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    proCard: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    proCardActive: {
      backgroundColor: colors.incomeSoft,
      borderColor: colors.income,
    },
    proTitle: {
      fontSize: font.medium,
      fontWeight: '800',
      color: colors.text,
    },
    proPrice: {
      fontSize: font.body,
      fontWeight: '700',
      color: colors.primary,
    },
    proActive: {
      fontSize: font.body,
      fontWeight: '700',
      color: colors.income,
    },
    proFeature: {
      fontSize: font.body,
      color: colors.text,
      marginBottom: spacing.xs,
    },
  });
