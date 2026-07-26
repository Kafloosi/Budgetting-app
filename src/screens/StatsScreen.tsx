import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp, useCategories, useTheme } from '../context/AppContext';
import { font, scale, spacing, ThemeColors } from '../theme';
import {
  currentMonthKey,
  formatCents,
  formatMonth,
  monthKey,
  shiftMonth,
} from '../utils/money';
import {
  Card,
  EmptyState,
  Label,
  PeriodNav,
  Row,
  screenChrome,
  ScreenTitle,
  useThemedStyles,
} from '../components/ui';
import { Category } from '../types';

const TREND_MONTHS = 6;

/** A labeled horizontal meter: category name, value text, and a filled bar */
function MeterRow({
  category,
  right,
  rightColor,
  ratio,
  barColor,
  below,
  styles,
}: {
  category: Category;
  right: string;
  rightColor?: string;
  ratio: number;
  barColor: string;
  below?: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.catRow}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.catName} numberOfLines={1}>
          {category.emoji} {category.name}
        </Text>
        <Text style={[styles.catAmount, rightColor ? { color: rightColor } : null]}>
          {right}
        </Text>
      </Row>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              width: `${Math.min(100, Math.max(2, ratio * 100))}%`,
            },
          ]}
        />
      </View>
      {below ? <Text style={styles.overText}>{below}</Text> : null}
    </View>
  );
}

export default function StatsScreen() {
  const { state } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { byId: categoryById } = useCategories();
  const [month, setMonth] = useState(currentMonthKey());

  // One pass over all transactions: per-month income/expense buckets for the
  // trend, and per-category expense totals for the selected month.
  const { trend, byCategory } = useMemo(() => {
    const trendMonths = Array.from({ length: TREND_MONTHS }, (_, i) =>
      shiftMonth(month, i - (TREND_MONTHS - 1)),
    );
    const buckets = new Map(
      trendMonths.map((m) => [m, { month: m, income: 0, expense: 0 }]),
    );
    const categoryTotals = new Map<string, number>();

    for (const t of state.transactions) {
      const m = monthKey(t.date);
      const bucket = buckets.get(m);
      if (bucket) bucket[t.type] += t.amountCents;
      if (t.type === 'expense' && m === month) {
        const id = categoryById(t.categoryId).id;
        categoryTotals.set(id, (categoryTotals.get(id) ?? 0) + t.amountCents);
      }
    }

    return {
      trend: trendMonths.map((m) => buckets.get(m)!),
      byCategory: [...categoryTotals.entries()]
        .map(([id, cents]) => ({ category: categoryById(id), cents }))
        .sort((a, b) => b.cents - a.cents),
    };
  }, [state.transactions, month, categoryById]);

  const trendMax = Math.max(1, ...trend.flatMap((t) => [t.income, t.expense]));
  const monthExpenseTotal = byCategory.reduce((s, e) => s + e.cents, 0);

  const budgetRows = useMemo(
    () =>
      Object.entries(state.budgets)
        .map(([categoryId, limitCents]) => ({
          category: categoryById(categoryId),
          limitCents,
          spent: byCategory.find((e) => e.category.id === categoryId)?.cents ?? 0,
        }))
        .sort((a, b) => b.spent / b.limitCents - a.spent / a.limitCents),
    [state.budgets, byCategory, categoryById],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenTitle title="Stats" subtitle="Where the money goes" />
      <PeriodNav periodType="month" period={month} onChange={setMonth} />

      {state.transactions.length === 0 ? (
        <EmptyState
          icon="📊"
          message="Charts appear here once you add some incomes and expenses."
        />
      ) : (
        <>
          <Card>
            <Label>Income vs expenses · last {TREND_MONTHS} months</Label>
            <Row style={styles.chartRow}>
              {trend.map((t) => (
                <View key={t.month} style={styles.chartCol}>
                  <View style={styles.barsArea}>
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: colors.income,
                          height: Math.max(2, (t.income / trendMax) * scale(110)),
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: colors.expense,
                          height: Math.max(2, (t.expense / trendMax) * scale(110)),
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.chartLabel,
                      t.month === month && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {formatMonth(t.month).slice(0, 3)}
                  </Text>
                </View>
              ))}
            </Row>
            <Row style={{ justifyContent: 'center', marginTop: spacing.s }}>
              <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
              <Text style={styles.legendText}>Income</Text>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.expense, marginLeft: spacing.l },
                ]}
              />
              <Text style={styles.legendText}>Expenses</Text>
            </Row>
          </Card>

          <Card>
            <Label>Spending by category · {formatMonth(month)}</Label>
            {byCategory.length === 0 ? (
              <Text style={styles.emptyText}>No expenses in this month.</Text>
            ) : (
              byCategory.map(({ category, cents }) => {
                const share = monthExpenseTotal > 0 ? cents / monthExpenseTotal : 0;
                return (
                  <MeterRow
                    key={category.id}
                    category={category}
                    right={`${formatCents(cents)}  ${Math.round(share * 100)}%`}
                    ratio={share}
                    barColor={colors.primary}
                    styles={styles}
                  />
                );
              })
            )}
          </Card>

          <Card>
            <Label>Budgets · {formatMonth(month)}</Label>
            {budgetRows.length === 0 ? (
              <Text style={styles.emptyText}>
                No budgets set. Add monthly limits per category in the Settings tab.
              </Text>
            ) : (
              budgetRows.map(({ category, limitCents, spent }) => {
                const ratio = spent / limitCents;
                const over = ratio > 1;
                return (
                  <MeterRow
                    key={category.id}
                    category={category}
                    right={`${formatCents(spent)} / ${formatCents(limitCents)}`}
                    rightColor={over ? colors.expense : undefined}
                    ratio={ratio}
                    barColor={
                      over ? colors.expense : ratio > 0.85 ? colors.warning : colors.income
                    }
                    below={over ? `${formatCents(spent - limitCents)} over budget` : undefined}
                    styles={styles}
                  />
                );
              })
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    ...screenChrome(colors),
    chartRow: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginTop: spacing.s,
    },
    chartCol: {
      flex: 1,
      alignItems: 'center',
    },
    barsArea: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: scale(112),
    },
    bar: {
      width: scale(9),
      borderRadius: scale(3),
      marginHorizontal: scale(1.5),
    },
    chartLabel: {
      marginTop: spacing.xs,
      fontSize: font.small,
      color: colors.textSecondary,
    },
    legendDot: {
      width: scale(8),
      height: scale(8),
      borderRadius: scale(4),
      marginRight: spacing.xs,
    },
    legendText: {
      fontSize: font.small,
      color: colors.textSecondary,
    },
    emptyText: {
      fontSize: font.body,
      color: colors.textSecondary,
    },
    catRow: {
      marginBottom: spacing.m,
    },
    catName: {
      flex: 1,
      fontSize: font.body,
      fontWeight: '600',
      color: colors.text,
      marginRight: spacing.s,
    },
    catAmount: {
      fontSize: font.body,
      fontWeight: '700',
      color: colors.text,
    },
    track: {
      height: scale(8),
      borderRadius: scale(4),
      backgroundColor: colors.background,
      marginTop: spacing.xs,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: scale(4),
    },
    overText: {
      marginTop: 2,
      fontSize: font.small,
      color: colors.expense,
      fontWeight: '600',
    },
  });
