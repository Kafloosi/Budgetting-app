import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useApp } from '../../context/AppContext';
import { spacing } from '../../theme';
import { centsToInput, parseAmountToCents } from '../../utils/money';
import { knownTags, normalizeTag } from '../../utils/tags';
import { Card, Chip, Input, Label, PrimaryButton } from '../../components/ui';
import { SettingRow, useSettingsStyles } from './common';

/**
 * Monthly limits per tag. Categories cap a kind of spending; a tag budget
 * caps a project — a renovation, a holiday — across every category it runs
 * through, which is how people actually think about one-off undertakings.
 */
export function TagBudgetsSection() {
  const { state, setTagBudget } = useApp();
  const styles = useSettingsStyles();

  const [tag, setTag] = useState('');
  const [amount, setAmount] = useState('');

  const budgeted = useMemo(
    () => Object.entries(state.tagBudgets).sort(([a], [b]) => a.localeCompare(b)),
    [state.tagBudgets],
  );

  // Tags already in use that have no limit yet — the likely next pick.
  const suggestions = useMemo(
    () => knownTags(state.transactions, 12).filter((t) => !(t in state.tagBudgets)),
    [state.transactions, state.tagBudgets],
  );

  const submit = () => {
    const name = normalizeTag(tag);
    const cents = parseAmountToCents(amount);
    if (!name || !cents) {
      Alert.alert('Missing details', 'Pick a tag and enter a monthly limit like 800.');
      return;
    }
    setTagBudget(name, cents);
    setTag('');
    setAmount('');
  };

  return (
    <>
      <Label>Tag budgets</Label>
      <Card>
        {budgeted.length === 0 ? (
          <Text style={styles.mutedBody}>
            No tag budgets yet. Tag a few entries with a project name, then cap
            the project here — the limit follows the tag across every category
            it touches.
          </Text>
        ) : (
          budgeted.map(([name, cents]) => (
            <SettingRow
              key={name}
              title={name}
              titleLines={2}
              sub={`${centsToInput(cents)} per month`}
              onRemove={() => setTagBudget(name, null)}
            />
          ))
        )}

        <Input
          style={{ marginBottom: spacing.s }}
          value={tag}
          onChangeText={setTag}
          placeholder="Tag, e.g. kitchen"
          autoCapitalize="none"
        />
        {suggestions.length > 0 ? (
          <View style={styles.chipsWrap}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} selected={normalizeTag(tag) === s} onPress={() => setTag(s)} />
            ))}
          </View>
        ) : null}
        <Input
          style={{ marginBottom: spacing.m }}
          value={amount}
          onChangeText={setAmount}
          placeholder="Monthly limit, e.g. 800"
          keyboardType="decimal-pad"
          onSubmitEditing={submit}
        />
        <PrimaryButton label="Set tag budget" onPress={submit} />
        <Text style={[styles.mutedSmall, { marginTop: spacing.s }]}>
          An entry counts towards every tag it carries, so tag budgets overlap
          each other and your category budgets rather than adding up with
          them. Carry-over follows the same setting as category budgets.
        </Text>
      </Card>
    </>
  );
}
