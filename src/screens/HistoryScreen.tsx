import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { font, radius, spacing, scale, ThemeColors } from '../theme';
import { formatCents, formatPeriod } from '../utils/money';
import {
  Card,
  EmptyState,
  Row,
  screenChrome,
  ScreenTitle,
  SegmentedControl,
  useThemedStyles,
} from '../components/ui';
import { PeriodType, SettlementRecord, SplitMethod } from '../types';

const METHOD_LABEL: Record<SplitMethod, string> = {
  'fifty-fifty': '50/50',
  'equal-payments': 'Equal payments',
  percentage: 'Percentage',
};

export default function HistoryScreen() {
  const { state, removeSettlement } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [view, setView] = useState<PeriodType>('month');

  const sections = useMemo(() => {
    const records = state.settlements.filter((r) => r.periodType === view);
    const byPeriod = new Map<string, SettlementRecord[]>();
    for (const record of records) {
      const list = byPeriod.get(record.period) ?? [];
      list.push(record);
      byPeriod.set(record.period, list);
    }
    return [...byPeriod.entries()]
      .sort((a, b) => b[0].localeCompare(a[0])) // latest period first
      .map(([period, list]) => ({
        title: formatPeriod(view, period),
        data: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      }));
  }, [state.settlements, view]);

  const confirmDelete = (record: SettlementRecord) => {
    Alert.alert('Delete calculation', 'Remove this calculation from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeSettlement(record.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            <ScreenTitle
              title="History"
              subtitle="Saved split calculations, latest first"
            />
            <View style={{ marginBottom: spacing.l }}>
              <SegmentedControl
                options={[
                  { value: 'month', label: 'Monthly' },
                  { value: 'week', label: 'Weekly' },
                ]}
                value={view}
                onChange={setView}
              />
            </View>
          </>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => confirmDelete(item)}>
            <Card>
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing.s }}>
                <View style={styles.methodBadge}>
                  <Text style={styles.methodBadgeText}>{METHOD_LABEL[item.method]}</Text>
                </View>
                <Text style={styles.total}>{formatCents(item.totalSharedCents)}</Text>
              </Row>
              {item.results.map((r) => (
                <Row key={r.personId} style={styles.resultRow}>
                  <Text style={styles.resultName}>{r.personName}</Text>
                  <Text style={styles.resultDetail}>
                    paid {formatCents(r.paidCents)} · share {formatCents(r.shareCents)}
                  </Text>
                </Row>
              ))}
              {item.transfers.map((t, i) => (
                <Text key={i} style={styles.transfer}>
                  → {t.fromName} pays {t.toName} {formatCents(t.amountCents)}
                </Text>
              ))}
              <Text style={styles.savedAt}>
                Saved {item.createdAt.slice(0, 10)}
              </Text>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📒"
            message={
              view === 'month'
                ? 'No saved monthly calculations yet. Settle a month in the Split tab and save it to see it here.'
                : 'No saved weekly calculations yet. Switch the Split tab to “Week”, settle up, and save it to see it here.'
            }
          />
        }
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    ...screenChrome(colors),
    sectionHeader: {
      fontSize: font.medium,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.m,
      marginTop: spacing.s,
    },
    methodBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.m,
      paddingVertical: scale(4),
    },
    methodBadgeText: {
      color: colors.primary,
      fontSize: font.small,
      fontWeight: '700',
    },
    total: { fontSize: font.medium, fontWeight: '800', color: colors.text },
    resultRow: { justifyContent: 'space-between', marginTop: spacing.xs },
    resultName: { fontSize: font.body, fontWeight: '600', color: colors.text },
    resultDetail: { fontSize: font.small, color: colors.textSecondary },
    transfer: { fontSize: font.body, color: colors.primary, marginTop: spacing.s, fontWeight: '600' },
    savedAt: { fontSize: font.small, color: colors.textSecondary, marginTop: spacing.m },
  });
