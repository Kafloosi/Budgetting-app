import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../theme';
import { IncomeFrequency } from '../types';
import { parseAmountToCents } from '../utils/money';
import { Label, PrimaryButton, SegmentedControl } from './ui';

export const FREQUENCY_OPTIONS: { value: IncomeFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/**
 * Form to add a person with their regular income. Used during onboarding
 * and in the People tab. Income may be 0 (skipped).
 */
export function PersonForm({
  existingNames,
  submitLabel,
  onSubmit,
}: {
  existingNames: string[];
  submitLabel: string;
  onSubmit: (person: {
    name: string;
    incomeCents: number;
    incomeFrequency: IncomeFrequency;
  }) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [frequency, setFrequency] = useState<IncomeFrequency>('monthly');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Missing name', 'Enter a name for this person.');
      return;
    }
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Already exists', `"${trimmed}" is already in the list.`);
      return;
    }
    let incomeCents = 0;
    if (income.trim() !== '') {
      const parsed = parseAmountToCents(income);
      if (parsed === null) {
        Alert.alert('Invalid income', 'Enter an income like 2500 or leave it empty.');
        return;
      }
      incomeCents = parsed;
    }
    onSubmit({ name: trimmed, incomeCents, incomeFrequency: frequency });
    setName('');
    setIncome('');
    setFrequency('monthly');
  };

  return (
    <View>
      <Label>Name</Label>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Anna"
        placeholderTextColor={colors.textSecondary}
        returnKeyType="done"
      />
      <Label>Income (used for income-based splitting)</Label>
      <View style={styles.incomeRow}>
        <Text style={styles.euro}>€</Text>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={income}
          onChangeText={setIncome}
          placeholder="0,00 (optional)"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
      </View>
      <View style={{ marginBottom: spacing.m }}>
        <SegmentedControl
          options={FREQUENCY_OPTIONS}
          value={frequency}
          onChange={setFrequency}
        />
      </View>
      <PrimaryButton label={submitLabel} onPress={submit} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.m,
      paddingHorizontal: spacing.m,
      paddingVertical: scale(10),
      fontSize: font.body,
      color: colors.text,
      backgroundColor: colors.background,
      marginBottom: spacing.m,
    },
    incomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.m,
    },
    euro: {
      fontSize: font.medium,
      fontWeight: '700',
      color: colors.textSecondary,
      marginRight: spacing.s,
    },
  });
