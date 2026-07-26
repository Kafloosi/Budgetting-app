import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp, useTheme } from '../context/AppContext';
import { font, scale, spacing, ThemeColors } from '../theme';
import { parseAmountToCents, todayIso } from '../utils/money';
import {
  Card,
  Chip,
  Label,
  PrimaryButton,
  ScreenTitle,
  SegmentedControl,
} from '../components/ui';
import { TransactionType } from '../types';

export default function AddScreen({ onSaved }: { onSaved: () => void }) {
  const { state, addTransaction } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [personId, setPersonId] = useState<string | null>(
    state.people[0]?.id ?? null,
  );
  const [shared, setShared] = useState(true);

  const multiPerson = state.people.length > 1;
  const activePersonId = personId ?? state.people[0]?.id ?? null;
  const isExpense = type === 'expense';
  const accent = isExpense ? colors.expense : colors.income;

  const save = () => {
    const cents = parseAmountToCents(amount);
    if (!cents) {
      Alert.alert('Invalid amount', 'Enter an amount like 12,50');
      return;
    }
    if (!activePersonId) {
      Alert.alert('No person', 'Add a person in the People tab first.');
      return;
    }
    addTransaction({
      personId: activePersonId,
      type,
      amountCents: cents,
      note: note.trim(),
      date: todayIso(),
      shared: isExpense && (multiPerson ? shared : false),
    });
    setAmount('');
    setNote('');
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

        <SegmentedControl
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
          value={type}
          onChange={setType}
          activeColor={accent}
        />

        <Card style={{ marginTop: spacing.l }}>
          <Label>Amount</Label>
          <View style={styles.amountRow}>
            <Text style={[styles.euro, { color: accent }]}>€</Text>
            <TextInput
              style={[styles.amountInput, { color: accent }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor={colors.border}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>
        </Card>

        <Card>
          <Label>Description</Label>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={isExpense ? 'e.g. Groceries' : 'e.g. Salary'}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
          />
        </Card>

        {multiPerson ? (
          <Card>
            <Label>Who?</Label>
            <View style={styles.chipsWrap}>
              {state.people.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  selected={activePersonId === p.id}
                  onPress={() => setPersonId(p.id)}
                  color={p.color}
                />
              ))}
            </View>
          </Card>
        ) : null}

        {multiPerson && isExpense ? (
          <Card style={styles.sharedRow}>
            <View style={{ flex: 1, paddingRight: spacing.m }}>
              <Text style={styles.sharedTitle}>Shared expense</Text>
              <Text style={styles.sharedHint}>
                Shared expenses are included when you settle up in the Split tab.
              </Text>
            </View>
            <Switch
              value={shared}
              onValueChange={setShared}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </Card>
        ) : null}

        <PrimaryButton
          label={isExpense ? 'Add expense' : 'Add income'}
          onPress={save}
          color={accent}
          disabled={state.people.length === 0}
          style={{ marginTop: spacing.s }}
        />
        {state.people.length === 0 ? (
          <Text style={styles.noPeopleHint}>
            Add at least one person in the People tab before adding entries.
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: spacing.l,
      paddingBottom: scale(100),
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    euro: {
      fontSize: font.xlarge,
      fontWeight: '700',
      marginRight: spacing.s,
    },
    amountInput: {
      flex: 1,
      fontSize: font.huge,
      fontWeight: '800',
      paddingVertical: spacing.xs,
    },
    noteInput: {
      fontSize: font.medium,
      color: colors.text,
      paddingVertical: spacing.xs,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    sharedRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sharedTitle: {
      fontSize: font.body,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    sharedHint: {
      fontSize: font.small,
      color: colors.textSecondary,
    },
    noPeopleHint: {
      marginTop: spacing.m,
      fontSize: font.small,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
