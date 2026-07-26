import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, font, radius, scale, spacing } from '../theme';
import {
  currentMonthKey,
  formatCents,
  formatDate,
  formatMonth,
  monthKey,
  shiftMonth,
} from '../utils/money';
import { Card, Chip, EmptyState, Row } from '../components/ui';
import { Transaction } from '../types';

const COMBINED = 'combined';

export default function HomeScreen() {
  const { state, removeTransaction } = useApp();
  const [month, setMonth] = useState(currentMonthKey());
  const [selectedPerson, setSelectedPerson] = useState<string>(COMBINED);

  const multiPerson = state.people.length > 1;
  const activePersonId =
    !multiPerson && state.people.length === 1 ? state.people[0].id : selectedPerson;

  const monthTransactions = useMemo(
    () =>
      state.transactions
        .filter((t) => monthKey(t.date) === month)
        .filter((t) => activePersonId === COMBINED || t.personId === activePersonId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.transactions, month, activePersonId],
  );

  const incomeCents = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amountCents, 0);
  const expenseCents = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amountCents, 0);
  const netCents = incomeCents - expenseCents;

  const personById = useMemo(
    () => new Map(state.people.map((p) => [p.id, p])),
    [state.people],
  );

  const confirmDelete = (t: Transaction) => {
    Alert.alert('Delete entry', `Delete "${t.note || 'this entry'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTransaction(t.id) },
    ]);
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const person = personById.get(item.personId);
    const isIncome = item.type === 'income';
    return (
      <Pressable onLongPress={() => confirmDelete(item)}>
        <Card style={styles.txCard}>
          <View
            style={[
              styles.txIcon,
              { backgroundColor: isIncome ? colors.incomeSoft : colors.expenseSoft },
            ]}
          >
            <Text style={{ fontSize: font.medium }}>{isIncome ? '↑' : '↓'}</Text>
          </View>
          <View style={{ flex: 1, marginHorizontal: spacing.m }}>
            <Text style={styles.txNote} numberOfLines={1}>
              {item.note || (isIncome ? 'Income' : 'Expense')}
            </Text>
            <Row>
              {person && multiPerson ? (
                <>
                  <View style={[styles.dot, { backgroundColor: person.color }]} />
                  <Text style={styles.txMeta}>{person.name} · </Text>
                </>
              ) : null}
              <Text style={styles.txMeta}>
                {formatDate(item.date)}
                {item.type === 'expense' && multiPerson
                  ? item.shared
                    ? ' · shared'
                    : ' · personal'
                  : ''}
              </Text>
            </Row>
          </View>
          <Text
            style={[
              styles.txAmount,
              { color: isIncome ? colors.income : colors.expense },
            ]}
          >
            {isIncome ? '+' : '-'}
            {formatCents(item.amountCents)}
          </Text>
        </Card>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={monthTransactions}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <Row style={styles.monthRow}>
              <Pressable style={styles.monthArrow} onPress={() => setMonth(shiftMonth(month, -1))}>
                <Text style={styles.monthArrowText}>‹</Text>
              </Pressable>
              <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
              <Pressable style={styles.monthArrow} onPress={() => setMonth(shiftMonth(month, 1))}>
                <Text style={styles.monthArrowText}>›</Text>
              </Pressable>
            </Row>

            {multiPerson ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: spacing.s }}
              >
                <Chip
                  label="Combined"
                  selected={selectedPerson === COMBINED}
                  onPress={() => setSelectedPerson(COMBINED)}
                />
                {state.people.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={selectedPerson === p.id}
                    onPress={() => setSelectedPerson(p.id)}
                    color={p.color}
                  />
                ))}
              </ScrollView>
            ) : null}

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                {activePersonId === COMBINED
                  ? 'Combined balance'
                  : `${personById.get(activePersonId)?.name ?? ''} balance`}
              </Text>
              <Text
                style={[
                  styles.summaryNet,
                  { color: netCents >= 0 ? colors.income : colors.expense },
                ]}
              >
                {formatCents(netCents)}
              </Text>
              <Row style={{ marginTop: spacing.m }}>
                <View style={styles.summaryHalf}>
                  <Text style={styles.summarySubLabel}>Income</Text>
                  <Text style={[styles.summaryValue, { color: colors.income }]}>
                    +{formatCents(incomeCents)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryHalf}>
                  <Text style={styles.summarySubLabel}>Expenses</Text>
                  <Text style={[styles.summaryValue, { color: colors.expense }]}>
                    -{formatCents(expenseCents)}
                  </Text>
                </View>
              </Row>
            </Card>

            {monthTransactions.length > 0 ? (
              <Text style={styles.sectionTitle}>Entries</Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🧾"
            message={
              state.people.length === 0
                ? 'Add a person in the People tab, then add your first income or expense.'
                : 'No entries this month yet. Tap + to add an income or expense.'
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    padding: spacing.l,
    paddingBottom: scale(100),
  },
  monthRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.l,
  },
  monthArrow: {
    width: scale(40),
    height: scale(40),
    borderRadius: radius.m,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  monthArrowText: {
    fontSize: font.large,
    color: colors.text,
    lineHeight: font.large + 2,
  },
  monthLabel: {
    fontSize: font.large,
    fontWeight: '700',
    color: colors.text,
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  summaryLabel: {
    fontSize: font.small,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryNet: {
    fontSize: font.huge,
    fontWeight: '800',
    marginTop: spacing.s,
  },
  summaryHalf: { flex: 1, alignItems: 'center' },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  summarySubLabel: {
    fontSize: font.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: font.medium,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: font.medium,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.m,
    marginTop: spacing.s,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m,
  },
  txIcon: {
    width: scale(38),
    height: scale(38),
    borderRadius: radius.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txNote: {
    fontSize: font.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  txMeta: {
    fontSize: font.small,
    color: colors.textSecondary,
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: spacing.xs,
  },
  txAmount: {
    fontSize: font.body,
    fontWeight: '700',
  },
});
