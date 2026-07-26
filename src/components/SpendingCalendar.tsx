import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../theme';
import { formatCents } from '../utils/money';
import { CalendarDay, monthCalendar, WEEKDAY_INITIALS } from '../utils/calendar';
import { Transaction } from '../types';
import { useThemedStyles } from './ui';

/**
 * A month of spending as a calendar grid, each day shaded by how much went
 * out. Tapping a day selects it; tapping it again clears the selection.
 */
export function SpendingCalendar({
  transactions,
  month,
  selectedDate,
  onSelectDate,
}: {
  transactions: Transaction[];
  month: string;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { days, leadingBlanks, maxCents } = useMemo(
    () => monthCalendar(transactions, month),
    [transactions, month],
  );

  const cell = (day: CalendarDay) => {
    const selected = day.date === selectedDate;
    // Floor the shading so any spending is visible, not just heavy days
    const intensity = maxCents > 0 ? day.expenseCents / maxCents : 0;
    return (
      <Pressable
        key={day.date}
        style={styles.cell}
        disabled={day.isFuture}
        onPress={() => onSelectDate(selected ? null : day.date)}
      >
        <View
          style={[
            styles.cellInner,
            day.expenseCents > 0 && {
              backgroundColor: colors.expense,
              opacity: 0.25 + intensity * 0.75,
            },
            selected && { borderColor: colors.primary, borderWidth: 2 },
            day.isToday && !selected && { borderColor: colors.text, borderWidth: 1 },
          ]}
        />
        <Text
          style={[
            styles.cellLabel,
            day.expenseCents > 0 && styles.cellLabelSpent,
            day.isFuture && styles.cellLabelFuture,
          ]}
        >
          {day.dayOfMonth}
        </Text>
      </Pressable>
    );
  };

  const selectedTotal = days.find((d) => d.date === selectedDate)?.expenseCents ?? 0;

  return (
    <View>
      <View style={styles.grid}>
        {WEEKDAY_INITIALS.map((initial, i) => (
          <View key={i} style={styles.cell}>
            <Text style={styles.weekday}>{initial}</Text>
          </View>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <View key={`blank-${i}`} style={styles.cell} />
        ))}
        {days.map(cell)}
      </View>
      <Text style={styles.footnote}>
        {selectedDate
          ? `${formatCents(selectedTotal)} spent — tap again to clear`
          : maxCents > 0
            ? `Busiest day: ${formatCents(maxCents)} · tap a day to see its entries`
            : 'No expenses this month yet.'}
      </Text>
    </View>
  );
}

/** Seven columns; a literal so it satisfies the percentage dimension type */
const CELL = '14.2857%';

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      width: CELL,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: scale(2),
    },
    // The shaded square sits behind the number so opacity never fades the text
    cellInner: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      margin: scale(3),
      borderRadius: radius.s,
      backgroundColor: colors.background,
      borderColor: 'transparent',
    },
    cellLabel: {
      fontSize: font.small,
      color: colors.textSecondary,
    },
    cellLabelSpent: {
      color: colors.text,
      fontWeight: '700',
    },
    cellLabelFuture: {
      opacity: 0.35,
    },
    weekday: {
      fontSize: font.small,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    footnote: {
      marginTop: spacing.m,
      fontSize: font.small,
      color: colors.textSecondary,
    },
  });
