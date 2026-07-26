import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp, usePeopleById } from '../../context/AppContext';
import { spacing, ThemeColors } from '../../theme';
import {
  centsToInput,
  formatCents,
  formatDate,
  FREQUENCY_LABEL,
  FREQUENCY_OPTIONS,
  parseAmountToCents,
} from '../../utils/money';
import { IncomeFrequency, RecurringRule } from '../../types';
import {
  Card,
  Input,
  Label,
  PrimaryButton,
  Row,
  SegmentedControl,
  useThemedStyles,
} from '../../components/ui';
import { useSettingsStyles } from './common';

/** Rules that add rent, salary, and subscriptions automatically. */
export function RecurringSection() {
  const { state, removeRecurring, updateRecurring } = useApp();
  const personById = usePeopleById();
  const styles = useSettingsStyles();
  const local = useThemedStyles(makeStyles);

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleAmount, setRuleAmount] = useState('');
  const [ruleNote, setRuleNote] = useState('');
  const [ruleFrequency, setRuleFrequency] = useState<IncomeFrequency>('monthly');

  const startEditRule = (rule: RecurringRule) => {
    setEditingRuleId(rule.id);
    setRuleAmount(centsToInput(rule.amountCents));
    setRuleNote(rule.note);
    setRuleFrequency(rule.frequency);
  };

  const saveRule = (rule: RecurringRule) => {
    const amountCents = parseAmountToCents(ruleAmount);
    if (!amountCents) {
      Alert.alert('Invalid amount', 'Enter an amount like 950');
      return;
    }
    updateRecurring(rule.id, {
      amountCents,
      note: ruleNote.trim(),
      frequency: ruleFrequency,
    });
    setEditingRuleId(null);
  };

  const confirmRemove = (rule: RecurringRule) => {
    Alert.alert(
      'Stop repeating',
      `Stop "${rule.note || 'this entry'}" from repeating? Entries it already created can be kept or deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Keep entries', onPress: () => removeRecurring(rule.id, false) },
        {
          text: 'Delete entries too',
          style: 'destructive',
          onPress: () => removeRecurring(rule.id, true),
        },
      ],
    );
  };

  return (
    <>
      <Label>Recurring entries</Label>
      <Card>
        {state.recurring.length === 0 ? (
          <Text style={styles.mutedBody}>
            Nothing repeats yet. When adding an entry, set “Repeat” to weekly,
            bi-weekly, or monthly — rent, salary, and subscriptions will then be
            added automatically.
          </Text>
        ) : (
          state.recurring.map((rule) => {
            const editing = editingRuleId === rule.id;
            return (
              <View key={rule.id} style={styles.listRow}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {rule.note || (rule.type === 'income' ? 'Income' : 'Expense')}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      {rule.type === 'income' ? '+' : '-'}
                      {formatCents(rule.amountCents)} · every{' '}
                      {FREQUENCY_LABEL[rule.frequency]} ·{' '}
                      {personById.get(rule.personId)?.name ?? '?'} · since{' '}
                      {formatDate(rule.anchorDate)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => (editing ? setEditingRuleId(null) : startEditRule(rule))}
                    hitSlop={8}
                    style={{ marginRight: spacing.l }}
                  >
                    <Text style={styles.link}>{editing ? 'Cancel' : 'Edit'}</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmRemove(rule)} hitSlop={8}>
                    <Text style={styles.danger}>Stop</Text>
                  </Pressable>
                </Row>
                {editing ? (
                  <View style={local.editBox}>
                    <Label>Amount</Label>
                    <Input
                      style={{ marginBottom: spacing.s }}
                      value={ruleAmount}
                      onChangeText={setRuleAmount}
                      keyboardType="decimal-pad"
                      placeholder="0,00"
                    />
                    <Label>Description</Label>
                    <Input
                      style={{ marginBottom: spacing.s }}
                      value={ruleNote}
                      onChangeText={setRuleNote}
                      placeholder="e.g. Rent"
                    />
                    <Label>Repeats every</Label>
                    <View style={{ marginBottom: spacing.m }}>
                      <SegmentedControl
                        options={FREQUENCY_OPTIONS}
                        value={ruleFrequency}
                        onChange={setRuleFrequency}
                      />
                    </View>
                    <PrimaryButton label="Save" onPress={() => saveRule(rule)} />
                    <Text style={[styles.mutedSmall, { marginTop: spacing.s }]}>
                      Changes apply to future entries; ones already added keep
                      their original amount.
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </Card>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    editBox: {
      marginTop: spacing.l,
      paddingTop: spacing.l,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
