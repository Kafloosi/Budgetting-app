import React, { useMemo } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, font, radius, spacing, scale } from '../theme';
import { formatCents, formatMonth } from '../utils/money';
import { Card, EmptyState, Row, ScreenTitle } from '../components/ui';
import { SettlementRecord, SplitMethod } from '../types';

const METHOD_LABEL: Record<SplitMethod, string> = {
  'fifty-fifty': '50/50',
  'equal-payments': 'Equal payments',
  percentage: 'Percentage',
};

export default function HistoryScreen() {
  const { state, removeSettlement } = useApp();

  const sections = useMemo(() => {
    const byMonth = new Map<string, SettlementRecord[]>();
    for (const record of state.settlements) {
      const list = byMonth.get(record.month) ?? [];
      list.push(record);
      byMonth.set(record.month, list);
    }
    return [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0])) // latest month first
      .map(([month, records]) => ({
        title: formatMonth(month),
        data: records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      }));
  }, [state.settlements]);

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
          <ScreenTitle
            title="History"
            subtitle="Saved split calculations, latest month first"
          />
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
            message="No saved calculations yet. Settle a month in the Split tab and save it to see it here."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.l, paddingBottom: scale(100) },
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
