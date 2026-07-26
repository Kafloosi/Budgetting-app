import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp, usePremium, useTheme } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../theme';
import {
  currentPeriodKey,
  formatCents,
  formatMonth,
  formatPeriod,
  monthKey,
  parseAmountToCents,
  shiftMonth,
} from '../utils/money';
import { rankedCategorySpending, totalsByPerson } from '../utils/aggregate';
import { computeInsights } from '../utils/insights';
import {
  CategoryForecast,
  Forecast,
  forecastCategories,
  forecastCurrentMonth,
} from '../utils/forecast';
import {
  Card,
  EmptyState,
  Input,
  Label,
  PeriodNav,
  PrimaryButton,
  Row,
  screenChrome,
  ScreenTitle,
  SegmentedControl,
  useThemedStyles,
} from '../components/ui';
import { Goal } from '../types';

const TREND_MONTHS = 6;

type StatsView = 'month' | 'year';

/** A labeled horizontal meter: name, value text, and a filled progress bar */
function MeterRow({
  label,
  dotColor,
  right,
  rightColor,
  ratio,
  barColor,
  below,
  belowColor,
  styles,
}: {
  label: string;
  dotColor?: string;
  right: string;
  rightColor?: string;
  ratio: number;
  barColor: string;
  below?: string;
  belowColor?: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.catRow}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ flex: 1, marginRight: spacing.s }}>
          {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
          <Text style={styles.catName} numberOfLines={1}>
            {label}
          </Text>
        </Row>
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
      {below ? (
        <Text style={[styles.belowText, belowColor ? { color: belowColor } : null]}>
          {below}
        </Text>
      ) : null}
    </View>
  );
}

/** Consistent "this is a Pro feature" message for locked cards */
function ProLock({ what, styles }: { what: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Text style={styles.emptyText}>
      {what} are part of Budget Pro — unlock it in the Settings tab.
    </Text>
  );
}

function ForecastBody({
  forecast,
  categoryForecasts,
  colors,
  styles,
}: {
  forecast: Forecast;
  categoryForecasts: CategoryForecast[];
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  if (!forecast.hasEnoughData) {
    return (
      <Text style={styles.emptyText}>
        A forecast appears after a few days of spending this month.
      </Text>
    );
  }
  const hasIncome = forecast.incomeCents > 0;
  const overspending = hasIncome && forecast.projectedOverspendCents > 0;
  return (
    <>
      <MeterRow
        label="Heading for"
        right={formatCents(forecast.projectedCents)}
        rightColor={overspending ? colors.expense : undefined}
        ratio={forecast.spentCents / Math.max(1, forecast.projectedCents)}
        barColor={overspending ? colors.expense : colors.primary}
        styles={styles}
      />
      <Text style={styles.forecastLine}>
        {formatCents(forecast.spentCents)} spent in {forecast.elapsedDays} of{' '}
        {forecast.daysInMonth} days · {formatCents(forecast.dailyPaceCents)} per day
      </Text>
      {hasIncome ? (
        <Text
          style={[
            styles.forecastLine,
            { color: overspending ? colors.expense : colors.income },
          ]}
        >
          {overspending
            ? `At this pace you'll overspend income by ${formatCents(forecast.projectedOverspendCents)}. Keep it under ${formatCents(forecast.safeDailyCents)} per day to stay even.`
            : `On track — you can spend ${formatCents(forecast.safeDailyCents)} per day and still stay within income.`}
        </Text>
      ) : null}
      {forecast.budgetTotalCents > 0 ? (
        <Text style={styles.forecastLine}>
          Combined budgets: {formatCents(forecast.budgetTotalCents)} ·{' '}
          {forecast.projectedCents > forecast.budgetTotalCents
            ? `projected ${formatCents(forecast.projectedCents - forecast.budgetTotalCents)} over`
            : 'projected to stay within'}
        </Text>
      ) : null}
      {categoryForecasts.length > 0 ? (
        <View style={styles.forecastCategories}>
          {categoryForecasts.map((c) => (
            <Text
              key={c.category.id}
              style={[
                styles.forecastLine,
                c.projectedOverCents > 0 ? { color: colors.expense } : null,
              ]}
            >
              {c.category.name}: heading for{' '}
              {formatCents(c.projectedCents)} of {formatCents(c.limitCents)}
              {c.projectedOverCents > 0
                ? ` — ${formatCents(c.projectedOverCents)} over`
                : ' — on track'}
            </Text>
          ))}
        </View>
      ) : null}
    </>
  );
}

export default function StatsScreen() {
  const { state, addToGoal } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [view, setView] = useState<StatsView>('month');
  const [period, setPeriod] = useState(currentPeriodKey('month'));
  const [fundingGoal, setFundingGoal] = useState<Goal | null>(null);
  const [fundAmount, setFundAmount] = useState('');

  const changeView = (v: StatsView) => {
    setView(v);
    setPeriod(currentPeriodKey(v));
  };

  const trend = useMemo(() => {
    const trendMonths =
      view === 'month'
        ? Array.from({ length: TREND_MONTHS }, (_, i) =>
            shiftMonth(period, i - (TREND_MONTHS - 1)),
          )
        : Array.from({ length: 12 }, (_, i) => `${period}-${String(i + 1).padStart(2, '0')}`);
    const buckets = new Map(
      trendMonths.map((m) => [m, { month: m, income: 0, expense: 0 }]),
    );
    for (const t of state.transactions) {
      const bucket = buckets.get(monthKey(t.date));
      if (bucket) bucket[t.type] += t.amountCents;
    }
    return trendMonths.map((m) => buckets.get(m)!);
  }, [state.transactions, view, period]);

  const byCategory = useMemo(
    () => rankedCategorySpending(state.transactions, state.customCategories, view, period),
    [state.transactions, state.customCategories, view, period],
  );

  // Per-person comparison only says anything with more than one person
  const multiPerson = state.people.length > 1;
  const byPerson = useMemo(() => {
    if (!multiPerson) return [];
    const totals = totalsByPerson(state.transactions, view, period);
    return state.people
      .map((person) => ({
        person,
        totals: totals.get(person.id) ?? {
          incomeCents: 0,
          expenseCents: 0,
          netCents: 0,
        },
      }))
      .sort((a, b) => b.totals.expenseCents - a.totals.expenseCents);
  }, [multiPerson, state.people, state.transactions, view, period]);

  const personExpenseMax = Math.max(1, ...byPerson.map((p) => p.totals.expenseCents));

  const trendMax = Math.max(1, ...trend.flatMap((t) => [t.income, t.expense]));
  const periodExpenseTotal = byCategory.reduce((s, e) => s + e.cents, 0);
  const periodLabel = formatPeriod(view, period);
  const barLabel = (m: string) => formatMonth(m).slice(0, view === 'month' ? 3 : 1);
  const barBase = [styles.bar, view === 'year' && styles.barNarrow];

  // Both cards render in month view only, so the memos skip work in year view
  const monthView = view === 'month';
  const insightsPro = usePremium('insights');
  const forecastPro = usePremium('forecast');
  const insights = useMemo(
    () =>
      insightsPro && monthView
        ? computeInsights(state.transactions, state.customCategories, period)
        : [],
    [insightsPro, monthView, state.transactions, state.customCategories, period],
  );
  const forecast = useMemo(
    () =>
      forecastPro && monthView
        ? forecastCurrentMonth(state.transactions, state.budgets)
        : null,
    [forecastPro, monthView, state.transactions, state.budgets],
  );
  const categoryForecasts = useMemo(
    () =>
      forecastPro && monthView
        ? forecastCategories(state.transactions, state.customCategories, state.budgets)
        : [],
    [forecastPro, monthView, state.transactions, state.customCategories, state.budgets],
  );


  const confirmFund = () => {
    if (!fundingGoal) return;
    const cents = parseAmountToCents(fundAmount);
    if (!cents) {
      Alert.alert('Invalid amount', 'Enter an amount like 50');
      return;
    }
    addToGoal(fundingGoal.id, cents);
    setFundingGoal(null);
    setFundAmount('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenTitle title="Stats" subtitle="Where the money goes" />

      <View style={{ marginBottom: spacing.l }}>
        <SegmentedControl
          options={[
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Year' },
          ]}
          value={view}
          onChange={changeView}
        />
      </View>
      <PeriodNav periodType={view} period={period} onChange={setPeriod} />

      {state.transactions.length === 0 && state.goals.length === 0 ? (
        <EmptyState
          message="Charts appear here once you add some incomes and expenses."
        />
      ) : (
        <>
          <Card>
            <Label>
              {`Income vs expenses · ${view === 'month' ? `last ${TREND_MONTHS} months` : period}`}
            </Label>
            <Row style={styles.chartRow}>
              {trend.map((t) => (
                <View key={t.month} style={styles.chartCol}>
                  <View style={styles.barsArea}>
                    <View
                      style={[
                        barBase,
                        {
                          backgroundColor: colors.income,
                          height: Math.max(2, (t.income / trendMax) * scale(110)),
                        },
                      ]}
                    />
                    <View
                      style={[
                        barBase,
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
                      view === 'month' &&
                        t.month === period && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {barLabel(t.month)}
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

          {view === 'month' && period === currentPeriodKey('month') ? (
            <Card>
              <Label>Forecast · rest of {periodLabel}</Label>
              {forecast ? (
                <ForecastBody
                  forecast={forecast}
                  categoryForecasts={categoryForecasts}
                  colors={colors}
                  styles={styles}
                />
              ) : (
                <ProLock what="Spending forecasts" styles={styles} />
              )}
            </Card>
          ) : null}

          {view === 'month' ? (
            <Card>
              <Label>Insights</Label>
              {!insightsPro ? (
                <ProLock what="Smart monthly insights" styles={styles} />
              ) : insights.length === 0 ? (
                <Text style={styles.emptyText}>
                  Insights appear once this month has some expenses.
                </Text>
              ) : (
                insights.map((insight, i) => (
                  <Text key={i} style={styles.insight}>
                    {insight.text}
                  </Text>
                ))
              )}
            </Card>
          ) : null}

          <Card>
            <Label>Spending by category · {periodLabel}</Label>
            {byCategory.length === 0 ? (
              <Text style={styles.emptyText}>No expenses in this {view}.</Text>
            ) : (
              byCategory.map(({ category, cents }) => {
                const share = periodExpenseTotal > 0 ? cents / periodExpenseTotal : 0;
                return (
                  <MeterRow
                    key={category.id}
                    label={category.name}
                    dotColor={category.color}
                    right={`${formatCents(cents)}  ${Math.round(share * 100)}%`}
                    ratio={share}
                    barColor={colors.primary}
                    styles={styles}
                  />
                );
              })
            )}
          </Card>

          {multiPerson ? (
            <Card>
              <Label>By person · {periodLabel}</Label>
              {byPerson.every((p) => p.totals.expenseCents === 0) ? (
                <Text style={styles.emptyText}>No spending by anyone in this {view}.</Text>
              ) : (
                byPerson.map(({ person, totals }) => (
                  <View key={person.id} style={styles.catRow}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Row style={{ flex: 1, marginRight: spacing.s }}>
                        <View style={[styles.dot, { backgroundColor: person.color }]} />
                        <Text style={styles.catName} numberOfLines={1}>
                          {person.name}
                        </Text>
                      </Row>
                      <Text style={styles.catAmount}>
                        {formatCents(totals.expenseCents)}
                      </Text>
                    </Row>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          {
                            backgroundColor: person.color,
                            width: `${Math.max(2, (totals.expenseCents / personExpenseMax) * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.belowMuted}>
                      earned {formatCents(totals.incomeCents)} ·{' '}
                      <Text
                        style={{
                          color: totals.netCents >= 0 ? colors.income : colors.expense,
                        }}
                      >
                        {totals.netCents >= 0 ? 'kept ' : 'short '}
                        {formatCents(Math.abs(totals.netCents))}
                      </Text>
                    </Text>
                  </View>
                ))
              )}
            </Card>
          ) : null}

        </>
      )}

      {fundingGoal ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setFundingGoal(null)}>
          <View style={styles.modalBackdrop}>
            <Card style={styles.modalCard}>
              <Label>Add to “{fundingGoal.name}”</Label>
              <Input
                value={fundAmount}
                onChangeText={setFundAmount}
                placeholder="0,00"
                keyboardType="decimal-pad"
                returnKeyType="done"
                autoFocus
                onSubmitEditing={confirmFund}
              />
              <Row style={{ marginTop: spacing.m }}>
                <PrimaryButton
                  label="Cancel"
                  onPress={() => setFundingGoal(null)}
                  color={colors.textSecondary}
                  style={{ flex: 1, marginRight: spacing.s }}
                />
                <PrimaryButton label="Add" onPress={confirmFund} style={{ flex: 1 }} />
              </Row>
            </Card>
          </View>
        </Modal>
      ) : null}
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
    barNarrow: {
      width: scale(4.5),
      marginHorizontal: scale(1),
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
    insight: {
      fontSize: font.body,
      color: colors.text,
      marginBottom: spacing.s,
      lineHeight: font.body * 1.4,
    },
    forecastLine: {
      fontSize: font.small,
      color: colors.textSecondary,
      marginTop: spacing.s,
      lineHeight: font.small * 1.4,
    },
    dot: {
      width: scale(10),
      height: scale(10),
      borderRadius: scale(5),
      marginRight: spacing.s,
    },
    belowMuted: {
      marginTop: spacing.xs,
      fontSize: font.small,
      color: colors.textSecondary,
    },
    forecastCategories: {
      marginTop: spacing.s,
      paddingTop: spacing.s,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
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
    belowText: {
      marginTop: 2,
      fontSize: font.small,
      color: colors.expense,
      fontWeight: '600',
    },
    goalRow: {
      marginBottom: spacing.l,
    },
    goalDone: {
      marginTop: spacing.xs,
      fontSize: font.small,
      color: colors.income,
      fontWeight: '600',
    },
    fundButton: {
      marginTop: spacing.s,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: radius.m,
      paddingHorizontal: spacing.m,
      paddingVertical: scale(6),
    },
    fundLabel: {
      color: colors.primary,
      fontSize: font.body,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    modalCard: {
      marginBottom: 0,
    },
  });
