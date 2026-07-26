import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { font, spacing, ThemeColors } from '../theme';
import { screenChrome, ScreenTitle, useThemedStyles } from '../components/ui';
import { TransactionForm, TransactionValues } from '../components/TransactionForm';

export default function AddScreen({ onSaved }: { onSaved: () => void }) {
  const { state, addTransaction, addRecurring } = useApp();
  const styles = useThemedStyles(makeStyles);

  const save = ({ repeat, date, ...entry }: TransactionValues) => {
    if (repeat === 'none') {
      addTransaction({ ...entry, date });
    } else {
      // The rule immediately generates entries for every due date
      addRecurring({ ...entry, frequency: repeat, anchorDate: date });
    }
    onSaved();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTitle title="Add entry" subtitle="Record an income or expense" />
        <TransactionForm showRepeat onSubmit={save} />
        {state.people.length === 0 ? (
          <Text style={styles.noPeopleHint}>
            Add at least one person in the Settings tab before adding entries.
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    ...screenChrome(colors),
    noPeopleHint: {
      marginTop: spacing.m,
      fontSize: font.small,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
