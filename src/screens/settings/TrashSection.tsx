import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp, useCategories, usePeopleById } from '../../context/AppContext';
import { spacing } from '../../theme';
import { formatCents, formatDate } from '../../utils/money';
import { daysLeft, TRASH_RETENTION_DAYS } from '../../utils/trash';
import { Card, Label, Row } from '../../components/ui';
import { useSettingsStyles } from './common';

/** How many deleted entries to list before it stops being a review and starts being a ledger. */
const VISIBLE = 25;

/**
 * Deleted entries, newest first. The undo snackbar covers the seconds after
 * a delete; this covers the month after it.
 */
export function TrashSection() {
  const { state, restoreFromTrash, emptyTrash } = useApp();
  const { byId: categoryById } = useCategories();
  const personById = usePeopleById();
  const styles = useSettingsStyles();

  const { trash } = state;

  return (
    <>
      <Label>Trash</Label>
      <Card>
        {trash.length === 0 ? (
          <Text style={styles.mutedBody}>
            Nothing deleted in the last {TRASH_RETENTION_DAYS} days. Entries you
            delete wait here, so a mistake you notice later is still fixable.
          </Text>
        ) : (
          <>
            {trash.slice(0, VISIBLE).map((entry) => {
              const t = entry.transaction;
              const left = daysLeft(entry);
              return (
                <Row key={t.id} style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {t.note ||
                        (t.type === 'income'
                          ? 'Income'
                          : categoryById(t.categoryId).name)}
                    </Text>
                    <Text style={styles.mutedSmall}>
                      {t.type === 'income' ? '+' : '-'}
                      {formatCents(t.amountCents)} ·{' '}
                      {personById.get(t.personId)?.name ?? '?'} ·{' '}
                      {formatDate(t.date)} ·{' '}
                      {left === 0 ? 'deleted for good today' : `${left} days left`}
                    </Text>
                  </View>
                  <Pressable onPress={() => restoreFromTrash(t.id)} hitSlop={8}>
                    <Text style={styles.link}>Restore</Text>
                  </Pressable>
                </Row>
              );
            })}
            {trash.length > VISIBLE ? (
              <Text style={styles.mutedSmall}>
                and {trash.length - VISIBLE} more
              </Text>
            ) : null}
            <Pressable
              onPress={emptyTrash}
              hitSlop={8}
              style={{ marginTop: spacing.m }}
            >
              <Text style={styles.danger}>Empty trash</Text>
            </Pressable>
          </>
        )}
        <Text style={[styles.mutedSmall, { marginTop: spacing.s }]}>
          Deleted entries are kept for {TRASH_RETENTION_DAYS} days and do not
          count towards any total, budget or settlement while they wait here.
          Emptying the trash can itself be undone.
        </Text>
      </Card>
    </>
  );
}
