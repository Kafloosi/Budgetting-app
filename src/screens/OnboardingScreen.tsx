import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { font, scale, spacing, ThemeColors } from '../theme';
import { FREQUENCY_LABEL, formatCents } from '../utils/money';
import {
  Card,
  CurrencyChips,
  Label,
  PrimaryButton,
  Row,
  useThemedStyles,
} from '../components/ui';
import { PersonForm } from '../components/PersonForm';

/**
 * First-launch setup: add the people in the household and each person's
 * regular income (weekly, bi-weekly or monthly).
 */
export default function OnboardingScreen() {
  const { state, addPerson, removePerson, completeOnboarding } = useApp();
  const styles = useThemedStyles(makeStyles);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>
          Who is this budget for? Add one person to track your own money, or
          several to split shared expenses. Income is optional — it powers the
          income-based split and can be changed later in the Settings tab.
        </Text>

        {state.people.length > 0 ? (
          <Card>
            <Label>
              {state.people.length === 1 ? '1 person added' : `${state.people.length} people added`}
            </Label>
            {state.people.map((p) => (
              <Row key={p.id} style={styles.personRow}>
                <View style={[styles.dot, { backgroundColor: p.color }]} />
                <Text style={styles.personName}>{p.name}</Text>
                <Text style={styles.personIncome}>
                  {p.incomeCents > 0
                    ? `${formatCents(p.incomeCents)} / ${FREQUENCY_LABEL[p.incomeFrequency]}`
                    : 'no income set'}
                </Text>
                <Pressable onPress={() => removePerson(p.id)} hitSlop={8}>
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              </Row>
            ))}
          </Card>
        ) : null}

        <Card>
          <PersonForm
            existingNames={state.people.map((p) => p.name)}
            submitLabel={state.people.length === 0 ? 'Add person' : 'Add another person'}
            onSubmit={addPerson}
          />
        </Card>

        <Card>
          <Label>Currency</Label>
          <CurrencyChips limit={4} />
          <Text style={styles.currencyHint}>More currencies in Settings later.</Text>
        </Card>

        <PrimaryButton
          label="Start budgeting"
          onPress={completeOnboarding}
          disabled={state.people.length === 0}
          style={{ marginTop: spacing.s }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: spacing.l,
      paddingTop: spacing.xxl,
      paddingBottom: scale(60),
    },
    hello: {
      fontSize: font.huge,
      textAlign: 'center',
      marginBottom: spacing.s,
    },
    title: {
      fontSize: font.xlarge,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.s,
    },
    subtitle: {
      fontSize: font.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: font.body * 1.5,
    },
    personRow: {
      marginBottom: spacing.s,
    },
    dot: {
      width: scale(10),
      height: scale(10),
      borderRadius: scale(5),
      marginRight: spacing.s,
    },
    personName: {
      fontSize: font.body,
      fontWeight: '700',
      color: colors.text,
      marginRight: spacing.s,
    },
    personIncome: {
      flex: 1,
      fontSize: font.small,
      color: colors.textSecondary,
    },
    remove: {
      color: colors.expense,
      fontSize: font.medium,
      fontWeight: '700',
      paddingHorizontal: spacing.s,
    },
    currencyHint: {
      fontSize: font.small,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
  });
