import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp, useTheme } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../theme';
import {
  currentPeriodKey,
  formatCents,
  formatPeriod,
} from '../utils/money';
import { computeSettlement, sharedExpensesForPeriod } from '../utils/split';
import {
  Card,
  Label,
  PeriodNav,
  PrimaryButton,
  Row,
  ScreenTitle,
  SegmentedControl,
} from '../components/ui';
import { PeriodType, SplitMethod } from '../types';

const METHOD_INFO: Record<SplitMethod, { title: string; description: string }> = {
  'fifty-fifty': {
    title: '50/50',
    description: 'Shared expenses are split equally, half each.',
  },
  'equal-payments': {
    title: 'Equal payments',
    description:
      'Based on income — each person pays in proportion to what they earn, so the burden is equal.',
  },
  percentage: {
    title: 'Percentage',
    description: 'Each person pays a custom percentage of the total.',
  },
};

export default function SplitScreen() {
  const { state, addSettlement } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [period, setPeriod] = useState(currentPeriodKey('month'));
  const twoPeople = state.people.length === 2;
  const [method, setMethod] = useState<SplitMethod>(
    twoPeople ? 'fifty-fifty' : 'equal-payments',
  );
  const [percentInputs, setPercentInputs] = useState<Record<string, string>>({});

  const changePeriodType = (t: PeriodType) => {
    setPeriodType(t);
    setPeriod(currentPeriodKey(t));
  };

  // 50/50 only makes sense with exactly two people
  const methods: SplitMethod[] = twoPeople
    ? ['fifty-fifty', 'percentage', 'equal-payments']
    : ['equal-payments', 'percentage'];
  const activeMethod = methods.includes(method) ? method : methods[0];

  const defaultPercent = state.people.length > 0 ? 100 / state.people.length : 0;
  const percentages: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of state.people) {
      const raw = percentInputs[p.id];
      const parsed = raw === undefined || raw === ''
        ? defaultPercent
        : parseFloat(raw.replace(',', '.'));
      out[p.id] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }
    return out;
  }, [state.people, percentInputs, defaultPercent]);

  const percentTotal = state.people.reduce((s, p) => s + percentages[p.id], 0);
  const percentagesValid = Math.abs(percentTotal - 100) < 0.01;

  const expenses = sharedExpensesForPeriod(state.transactions, periodType, period);
  const settlement = useMemo(
    () =>
      computeSettlement(
        state.people,
        state.transactions,
        periodType,
        period,
        activeMethod,
        percentages,
      ),
    [state.people, state.transactions, periodType, period, activeMethod, percentages],
  );

  const noIncomes =
    activeMethod === 'equal-payments' &&
    state.people.every((p) => p.incomeCents <= 0);

  const canSave =
    expenses.length > 0 && (activeMethod !== 'percentage' || percentagesValid);

  const save = () => {
    addSettlement({
      periodType,
      period,
      method: activeMethod,
      totalSharedCents: settlement.totalSharedCents,
      results: settlement.results,
      transfers: settlement.transfers,
    });
    Alert.alert('Saved', 'The calculation was added to your history.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenTitle title="Split" subtitle="Settle shared expenses" />

      <View style={{ marginBottom: spacing.l }}>
        <SegmentedControl
          options={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
          ]}
          value={periodType}
          onChange={changePeriodType}
        />
      </View>

      <PeriodNav periodType={periodType} period={period} onChange={setPeriod} />

      <Label>How do you want to split?</Label>
      {methods.map((m) => {
        const active = m === activeMethod;
        return (
          <Pressable key={m} onPress={() => setMethod(m)}>
            <Card
              style={{
                ...styles.methodCard,
                ...(active ? styles.methodCardActive : null),
              }}
            >
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <View style={styles.radioInner} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>{METHOD_INFO[m].title}</Text>
                <Text style={styles.methodDescription}>{METHOD_INFO[m].description}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}

      {noIncomes ? (
        <Card style={styles.warnCard}>
          <Text style={styles.warnText}>
            No incomes are set, so this splits equally for now. Set each
            person's income in the People tab to split based on income.
          </Text>
        </Card>
      ) : null}

      {activeMethod === 'percentage' ? (
        <Card>
          <Label>Percentages</Label>
          {state.people.map((p) => (
            <Row key={p.id} style={styles.percentRow}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text style={styles.percentName}>{p.name}</Text>
              <TextInput
                style={styles.percentInput}
                value={percentInputs[p.id] ?? String(Math.round(defaultPercent * 100) / 100)}
                onChangeText={(v) =>
                  setPercentInputs((prev) => ({ ...prev, [p.id]: v }))
                }
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <Text style={styles.percentSign}>%</Text>
            </Row>
          ))}
          <Text
            style={[
              styles.percentTotal,
              { color: percentagesValid ? colors.income : colors.expense },
            ]}
          >
            Total: {Math.round(percentTotal * 100) / 100}%
            {percentagesValid ? '' : ' — must add up to 100%'}
          </Text>
        </Card>
      ) : null}

      <Card>
        <Label>Result · {formatPeriod(periodType, period)}</Label>
        <Row style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total shared expenses</Text>
          <Text style={styles.totalValue}>{formatCents(settlement.totalSharedCents)}</Text>
        </Row>

        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>
            No shared expenses in this {periodType}. Mark expenses as “shared”
            when adding them.
          </Text>
        ) : (
          <>
            {settlement.results.map((r) => (
              <View key={r.personId} style={styles.resultRow}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={styles.resultName}>{r.personName}</Text>
                  <Text
                    style={[
                      styles.resultNet,
                      { color: r.netCents >= 0 ? colors.income : colors.expense },
                    ]}
                  >
                    {r.netCents >= 0 ? 'gets back ' : 'still owes '}
                    {formatCents(Math.abs(r.netCents))}
                  </Text>
                </Row>
                <Text style={styles.resultDetail}>
                  paid {formatCents(r.paidCents)} · share {formatCents(r.shareCents)}
                  {r.percentage !== undefined
                    ? ` (${Math.round(r.percentage * 100) / 100}%)`
                    : ''}
                </Text>
              </View>
            ))}

            {settlement.transfers.length > 0 ? (
              <View style={styles.transfersBox}>
                <Text style={styles.transfersTitle}>To settle up</Text>
                {settlement.transfers.map((t, i) => (
                  <Text key={i} style={styles.transferText}>
                    {t.fromName} pays {t.toName}{' '}
                    <Text style={{ fontWeight: '700' }}>{formatCents(t.amountCents)}</Text>
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.settledText}>All settled — nobody owes anything 🎉</Text>
            )}
          </>
        )}
      </Card>

      <PrimaryButton label="Save calculation to history" onPress={save} disabled={!canSave} />
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.l, paddingBottom: scale(100) },
    methodCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.m,
    },
    methodCardActive: {
      borderColor: colors.primary,
      borderWidth: 1.5,
      backgroundColor: colors.primarySoft,
    },
    radio: {
      width: scale(20),
      height: scale(20),
      borderRadius: scale(10),
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: spacing.m,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: colors.primary },
    radioInner: {
      width: scale(10),
      height: scale(10),
      borderRadius: scale(5),
      backgroundColor: colors.primary,
    },
    methodTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
    methodDescription: { fontSize: font.small, color: colors.textSecondary, marginTop: 1 },
    warnCard: {
      backgroundColor: colors.expenseSoft,
      borderColor: colors.expense,
    },
    warnText: { fontSize: font.small, color: colors.text },
    percentRow: { marginBottom: spacing.s },
    dot: { width: scale(10), height: scale(10), borderRadius: scale(5), marginRight: spacing.s },
    percentName: { flex: 1, fontSize: font.body, color: colors.text, fontWeight: '600' },
    percentInput: {
      width: scale(70),
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.s,
      paddingVertical: scale(6),
      paddingHorizontal: spacing.s,
      fontSize: font.body,
      textAlign: 'right',
      color: colors.text,
      backgroundColor: colors.background,
    },
    percentSign: { marginLeft: spacing.xs, fontSize: font.body, color: colors.textSecondary },
    percentTotal: { marginTop: spacing.xs, fontSize: font.small, fontWeight: '600' },
    totalRow: { justifyContent: 'space-between', marginBottom: spacing.m },
    totalLabel: { fontSize: font.body, color: colors.textSecondary },
    totalValue: { fontSize: font.medium, fontWeight: '800', color: colors.text },
    emptyText: { fontSize: font.body, color: colors.textSecondary },
    resultRow: {
      paddingVertical: spacing.s,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    resultName: { fontSize: font.body, fontWeight: '700', color: colors.text },
    resultNet: { fontSize: font.body, fontWeight: '700' },
    resultDetail: { fontSize: font.small, color: colors.textSecondary, marginTop: 2 },
    transfersBox: {
      marginTop: spacing.m,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.m,
      padding: spacing.m,
    },
    transfersTitle: {
      fontSize: font.small,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.xs,
    },
    transferText: { fontSize: font.body, color: colors.text, marginTop: 2 },
    settledText: { marginTop: spacing.m, fontSize: font.body, color: colors.income },
  });
