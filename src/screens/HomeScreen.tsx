import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp, useCategories, usePeopleById, useTheme } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../theme';
import { currentMonthKey, formatCents, formatDate, monthKey } from '../utils/money';
import {
  Card,
  Chip,
  EmptyState,
  PeriodNav,
  Row,
  screenChrome,
  SegmentedControl,
  useThemedStyles,
} from '../components/ui';
import { TransactionForm, TransactionValues } from '../components/TransactionForm';
import { Transaction } from '../types';

const COMBINED = 'combined';

type TypeFilter = 'all' | 'income' | 'expense';

export default function HomeScreen() {
  const { state, removeTransaction, updateTransaction } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { byId: categoryById } = useCategories();
  const personById = usePeopleById();
  const [month, setMonth] = useState(currentMonthKey());
  const [selectedPerson, setSelectedPerson] = useState<string>(COMBINED);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);

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

  // Totals ignore search/type filters so the summary always shows the month
  const { incomeCents, expenseCents } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of monthTransactions) {
      if (t.type === 'income') income += t.amountCents;
      else expense += t.amountCents;
    }
    return { incomeCents: income, expenseCents: expense };
  }, [monthTransactions]);
  const netCents = incomeCents - expenseCents;

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return monthTransactions
      .filter((t) => typeFilter === 'all' || t.type === typeFilter)
      .filter(
        (t) =>
          !query ||
          t.note.toLowerCase().includes(query) ||
          categoryById(t.categoryId).name.toLowerCase().includes(query),
      );
  }, [monthTransactions, search, typeFilter, categoryById]);

  const confirmDelete = (t: Transaction) => {
    Alert.alert('Delete entry', `Delete "${t.note || 'this entry'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTransaction(t.id) },
    ]);
  };

  const saveEdit = (values: TransactionValues) => {
    if (!editing) return;
    const { repeat: _repeat, ...patch } = values;
    updateTransaction(editing.id, patch);
    setEditing(null);
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const person = personById.get(item.personId);
    const isIncome = item.type === 'income';
    const category = categoryById(isIncome ? undefined : item.categoryId);
    return (
      <Pressable onPress={() => setEditing(item)} onLongPress={() => confirmDelete(item)}>
        <Card style={styles.txCard}>
          <View
            style={[
              styles.txIcon,
              { backgroundColor: isIncome ? colors.incomeSoft : colors.expenseSoft },
            ]}
          >
            <Text style={{ fontSize: font.medium }}>
              {isIncome ? '↑' : category.emoji}
            </Text>
          </View>
          <View style={{ flex: 1, marginHorizontal: spacing.m }}>
            <Text style={styles.txNote} numberOfLines={1}>
              {item.note || (isIncome ? 'Income' : category.name)}
            </Text>
            <Row>
              {person && multiPerson ? (
                <>
                  <View style={[styles.dot, { backgroundColor: person.color }]} />
                  <Text style={styles.txMeta}>{person.name} · </Text>
                </>
              ) : null}
              <Text style={styles.txMeta} numberOfLines={1}>
                {formatDate(item.date)}
                {!isIncome ? ` · ${category.name}` : ''}
                {item.recurringId ? ' · ↻' : ''}
                {item.photoUri ? ' · 📎' : ''}
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
        data={visibleTransactions}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <PeriodNav periodType="month" period={month} onChange={setMonth} />

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
              <>
                <TextInput
                  style={styles.search}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="🔍  Search entries…"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="search"
                />
                <View style={{ marginBottom: spacing.m }}>
                  <SegmentedControl
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'income', label: 'Income' },
                      { value: 'expense', label: 'Expenses' },
                    ]}
                    value={typeFilter}
                    onChange={setTypeFilter}
                  />
                </View>
              </>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🧾"
            message={
              state.people.length === 0
                ? 'Add a person in the Settings tab, then add your first income or expense.'
                : monthTransactions.length > 0
                  ? 'No entries match your search.'
                  : 'No entries this month yet. Tap + to add an income or expense.'
            }
          />
        }
      />

      {editing ? (
        <Modal visible animationType="slide" onRequestClose={() => setEditing(null)}>
          <View style={styles.modal}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <Row style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit entry</Text>
                <Pressable onPress={() => setEditing(null)} hitSlop={8}>
                  <Text style={styles.modalClose}>Close</Text>
                </Pressable>
              </Row>
              <TransactionForm
                initial={editing}
                showRepeat={false}
                submitLabel="Save changes"
                onSubmit={saveEdit}
              />
              <Pressable
                style={styles.deleteButton}
                onPress={() => {
                  const target = editing;
                  setEditing(null);
                  confirmDelete(target);
                }}
              >
                <Text style={styles.deleteLabel}>Delete entry</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    ...screenChrome(colors),
    listContent: screenChrome(colors).content,
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
    search: {
      backgroundColor: colors.card,
      borderRadius: radius.m,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: spacing.m,
      paddingVertical: scale(10),
      fontSize: font.body,
      color: colors.text,
      marginBottom: spacing.m,
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
    modal: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalContent: {
      padding: spacing.l,
      paddingTop: spacing.xxl,
      paddingBottom: scale(60),
    },
    modalHeader: {
      justifyContent: 'space-between',
      marginBottom: spacing.l,
    },
    modalTitle: {
      fontSize: font.large,
      fontWeight: '700',
      color: colors.text,
    },
    modalClose: {
      fontSize: font.body,
      fontWeight: '600',
      color: colors.primary,
    },
    deleteButton: {
      marginTop: spacing.m,
      alignItems: 'center',
      paddingVertical: spacing.m,
    },
    deleteLabel: {
      color: colors.expense,
      fontSize: font.body,
      fontWeight: '700',
    },
  });
