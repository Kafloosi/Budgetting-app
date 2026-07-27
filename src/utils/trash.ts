import { AppState, Transaction, TrashedItem } from '../types';

/**
 * How long a deleted entry stays recoverable. Long enough to catch a mistake
 * noticed at the end of the month, short enough that the trash never becomes
 * a second copy of the ledger.
 */
export const TRASH_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days since a record was deleted, floored.
 *
 * An unreadable timestamp counts as fully expired rather than brand new.
 * Returning 0 meant such a record never aged, sat in the trash forever
 * showing "30 days left", and kept its receipt photo alive against every
 * sweep — a leak that could only grow.
 */
export function daysInTrash(entry: TrashedItem, now = Date.now()): number {
  const deleted = Date.parse(entry.deletedAt);
  if (Number.isNaN(deleted)) return TRASH_RETENTION_DAYS;
  return Math.max(0, Math.floor((now - deleted) / DAY_MS));
}

/** Days left before an entry is purged, floored at zero. */
export function daysLeft(entry: TrashedItem, now = Date.now()): number {
  return Math.max(0, TRASH_RETENTION_DAYS - daysInTrash(entry, now));
}

/**
 * Drop anything past its retention. Returns the same array when nothing
 * expired so callers can skip a state write on the common launch.
 */
export function purgeExpired(
  trash: TrashedItem[],
  now = Date.now(),
): TrashedItem[] {
  const kept = trash.filter((e) => daysInTrash(e, now) < TRASH_RETENTION_DAYS);
  return kept.length === trash.length ? trash : kept;
}

/**
 * Live entries plus trashed ones. The receipt sweep deletes any photo no
 * entry references, so a trashed entry must be counted or restoring it would
 * hand back an entry whose photo had already been collected.
 */
export function withTrashed(state: Pick<AppState, 'transactions' | 'trash'>): Transaction[] {
  const trashed = state.trash.filter(
    (e): e is Extract<TrashedItem, { kind: 'transaction' }> => e.kind === 'transaction',
  );
  if (trashed.length === 0) return state.transactions;
  return [...state.transactions, ...trashed.map((e) => e.transaction)];
}

/**
 * How a trashed record presents in the list: the id it restores by, what kind
 * of thing it was, and its own name. Keeps the Trash screen from switching on
 * `kind` itself.
 */
export function describeTrashed(item: TrashedItem): {
  id: string;
  kind: string;
  title: string;
} {
  switch (item.kind) {
    case 'transaction':
      return {
        id: item.transaction.id,
        kind: 'entry',
        title: item.transaction.note,
      };
    case 'goal':
      return { id: item.goal.id, kind: 'goal', title: item.goal.name };
    case 'template':
      return { id: item.template.id, kind: 'template', title: item.template.name };
    case 'recurring':
      return {
        id: item.rule.id,
        kind: 'recurring entry',
        title: item.rule.note,
      };
  }
}
