import { AppState, Transaction, TrashedTransaction } from '../types';

/**
 * How long a deleted entry stays recoverable. Long enough to catch a mistake
 * noticed at the end of the month, short enough that the trash never becomes
 * a second copy of the ledger.
 */
export const TRASH_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days since an entry was deleted, floored. */
export function daysInTrash(entry: TrashedTransaction, now = Date.now()): number {
  const deleted = Date.parse(entry.deletedAt);
  if (Number.isNaN(deleted)) return 0;
  return Math.max(0, Math.floor((now - deleted) / DAY_MS));
}

/** Days left before an entry is purged, floored at zero. */
export function daysLeft(entry: TrashedTransaction, now = Date.now()): number {
  return Math.max(0, TRASH_RETENTION_DAYS - daysInTrash(entry, now));
}

/**
 * Drop anything past its retention. Returns the same array when nothing
 * expired so callers can skip a state write on the common launch.
 */
export function purgeExpired(
  trash: TrashedTransaction[],
  now = Date.now(),
): TrashedTransaction[] {
  const kept = trash.filter((e) => daysInTrash(e, now) < TRASH_RETENTION_DAYS);
  return kept.length === trash.length ? trash : kept;
}

/**
 * Live entries plus trashed ones. The receipt sweep deletes any photo no
 * entry references, so a trashed entry must be counted or restoring it would
 * hand back an entry whose photo had already been collected.
 */
export function withTrashed(state: Pick<AppState, 'transactions' | 'trash'>): Transaction[] {
  if (state.trash.length === 0) return state.transactions;
  return [...state.transactions, ...state.trash.map((e) => e.transaction)];
}
