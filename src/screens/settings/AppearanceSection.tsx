import React from 'react';
import { Text } from '../../components/Text';
import { useTheme } from '../../context/AppContext';
import { spacing, ThemeMode } from '../../theme';
import { Card, CurrencyChips, Label, SegmentedControl } from '../../components/ui';
import { useSettingsStyles } from './common';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

/** Theme choice and the currency symbol shown throughout the app. */
export function AppearanceSection() {
  const { mode, setMode } = useTheme();
  const styles = useSettingsStyles();

  return (
    <>
      <Label>Appearance</Label>
      <Card>
        <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setMode} />
        <Text style={[styles.mutedSmall, { marginTop: spacing.m }]}>
          Auto follows your phone's light/dark setting.
        </Text>
      </Card>

      <Label>Currency</Label>
      <Card>
        <CurrencyChips />
        <Text style={styles.mutedSmall}>
          Changes the symbol shown everywhere — amounts are not converted.
        </Text>
      </Card>
    </>
  );
}
