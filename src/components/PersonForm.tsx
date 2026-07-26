import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { font, spacing, ThemeColors } from '../theme';
import { IncomeFrequency } from '../types';
import {
  centsToInput,
  currencySymbol,
  FREQUENCY_OPTIONS,
  parseAmountToCents,
} from '../utils/money';
import { Input, Label, PrimaryButton, Row, SegmentedControl, useThemedStyles } from './ui';

export interface PersonFormValues {
  name: string;
  incomeCents: number;
  incomeFrequency: IncomeFrequency;
}

/**
 * Form to add or edit a person and their regular income. Used during
 * onboarding, and in Settings for both creating and editing (editing hides
 * the name field). Income may be 0 (skipped).
 */
export function PersonForm({
  existingNames,
  initial,
  hideName,
  submitLabel,
  onSubmit,
}: {
  existingNames: string[];
  initial?: PersonFormValues;
  /** Edit mode: keep the existing name, only change income */
  hideName?: boolean;
  submitLabel: string;
  onSubmit: (person: PersonFormValues) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState(initial?.name ?? '');
  const [income, setIncome] = useState(centsToInput(initial?.incomeCents ?? 0));
  const [frequency, setFrequency] = useState<IncomeFrequency>(
    initial?.incomeFrequency ?? 'monthly',
  );

  const submit = () => {
    const trimmed = name.trim();
    if (!hideName) {
      if (!trimmed) {
        Alert.alert('Missing name', 'Enter a name for this person.');
        return;
      }
      if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
        Alert.alert('Already exists', `"${trimmed}" is already in the list.`);
        return;
      }
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
    if (!initial) {
      setName('');
      setIncome('');
      setFrequency('monthly');
    }
  };

  return (
    <View>
      {!hideName ? (
        <>
          <Label>Name</Label>
          <Input
            style={styles.field}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Anna"
            returnKeyType="done"
          />
        </>
      ) : null}
      <Label>Income (used for income-based splitting)</Label>
      <Row style={styles.field}>
        <Text style={styles.currency}>{currencySymbol()}</Text>
        <Input
          style={{ flex: 1 }}
          value={income}
          onChangeText={setIncome}
          placeholder="0,00 (optional)"
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
      </Row>
      <View style={styles.field}>
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
    field: {
      marginBottom: spacing.m,
    },
    currency: {
      fontSize: font.medium,
      fontWeight: '700',
      color: colors.textSecondary,
      marginRight: spacing.s,
    },
  });
