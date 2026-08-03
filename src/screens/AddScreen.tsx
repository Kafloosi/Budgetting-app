import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Text } from '../components/Text';
import { useApp } from '../context/AppContext';
import { font, spacing, ThemeColors } from '../theme';
import {
  Chip,
  Label,
  screenChrome,
  ScreenTitle,
  useThemedStyles,
} from '../components/ui';
import { TransactionForm, TransactionValues } from '../components/TransactionForm';
import { formatCents, todayIso } from '../utils/money';
import { EntryTemplate } from '../types';

export default function AddScreen({ onSaved }: { onSaved: () => void }) {
  const { state, addTransaction, addRecurring, addTemplate } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [applied, setApplied] = useState<EntryTemplate | null>(null);

  const save = ({ repeat, date, ...entry }: TransactionValues) => {
    if (repeat === 'none') {
      addTransaction({ ...entry, date });
    } else {
      // The rule immediately generates entries for every due date
      addRecurring({ ...entry, frequency: repeat, anchorDate: date });
    }
    onSaved();
  };

  const saveTemplate = ({ repeat: _repeat, date: _date, ...entry }: TransactionValues) => {
    // Named after the entry itself, so saving one never interrupts the flow
    // with a naming dialog. Renaming means saving over it with a new note.
    addTemplate({ ...entry, name: entry.note || (entry.type === 'income' ? 'Income' : 'Expense') });
  };

  /**
   * The entry a template describes. Its account can have been deleted since
   * it was saved, so it falls back to the default a new entry would get.
   */
  const templateEntry = ({ id: _id, name: _name, ...entry }: EntryTemplate) => ({
    ...entry,
    accountId: entry.accountId ?? state.accounts[0]?.id,
  });

  /** Long-press: file the template straight away, dated today */
  const addNow = (template: EntryTemplate) => {
    addTransaction({ ...templateEntry(template), date: todayIso() });
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

        {state.templates.length > 0 ? (
          <>
            <Label>Templates</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.s }}
            >
              {state.templates.map((template) => (
                <Chip
                  key={template.id}
                  label={`${template.name} · ${formatCents(template.amountCents)}`}
                  selected={applied?.id === template.id}
                  onPress={() => setApplied(template)}
                  onLongPress={() => addNow(template)}
                />
              ))}
            </ScrollView>
            <Text style={styles.templateHint}>
              Tap to fill the form, hold to add it straight away.
            </Text>
          </>
        ) : null}

        <TransactionForm
          // Remounting is what lets a template replace what's in the form:
          // the fields are local state, seeded once from `initial`.
          key={applied?.id ?? 'blank'}
          initial={applied ? templateEntry(applied) : undefined}
          showRepeat
          onSubmit={save}
          onSaveTemplate={saveTemplate}
        />
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
    templateHint: {
      fontSize: font.small,
      color: colors.textSecondary,
      marginBottom: spacing.l,
    },
  });
