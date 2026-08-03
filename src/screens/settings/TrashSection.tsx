import React from 'react';
import { Pressable } from 'react-native';
import { Text } from '../../components/Text';
import { useApp, useCategories, usePeopleById } from '../../context/AppContext';
import { spacing } from '../../theme';
import { formatCents, formatDate } from '../../utils/money';
import { daysLeft, describeTrashed, TRASH_RETENTION_DAYS } from '../../utils/trash';
import { Card, Label } from '../../components/ui';
import { SettingRow, useSettingsStyles } from './common';

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
            Nothing deleted in the last {TRASH_RETENTION_DAYS} days. Deleted
            entries, goals, templates and recurring rules wait here, so a
            mistake you notice later is still fixable.
          </Text>
        ) : (
          <>
            {trash.slice(0, VISIBLE).map((item) => {
              const { id, kind, title } = describeTrashed(item);
              const left = daysLeft(item);
              const detail =
                item.kind === 'transaction'
                  ? `${item.transaction.type === 'income' ? '+' : '-'}${formatCents(
                      item.transaction.amountCents,
                    )} · ${personById.get(item.transaction.personId)?.name ?? '?'} · ${formatDate(
                      item.transaction.date,
                    )}`
                  : kind;
              return (
                <SettingRow
                  key={id}
                  title={
                    title ||
                    (item.kind === 'transaction'
                      ? item.transaction.type === 'income'
                        ? 'Income'
                        : categoryById(item.transaction.categoryId).name
                      : kind)
                  }
                  sub={`${detail} · ${
                    left === 0 ? 'deleted for good today' : `${left} days left`
                  }`}
                  onEdit={() => restoreFromTrash(id)}
                  editLabel="Restore"
                />
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
          Kept for {TRASH_RETENTION_DAYS} days, counting towards no total,
          budget or settlement while they wait. People, accounts and categories
          are not listed: deleting those also removes the entries filed under
          them, so handing one back alone would restore less than you lost.
          Emptying the trash can itself be undone.
        </Text>
      </Card>
    </>
  );
}
